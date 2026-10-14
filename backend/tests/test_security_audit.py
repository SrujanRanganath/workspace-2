"""
Security regression tests for Milestone 3.

Covers path containment, cross-user tool isolation, upload limits,
repair-report integrity, authentication failures, and CORS.
"""

import io
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest

from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient
from jose import jwt
from starlette.middleware.cors import CORSMiddleware

from main import app
from database import Base, engine, SessionLocal
from models.project import Project
from models.artifact import Artifact, ArtifactStatus
from models.validation import Defect
from models.user import User
from config import SECRET_KEY, ALGORITHM, CORS_ORIGINS
from utils.file_security import safe_path
from utils.resource_ownership import (
    _STORE_DIR,
    _owner_file,
    check_resource_access,
    check_and_claim_resource,
    clear_ownership_for_testing,
)
from tools.data_cleaner.service import clean_data, MAX_UPLOAD_SIZE


class TestSecurityAuditSuite:
    @classmethod
    def setup_class(cls):
        assert "_isolated_test.db" in os.environ.get("DATABASE_URL", "")
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        cls.suffix_a = uuid.uuid4().hex[:6]
        cls.email_a = f"alice.{cls.suffix_a}@securitytest.com"
        cls.password_a = "AliceSecurePass123!"
        cls.name_a = f"Alice {cls.suffix_a}"
        reg_a = cls.client.post(
            "/auth/register",
            json={"email": cls.email_a, "password": cls.password_a, "name": cls.name_a},
        )
        assert reg_a.status_code in [200, 201], reg_a.text
        login_a = cls.client.post("/auth/login", json={"email": cls.email_a, "password": cls.password_a})
        assert login_a.status_code == 200, login_a.text
        cls.token_a = login_a.json()["access_token"]
        cls.headers_a = {"Authorization": f"Bearer {cls.token_a}"}

        cls.suffix_b = uuid.uuid4().hex[:6]
        cls.email_b = f"bob.{cls.suffix_b}@securitytest.com"
        cls.password_b = "BobSecurePass123!"
        cls.name_b = f"Bob {cls.suffix_b}"
        reg_b = cls.client.post(
            "/auth/register",
            json={"email": cls.email_b, "password": cls.password_b, "name": cls.name_b},
        )
        assert reg_b.status_code in [200, 201], reg_b.text
        login_b = cls.client.post("/auth/login", json={"email": cls.email_b, "password": cls.password_b})
        assert login_b.status_code == 200, login_b.text
        cls.token_b = login_b.json()["access_token"]
        cls.headers_b = {"Authorization": f"Bearer {cls.token_b}"}

    def setup_method(self):
        clear_ownership_for_testing()

    def test_safe_path_rejects_prefix_collision_and_traversal(self):
        with TemporaryDirectory() as tmp_dir:
            base = Path(tmp_dir) / "safe_dir"
            base.mkdir()
            fake_prefix_dir = Path(tmp_dir) / "safe_dir_fake"
            fake_prefix_dir.mkdir()
            (fake_prefix_dir / "secret.txt").write_text("classified", encoding="utf-8")

            for bad_name in (
                "../safe_dir_fake/secret.txt",
                "..\\safe_dir_fake\\secret.txt",
                "/etc/passwd",
                "C:\\secret.txt",
            ):
                with pytest_raises_http(400):
                    safe_path(str(base), bad_name)

            legit = base / "good.txt"
            legit.write_text("ok", encoding="utf-8")
            res = safe_path(str(base), "good.txt")
            assert res == legit.resolve()

    def test_safe_path_rejects_symlink_escaping_base(self):
        with TemporaryDirectory() as tmp_dir:
            base = Path(tmp_dir) / "safe_dir"
            outside = Path(tmp_dir) / "outside_dir"
            base.mkdir()
            outside.mkdir()
            target_secret = outside / "leak.txt"
            target_secret.write_text("leak", encoding="utf-8")

            link_file = base / "symlink.txt"
            try:
                link_file.symlink_to(target_secret)
            except (OSError, NotImplementedError):
                pytest.skip("Symlink creation is unavailable in this Windows environment")

            try:
                safe_path(str(base), "symlink.txt")
            except HTTPException as exc:
                assert exc.status_code == 400
            else:
                raise AssertionError("Expected symlink escape to be rejected")

    def test_cross_user_code_tool_isolation(self):
        proj_name = f"alice-code-{self.suffix_a}"
        files = {"main.py": "print('alice confidential')", "README.md": "# Alice"}

        resp_a = self.client.post(
            "/code/save-project",
            json={"project_name": proj_name, "files": files},
            headers=self.headers_a,
        )
        assert resp_a.status_code == 200, resp_a.text

        dl_a = self.client.get(f"/code/download-zip/{proj_name}", headers=self.headers_a)
        assert dl_a.status_code == 200

        dl_b = self.client.get(f"/code/download-zip/{proj_name}", headers=self.headers_b)
        assert dl_b.status_code == 403
        assert "Access denied" in dl_b.json().get("detail", "")

        bad_overwrite = self.client.post(
            "/code/save-project",
            json={"project_name": proj_name, "files": {"evil.py": "# evil"}},
            headers=self.headers_b,
        )
        assert bad_overwrite.status_code == 403

    def test_cross_user_code_file_isolation(self):
        filename = f"alice_secret_{self.suffix_a}.py"

        save_a = self.client.post(
            "/code/save",
            json={"filename": filename, "code": "def alice(): return 42"},
            headers=self.headers_a,
        )
        assert save_a.status_code == 200, save_a.text

        dl_a = self.client.get(f"/code/download/{filename}", headers=self.headers_a)
        assert dl_a.status_code == 200

        dl_b = self.client.get(f"/code/download/{filename}", headers=self.headers_b)
        assert dl_b.status_code == 403

        run_b = self.client.post("/code/run", json={"filename": filename}, headers=self.headers_b)
        assert run_b.status_code == 403

    def test_cross_user_website_builder_isolation(self):
        site_name = f"alice-site-{self.suffix_a}"

        save_a = self.client.post(
            "/website/save",
            json={
                "project_name": site_name,
                "framework": "HTML/CSS/JS",
                "app": "<h1>Alice Private Portal</h1>",
                "css": "body { color: red; }",
                "js": "console.log('secret');",
            },
            headers=self.headers_a,
        )
        assert save_a.status_code == 200, save_a.text

        dl_a = self.client.get(f"/website/download/{site_name}", headers=self.headers_a)
        assert dl_a.status_code == 200
        html_a = self.client.get(f"/website/download-html/{site_name}", headers=self.headers_a)
        assert html_a.status_code == 200

        dl_b = self.client.get(f"/website/download/{site_name}", headers=self.headers_b)
        assert dl_b.status_code == 403

        html_b = self.client.get(f"/website/download-html/{site_name}", headers=self.headers_b)
        assert html_b.status_code == 403

    def test_cross_user_data_cleaner_isolation(self):
        csv_bytes = b"id,name,salary\n1,Alice,100000\n2,Bob,90000\n"
        upload_resp = self.client.post(
            "/data-cleaner/clean",
            files={"file": (f"payroll_{self.suffix_a}.csv", io.BytesIO(csv_bytes), "text/csv")},
            headers=self.headers_a,
        )
        assert upload_resp.status_code == 200, upload_resp.text
        cleaned_filename = upload_resp.json()["filename"]

        dl_a = self.client.get(f"/data-cleaner/download/{cleaned_filename}", headers=self.headers_a)
        assert dl_a.status_code == 200

        dl_b = self.client.get(f"/data-cleaner/download/{cleaned_filename}", headers=self.headers_b)
        assert dl_b.status_code == 403

    def test_cross_user_document_generator_isolation(self):
        gen_resp = self.client.post(
            "/document-generator/generate",
            json={
                "document_type": "docx",
                "template": "resume",
                "title": f"AliceConfidentialResume_{self.suffix_a}",
                "name": "Alice Developer",
                "company": "Tech Corp",
                "content": "Secret engineering experience",
            },
            headers=self.headers_a,
        )
        assert gen_resp.status_code == 200, gen_resp.text
        doc_filename = gen_resp.json()["filename"]

        dl_a = self.client.get(f"/document-generator/download/{doc_filename}", headers=self.headers_a)
        assert dl_a.status_code == 200

        dl_b = self.client.get(f"/document-generator/download/{doc_filename}", headers=self.headers_b)
        assert dl_b.status_code == 403

    def test_cross_user_project_and_defect_isolation(self):
        proj_resp = self.client.post(
            "/api/v1/projects",
            json={"name": f"Alice Project {self.suffix_a}", "description": "Confidential"},
            headers=self.headers_a,
        )
        assert proj_resp.status_code == 201, proj_resp.text
        proj_id_a = proj_resp.json()["id"]

        get_b = self.client.get(f"/api/v1/projects/{proj_id_a}", headers=self.headers_b)
        assert get_b.status_code == 404

        put_b = self.client.patch(
            f"/api/v1/projects/{proj_id_a}",
            json={"name": "Hacked"},
            headers=self.headers_b,
        )
        assert put_b.status_code == 404

        del_b = self.client.delete(f"/api/v1/projects/{proj_id_a}", headers=self.headers_b)
        assert del_b.status_code == 404

        req_b = self.client.post(
            f"/api/v1/projects/{proj_id_a}/requirements",
            json={"raw_text": "evil"},
            headers=self.headers_b,
        )
        assert req_b.status_code == 404

        art_b = self.client.get(f"/api/v1/projects/{proj_id_a}/artifacts", headers=self.headers_b)
        assert art_b.status_code == 404

    def test_upload_size_limit_rejection(self):
        oversized = b"a" * (MAX_UPLOAD_SIZE + 1024)
        upload = UploadFile(filename="huge.csv", file=io.BytesIO(oversized))
        try:
            clean_data(upload)
        except ValueError as exc:
            assert "exceeds maximum permitted limit" in str(exc)
        else:
            raise AssertionError("Oversized upload must be rejected")

    def test_upload_invalid_file_type_rejection(self):
        upload = UploadFile(filename="malicious.exe", file=io.BytesIO(b"MZ\x90\x00"))
        try:
            clean_data(upload)
        except ValueError as exc:
            assert "Only CSV and Excel" in str(exc)
        else:
            raise AssertionError("Executable upload must be rejected")

    def test_upload_empty_file_rejection(self):
        upload = UploadFile(filename="empty.csv", file=io.BytesIO(b""))
        try:
            clean_data(upload)
        except ValueError as exc:
            assert "empty" in str(exc).lower()
        else:
            raise AssertionError("Empty upload must be rejected")

    def test_expired_token_rejected(self):
        expired_payload = {
            "sub": self.email_a,
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        }
        expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm=ALGORITHM)
        resp = self.client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert resp.status_code == 401
        assert resp.json().get("detail") == "Invalid token."

    def test_tampered_token_rejected(self):
        tampered_token = self.token_a + "tampered"
        resp = self.client.get("/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
        assert resp.status_code == 401

    def test_weak_password_registration_rejected(self):
        resp = self.client.post(
            "/auth/register",
            json={
                "email": f"weak_{uuid.uuid4().hex[:4]}@test.invalid",
                "password": "short",
                "name": "Weak User",
            },
        )
        assert resp.status_code == 422

    def test_login_timing_safe_error_message(self):
        bad_user = self.client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "anypassword"},
        )
        assert bad_user.status_code == 401
        assert bad_user.json().get("detail") == "Invalid email or password."

        bad_pass = self.client.post(
            "/auth/login",
            json={"email": self.email_a, "password": "wrongpassword123!"},
        )
        assert bad_pass.status_code == 401
        assert bad_pass.json().get("detail") == "Invalid email or password."

    def test_cors_does_not_allow_wildcard_with_credentials(self):
        cors = None
        for mw in app.user_middleware:
            if mw.cls is CORSMiddleware:
                cors = mw
                break
        assert cors is not None
        origins = cors.kwargs.get("allow_origins") or CORS_ORIGINS
        assert "*" not in origins
        assert cors.kwargs.get("allow_credentials") is True

    def test_unclaimed_download_is_denied(self):
        user_a = type("U", (), {"id": 101, "email": "a@test.invalid"})()
        user_b = type("U", (), {"id": 202, "email": "b@test.invalid"})()
        unclaimed = f"never-registered-{uuid.uuid4().hex[:8]}.py"
        claimed = f"claimed-only-{uuid.uuid4().hex[:8]}.py"
        try:
            check_resource_access("code_file", unclaimed, user_a, "download")
            raise AssertionError("Unclaimed resources must not be readable")
        except HTTPException as exc:
            assert exc.status_code == 403

        check_and_claim_resource("code_file", claimed, user_a)
        try:
            check_resource_access("code_file", claimed, user_b, "download")
            raise AssertionError("Cross-user access must be denied")
        except HTTPException as exc:
            assert exc.status_code == 403

    def test_ownership_store_is_application_owned(self):
        backend_root = Path(__file__).resolve().parents[1]
        assert _STORE_DIR.resolve() == (backend_root / "resource_owners").resolve()

    def test_concurrent_claims_do_not_transfer_ownership(self):
        resource_id = f"race-{uuid.uuid4().hex}.py"
        user_a = type("U", (), {"id": 301, "email": "race-a@test.invalid"})()
        user_b = type("U", (), {"id": 302, "email": "race-b@test.invalid"})()
        results = []
        barrier = threading.Barrier(2)

        def claim(user):
            barrier.wait()
            try:
                check_and_claim_resource("code_file", resource_id, user)
                results.append(("ok", user.id))
            except HTTPException as exc:
                results.append(("err", exc.status_code, user.id))

        threads = [
            threading.Thread(target=claim, args=(user_a,)),
            threading.Thread(target=claim, args=(user_b,)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        successes = [item for item in results if item[0] == "ok"]
        failures = [item for item in results if item[0] == "err"]
        assert len(successes) == 1
        assert len(failures) == 1
        assert failures[0][1] == 403

        winner = user_a if successes[0][1] == user_a.id else user_b
        loser = user_b if winner is user_a else user_a
        check_resource_access("code_file", resource_id, winner, "download")
        with pytest_raises_http(403):
            check_resource_access("code_file", resource_id, loser, "download")
        with pytest_raises_http(403):
            check_and_claim_resource("code_file", resource_id, loser)

    def test_ownership_persistence_failure_fails_closed(self):
        user_a = type("U", (), {"id": 401, "email": "persist-a@test.invalid"})()
        resource_id = f"persist-fail-{uuid.uuid4().hex}.py"
        with patch("utils.resource_ownership._write_new_owner_file", side_effect=OSError("disk full")):
            try:
                check_and_claim_resource("code_file", resource_id, user_a)
                raise AssertionError("Persistence failure must fail closed")
            except HTTPException as exc:
                assert exc.status_code == 500
                assert "persist" in exc.detail.lower()

        with pytest_raises_http(403):
            check_resource_access("code_file", resource_id, user_a, "download")
        try:
            owner_path = _owner_file("code_file", resource_id)
            assert not owner_path.is_file()
        except HTTPException:
            pass

    def test_case_variant_filename_cannot_steal_ownership(self):
        user_a = type("U", (), {"id": 601, "email": "case-a@test.invalid"})()
        user_b = type("U", (), {"id": 602, "email": "case-b@test.invalid"})()
        resource_id = f"Report-{uuid.uuid4().hex[:8]}.py"
        check_and_claim_resource("code_file", resource_id, user_a)
        with pytest_raises_http(403):
            check_and_claim_resource("code_file", resource_id.swapcase(), user_b)
        check_resource_access("code_file", resource_id.swapcase(), user_a, "download")

    def test_corrupt_ownership_record_denies_access_and_reclaim(self):
        user_a = type("U", (), {"id": 701, "email": "corrupt-a@test.invalid"})()
        resource_id = f"corrupt-{uuid.uuid4().hex[:8]}.py"
        check_and_claim_resource("code_file", resource_id, user_a)
        owner_path = _owner_file("code_file", resource_id)
        owner_path.write_text("\n", encoding="utf-8")
        clear_ownership_for_testing()
        with pytest_raises_http(403):
            check_resource_access("code_file", resource_id, user_a, "download")
        with pytest_raises_http(403):
            check_and_claim_resource("code_file", resource_id, user_a)

    def test_missing_ownership_record_is_denied(self):
        user_a = type("U", (), {"id": 501, "email": "missing-a@test.invalid"})()
        resource_id = f"missing-record-{uuid.uuid4().hex}.py"
        check_and_claim_resource("code_file", resource_id, user_a)
        owner_path = _owner_file("code_file", resource_id)
        assert owner_path.is_file()
        owner_path.unlink()
        clear_ownership_for_testing()
        with pytest_raises_http(403):
            check_resource_access("code_file", resource_id, user_a, "download")

    def test_document_generate_rejects_cross_user_overwrite(self):
        title = f"SharedResumeTitle_{self.suffix_a}"
        payload = {
            "document_type": "docx",
            "template": "resume",
            "title": title,
            "name": "Alice Developer",
            "company": "Tech Corp",
            "content": "Alice confidential",
        }
        gen_a = self.client.post("/document-generator/generate", json=payload, headers=self.headers_a)
        assert gen_a.status_code == 200, gen_a.text

        payload_b = dict(payload)
        payload_b["content"] = "Bob overwrite attempt"
        gen_b = self.client.post("/document-generator/generate", json=payload_b, headers=self.headers_b)
        assert gen_b.status_code == 403

    def test_data_cleaner_rejects_cross_user_overwrite(self):
        shared_name = f"shared_payroll_{self.suffix_a}.csv"
        csv_a = b"id,name\n1,Alice\n"
        csv_b = b"id,name\n1,Bob\n"
        upload_a = self.client.post(
            "/data-cleaner/clean",
            files={"file": (shared_name, io.BytesIO(csv_a), "text/csv")},
            headers=self.headers_a,
        )
        assert upload_a.status_code == 200, upload_a.text

        upload_b = self.client.post(
            "/data-cleaner/clean",
            files={"file": (shared_name, io.BytesIO(csv_b), "text/csv")},
            headers=self.headers_b,
        )
        assert upload_b.status_code == 403

    def test_missing_zip_download_does_not_create_or_claim(self):
        missing_name = f"missing-zip-{uuid.uuid4().hex[:8]}"
        zip_path = Path("generated_projects") / f"{missing_name}.zip"
        folder_path = Path("generated_projects") / missing_name
        resp = self.client.get(f"/code/download-zip/{missing_name}", headers=self.headers_a)
        assert resp.status_code in (403, 404)
        assert not zip_path.exists()
        assert not folder_path.exists()
        save_b = self.client.post(
            "/code/save-project",
            json={"project_name": missing_name, "files": {"main.py": "print(1)"}},
            headers=self.headers_b,
        )
        assert save_b.status_code == 200, save_b.text

    def test_download_does_not_claim_unowned_folder(self):
        folder_name = f"unclaimed-zip-{uuid.uuid4().hex[:8]}"
        folder_path = Path("generated_projects") / folder_name
        folder_path.mkdir(parents=True, exist_ok=True)
        (folder_path / "main.py").write_text("print('leftover')", encoding="utf-8")
        zip_path = Path("generated_projects") / f"{folder_name}.zip"

        resp = self.client.get(f"/code/download-zip/{folder_name}", headers=self.headers_a)
        assert resp.status_code == 403
        assert not zip_path.exists()

        save_b = self.client.post(
            "/code/save-project",
            json={"project_name": folder_name, "files": {"main.py": "print('bob')"}},
            headers=self.headers_b,
        )
        assert save_b.status_code == 200, save_b.text

    def test_other_user_zip_download_does_not_mutate_resource(self):
        proj_name = f"alice-zip-mutate-{self.suffix_a}"
        files = {"main.py": "print('alice')", "README.md": "# Alice"}
        save_a = self.client.post(
            "/code/save-project",
            json={"project_name": proj_name, "files": files},
            headers=self.headers_a,
        )
        assert save_a.status_code == 200, save_a.text
        zip_path = Path("generated_projects") / f"{proj_name}.zip"
        folder_path = Path("generated_projects") / proj_name
        zip_mtime = zip_path.stat().st_mtime
        main_text = (folder_path / "main.py").read_text(encoding="utf-8")

        denied = self.client.get(f"/code/download-zip/{proj_name}", headers=self.headers_b)
        assert denied.status_code == 403
        assert zip_path.stat().st_mtime == zip_mtime
        assert (folder_path / "main.py").read_text(encoding="utf-8") == main_text
        owner_path = _owner_file("code_project", proj_name)
        assert owner_path.is_file()
        assert owner_path.read_text(encoding="utf-8").strip() != ""

    def test_website_invalid_token_and_traversal_rejected(self):
        site_name = f"token-site-{self.suffix_a}"
        save_resp = self.client.post(
            "/website/save",
            json={
                "project_name": site_name,
                "framework": "HTML/CSS/JS",
                "app": "<h1>Token Site</h1>",
                "css": "body{}",
                "js": "",
            },
            headers=self.headers_a,
        )
        assert save_resp.status_code == 200, save_resp.text

        invalid = self.client.get("/website/download-file/invalid-token-123/test.zip")
        assert invalid.status_code == 404

        traversal_token = self.client.get("/website/download-file/../secret/test.zip")
        assert traversal_token.status_code in (400, 404)

        link = self.client.post(
            f"/website/generate-download-link/{site_name}",
            headers=self.headers_a,
        )
        assert link.status_code == 200, link.text
        token = link.json()["token"]

        traversal_file = self.client.get(f"/website/download-file/{token}/../secret.zip")
        assert traversal_file.status_code in (400, 404)

        legit = self.client.get(f"/website/download-file/{token}/{site_name}.zip")
        assert legit.status_code == 200, legit.text

        reused = self.client.get(f"/website/download-file/{token}/{site_name}.zip")
        assert reused.status_code == 404

        bob_link = self.client.post(
            f"/website/generate-download-link/{site_name}",
            headers=self.headers_b,
        )
        assert bob_link.status_code == 403

    def test_publish_requires_owner_and_public_read_is_intentional(self):
        site_id = f"pub-owner-{self.suffix_a}"
        payload = {
            "project_name": "Owner Site",
            "site_id": site_id,
            "files": {
                "index.html": "<!DOCTYPE html><html><body><h1>Alice Public Site</h1></body></html>",
                "styles.css": "body{}",
                "script.js": "",
            },
        }
        pub_a = self.client.post("/website/publish", json=payload, headers=self.headers_a)
        assert pub_a.status_code == 200, pub_a.text

        pub_b = self.client.post("/website/publish", json=payload, headers=self.headers_b)
        assert pub_b.status_code == 403

        public_view = self.client.get(f"/published/{site_id}/")
        assert public_view.status_code == 200
        assert "Alice Public Site" in public_view.text

        leftover_id = f"leftover-pub-{uuid.uuid4().hex[:8]}"
        leftover_dir = Path("published_websites") / leftover_id
        leftover_dir.mkdir(parents=True, exist_ok=True)
        (leftover_dir / "index.html").write_text("<h1>orphan</h1>", encoding="utf-8")
        leftover_pub = self.client.post(
            "/website/publish",
            json={
                "project_name": "Takeover",
                "site_id": leftover_id,
                "files": {
                    "index.html": "<!DOCTYPE html><html><body><h1>hijack</h1></body></html>",
                },
            },
            headers=self.headers_b,
        )
        assert leftover_pub.status_code == 403
        assert "hijack" not in (leftover_dir / "index.html").read_text(encoding="utf-8")

    def test_repair_defect_with_invalid_syntax_reports_failure(self):
        db = SessionLocal()
        try:
            alice = db.query(User).filter(User.email == self.email_a).first()
            assert alice is not None
            p = Project(name="Repair Test Project", description="Test", user_id=alice.id)
            db.add(p)
            db.commit()
            db.refresh(p)

            art = Artifact(
                project_id=p.id,
                name="service.py",
                artifact_type="code",
                path="service.py",
                content="def broken_func(:\n    pass\n",
                status=ArtifactStatus.FAILED.value,
                version=1,
            )
            db.add(art)
            db.commit()
            db.refresh(art)

            defect = Defect(
                project_id=p.id,
                artifact_id=art.id,
                severity="major",
                description="Syntax error in service.py",
                status="open",
            )
            db.add(defect)
            db.commit()
            db.refresh(defect)

            with patch("api.validation.repair_defect_pipeline") as mock_pipeline:
                mock_pipeline.return_value = {
                    "strategy": "mock_failed_repair",
                    "status": "proposed",
                    "patch": "def still_broken(:\n    pass\n",
                    "message": "Attempted fix with syntax error",
                }

                repair_resp = self.client.post(
                    f"/api/v1/projects/{p.id}/repair",
                    json={"defect_id": defect.id},
                    headers=self.headers_a,
                )
                assert repair_resp.status_code == 200, repair_resp.text
                data = repair_resp.json()
                assert data["status"] == "repair_failed"
                assert data["validation_status"] == "failed"

                db.refresh(art)
                assert art.status != ArtifactStatus.REPAIRED.value

            with patch("api.validation.repair_defect_pipeline") as mock_pipeline:
                mock_pipeline.return_value = {
                    "strategy": "mock_successful_repair",
                    "status": "applied",
                    "patch": "def valid_func():\n    return 42\n",
                    "message": "Corrected syntax error",
                }

                repair_resp2 = self.client.post(
                    f"/api/v1/projects/{p.id}/repair",
                    json={"defect_id": defect.id},
                    headers=self.headers_a,
                )
                assert repair_resp2.status_code == 200, repair_resp2.text
                data2 = repair_resp2.json()
                assert data2["status"] == "repaired"
                assert data2["validation_status"] == "passed"

                db.refresh(art)
                assert art.status == ArtifactStatus.REPAIRED.value
                assert art.content == "def valid_func():\n    return 42\n"

            art.name = "notes.md"
            art.content = "original notes"
            db.commit()
            with patch("api.validation.repair_defect_pipeline") as mock_pipeline:
                mock_pipeline.return_value = {
                    "strategy": "mock_unsupported",
                    "status": "proposed",
                    "patch": "# rewritten notes",
                    "message": "Patch for unsupported type",
                }
                unsupported = self.client.post(
                    f"/api/v1/projects/{p.id}/repair",
                    json={"defect_id": defect.id},
                    headers=self.headers_a,
                )
                assert unsupported.status_code == 200, unsupported.text
                data3 = unsupported.json()
                assert data3["status"] == "repair_failed"
                assert data3["validation_status"] == "failed"
                db.refresh(art)
                assert art.content == "original notes"
        finally:
            db.close()


class pytest_raises_http:
    def __init__(self, status_code: int):
        self.status_code = status_code

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            raise AssertionError(f"Expected HTTPException {self.status_code}")
        if not issubclass(exc_type, HTTPException):
            return False
        assert exc.status_code == self.status_code
        return True
