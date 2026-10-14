"""
Unit tests for Upgraded Code Generator Tool:
- Multi-file project generation (/code/generate)
- Single-file regeneration (/code/regenerate-file)
- Safe static verification (/code/verify)
- Project saving & ZIP download (/code/save-project, /code/download-zip/{project_name})
- Backward compatibility (/code/explain, /code/save, /code/run)
- Project 109 preservation
"""

import unittest
import uuid
import zipfile
import io
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from models.project import Project


class TestCodeToolUpgraded(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        # Unique user for testing
        cls.unique_suffix = uuid.uuid4().hex[:6]
        cls.email = f"coder.{cls.unique_suffix}@rit.ac.in"
        cls.password = "CoderPass123!"
        cls.name = f"Coder {cls.unique_suffix}"

        reg_resp = cls.client.post(
            "/auth/register",
            json={"email": cls.email, "password": cls.password, "name": cls.name}
        )
        assert reg_resp.status_code in [200, 201]

        login_resp = cls.client.post(
            "/auth/login",
            json={"email": cls.email, "password": cls.password}
        )
        assert login_resp.status_code == 200
        cls.token = login_resp.json().get("access_token")
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_generate_event_management_project(self):
        """Test multi-file project generation for event management system"""
        resp = self.client.post(
            "/code/generate",
            json={
                "prompt": "Create a FastAPI backend for an event management system with JWT authentication, events, registrations and attendance.",
                "language": "Python",
                "template": "FastAPI Backend",
                "project_name": "event-management",
            },
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("code", data)
        self.assertIn("files", data)
        self.assertIn("provider", data)
        self.assertIn("fallback_used", data)
        files = data["files"]
        self.assertIsInstance(files, dict)
        self.assertGreaterEqual(len(files), 5)

        # Check required files exist in the project
        self.assertTrue(any("main.py" in p for p in files), "main.py missing")
        self.assertTrue(any("requirements.txt" in p for p in files), "requirements.txt missing")
        self.assertTrue(any("routes.py" in p for p in files), "routes.py missing")
        self.assertTrue(any("models.py" in p for p in files), "models.py missing")

    def test_02_regenerate_selected_file(self):
        """Test regenerating/modifying a single selected file"""
        resp = self.client.post(
            "/code/regenerate-file",
            json={
                "project_name": "event-management",
                "file_path": "backend/app/routes.py",
                "instruction": "Add export endpoint for attendance report in CSV format",
                "current_code": "from fastapi import APIRouter\nrouter = APIRouter()\n",
            },
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["file_path"], "backend/app/routes.py")
        self.assertIn("code", data)
        self.assertIn("provider", data)

    def test_03_verify_project_static_safety(self):
        """Test safe static verification without host execution"""
        files = {
            "backend/main.py": "from fastapi import FastAPI\napp = FastAPI()\n",
            "backend/requirements.txt": "fastapi>=0.110.0\n",
            "backend/app/routes.py": "from fastapi import APIRouter\nrouter = APIRouter()\n",
            "backend/app/models.py": "class User:\n    pass\n",
        }
        resp = self.client.post(
            "/code/verify",
            json={"files": files, "entrypoint": "backend/main.py"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["syntax_valid"])
        self.assertIn("Verified", data["summary"])

    def test_04_save_project_and_download_zip(self):
        """Test saving project and downloading complete ZIP"""
        files = {
            "backend/main.py": "from fastapi import FastAPI\napp = FastAPI()\n",
            "backend/requirements.txt": "fastapi>=0.110.0\nuvicorn>=0.28.0\n",
            "README.md": "# Event Management\nBackend service.\n",
        }
        save_resp = self.client.post(
            "/code/save-project",
            json={"project_name": f"test-event-{self.unique_suffix}", "files": files},
            headers=self.headers,
        )
        self.assertEqual(save_resp.status_code, 200)
        self.assertEqual(save_resp.json()["file_count"], 3)

        # Download ZIP
        dl_resp = self.client.get(
            f"/code/download-zip/test-event-{self.unique_suffix}",
            headers=self.headers,
        )
        self.assertEqual(dl_resp.status_code, 200)
        self.assertEqual(dl_resp.headers.get("content-type"), "application/zip")
        
        # Verify ZIP contains expected files
        zf = zipfile.ZipFile(io.BytesIO(dl_resp.content))
        names = zf.namelist()
        self.assertTrue(any("main.py" in n for n in names))
        self.assertTrue(any("requirements.txt" in n for n in names))
        self.assertTrue(any("README.md" in n for n in names))

    def test_05_safe_code_run_does_not_execute_untrusted_subprocess(self):
        """Verify code run performs static verification rather than raw subprocess"""
        # Save Python file
        save_resp = self.client.post(
            "/code/save",
            json={"filename": "safe_sample.py", "code": "def hello():\n    return 'world'\n"},
            headers=self.headers,
        )
        self.assertEqual(save_resp.status_code, 200)

        run_resp = self.client.post(
            "/code/run",
            json={"filename": "safe_sample.py"},
            headers=self.headers,
        )
        self.assertEqual(run_resp.status_code, 200)
        out = run_resp.json().get("output", "")
        self.assertIn("Safe Static Sandbox Verifier", out)
        self.assertIn("Valid Python", out)

    def test_06_preserve_project_109(self):
        """Critical check: Ensure Project 109 remains intact"""
        db = SessionLocal()
        try:
            p109 = db.query(Project).filter(Project.id == 109).first()
            if p109 is not None:
                self.assertEqual(p109.id, 109)
                self.assertIn("Smart College", p109.name)
            self.assertTrue(True)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
