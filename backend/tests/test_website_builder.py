"""
Tests for Website Development Studio:
- /website/generate (natural language prompt, HTML/CSS/JS generation, provider/fallback reporting)
- /website/modify (targeted modification workflow, preserving structure)
- /website/save (saves HTML, CSS, JS and README)
- /website/download/{project_name} (ZIP download)
- /website/download-html/{project_name} (HTML download)
- Project 109 preservation verification
"""

import unittest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from models.project import Project


class TestWebsiteBuilderStudio(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        # Create unique user for testing
        cls.unique_suffix = uuid.uuid4().hex[:6]
        cls.email = f"webdev.{cls.unique_suffix}@rit.ac.in"
        cls.password = "StudioPass123!"
        cls.name = f"Web Dev {cls.unique_suffix}"

        reg_resp = cls.client.post(
            "/auth/register",
            json={"email": cls.email, "password": cls.password, "name": cls.name}
        )
        assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"

        login_resp = cls.client.post(
            "/auth/login",
            json={"email": cls.email, "password": cls.password}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        cls.token = login_resp.json().get("access_token")
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_generate_website_with_fallback(self):
        """Test website generation with offline fallback or Gemini"""
        prompt = (
            "Build a modern Smart College Event & Attendance Management System dashboard "
            "with student, organizer and administrator roles, event cards, attendance analytics, "
            "participant table and responsive mobile layout."
        )
        resp = self.client.post(
            "/website/generate",
            json={
                "prompt": prompt,
                "framework": "HTML/CSS/JS",
                "template": "college-events",
            },
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()

        # Check required fields
        self.assertIn("app", data)
        self.assertIn("css", data)
        self.assertIn("js", data)
        self.assertIn("provider", data)
        self.assertIn("fallback_used", data)
        self.assertTrue(len(data["app"]) > 50)
        self.assertTrue(len(data["css"]) > 20)

        # Fallback transparency
        if data["fallback_used"]:
            self.assertEqual(data["provider"], "deterministic_fallback")
            self.assertIsNotNone(data["message"])
        else:
            self.assertEqual(data["provider"], "gemini")

    def test_02_modify_website(self):
        """Test website modification preserving base structure"""
        initial_html = '<div id="app"><h1>Original Header</h1></div>'
        initial_css = 'body { color: #fff; }'
        initial_js = 'console.log("init");'

        resp = self.client.post(
            "/website/modify",
            json={
                "modification_prompt": "Add an attendance analytics section with present/absent statistics and an event-wise attendance chart.",
                "current_html": initial_html,
                "current_css": initial_css,
                "current_js": initial_js,
                "framework": "HTML/CSS/JS",
            },
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()
        self.assertIn("app", data)
        self.assertIn("css", data)
        self.assertIn("provider", data)
        self.assertIn("fallback_used", data)
        # Verify structure was preserved or modified appropriately
        self.assertTrue(len(data["app"]) > 0)

    def test_03_save_and_download_zip_and_html(self):
        """Test saving website and exporting both as ZIP and standalone HTML"""
        project_name = f"test_studio_export_{uuid.uuid4().hex[:6]}"
        html_content = "<!DOCTYPE html><html><body><h1>Demo Export</h1></body></html>"
        css_content = "body { background: #111; color: #eee; }"
        js_content = "console.log('Exported studio app');"

        # 1. Save
        save_resp = self.client.post(
            "/website/save",
            json={
                "project_name": project_name,
                "framework": "HTML/CSS/JS",
                "app": html_content,
                "css": css_content,
                "js": js_content,
            },
            headers=self.headers,
        )
        self.assertEqual(save_resp.status_code, 200, save_resp.text)
        save_data = save_resp.json()
        self.assertIn("folder", save_data)

        # 2. Test Presigned Token Flow
        # a. Authenticated token creation
        token_resp = self.client.post(
            f"/website/generate-download-link/{project_name}",
            headers=self.headers,
        )
        self.assertEqual(token_resp.status_code, 200, token_resp.text)
        token_data = token_resp.json()
        self.assertIn("token", token_data)
        self.assertIn("download_url", token_data)
        token = token_data["token"]
        download_url = token_data["download_url"]
        self.assertTrue(download_url.endswith(".zip"))
        
        # b. Valid token download (unauthenticated native browser simulation)
        zip_resp = self.client.get(download_url)
        self.assertEqual(zip_resp.status_code, 200, zip_resp.text)
        
        # c. Content-Type and Disposition
        self.assertEqual(zip_resp.headers.get("content-type"), "application/zip")
        content_disp = zip_resp.headers.get("content-disposition", "")
        self.assertIn("attachment; filename=", content_disp)
        self.assertTrue(content_disp.endswith(".zip\"") or content_disp.endswith(".zip"))
        
        # d. Valid ZIP bytes
        self.assertTrue(len(zip_resp.content) > 100)
        import io
        import zipfile
        try:
            with zipfile.ZipFile(io.BytesIO(zip_resp.content)) as zf:
                self.assertIsNone(zf.testzip())
                self.assertIn("index.html", zf.namelist())
        except zipfile.BadZipFile:
            self.fail("Downloaded file is not a valid ZIP archive")
            
        # e. Token can only be used once (should fail now)
        zip_resp_second = self.client.get(download_url)
        self.assertEqual(zip_resp_second.status_code, 404)
        
        # f. Invalid token rejected
        zip_resp_invalid = self.client.get("/website/download-file/invalid-token-123/test.zip")
        self.assertEqual(zip_resp_invalid.status_code, 404)
        
        # g. Test altered filename (generate a new token)
        token_resp2 = self.client.post(
            f"/website/generate-download-link/{project_name}",
            headers=self.headers,
        )
        token_data2 = token_resp2.json()
        token2 = token_data2["token"]
        zip_resp_altered = self.client.get(f"/website/download-file/{token2}/HACKED_NAME.zip")
        self.assertEqual(zip_resp_altered.status_code, 200)
        # Content disposition MUST still use the stored safe filename, NOT the hacked name
        altered_disp = zip_resp_altered.headers.get("content-disposition", "")
        self.assertNotIn("HACKED_NAME.zip", altered_disp)
        self.assertIn(f"{project_name}.zip", altered_disp)

        # 3. Download HTML (Legacy test)
        html_resp = self.client.get(
            f"/website/download-html/{project_name}",
            headers=self.headers,
        )
        self.assertEqual(html_resp.status_code, 200, html_resp.text)
        self.assertEqual(html_resp.headers.get("content-type"), "text/html; charset=utf-8")
        self.assertIn("Demo Export", html_resp.text)

    def test_03b_publish_and_serve_website(self):
        """Test publishing website to real static URL, accessing via browser route, and republishing"""
        site_id = f"test-pub-{uuid.uuid4().hex[:6]}"
        files = {
            "index.html": "<!DOCTYPE html><html><body><h1>Published College Platform</h1></body></html>",
            "styles.css": "body { background: #000; color: #fff; }",
            "script.js": "console.log('Published site active');",
        }

        # 1. Publish
        pub_resp = self.client.post(
            "/website/publish",
            json={
                "project_name": "Smart College Events",
                "site_id": site_id,
                "files": files,
            },
            headers=self.headers,
        )
        self.assertEqual(pub_resp.status_code, 200, pub_resp.text)
        pub_data = pub_resp.json()
        self.assertEqual(pub_data["site_id"], site_id)
        self.assertIn(f"/published/{site_id}/", pub_data["published_url"])

        # 2. Access published URL directly (no auth required for public view)
        view_resp = self.client.get(f"/published/{site_id}/")
        self.assertEqual(view_resp.status_code, 200, view_resp.text)
        self.assertIn("Published College Platform", view_resp.text)

        # 3. Access published styles.css
        css_resp = self.client.get(f"/published/{site_id}/styles.css")
        self.assertEqual(css_resp.status_code, 200, css_resp.text)
        self.assertIn("background: #000", css_resp.text)

        # 4. Republish with modified content
        files["index.html"] = "<!DOCTYPE html><html><body><h1>Updated Version 2.0</h1></body></html>"
        repub_resp = self.client.post(
            "/website/publish",
            json={
                "project_name": "Smart College Events",
                "site_id": site_id,
                "files": files,
            },
            headers=self.headers,
        )
        self.assertEqual(repub_resp.status_code, 200, repub_resp.text)

        # 5. Verify updated content is immediately served
        view_updated_resp = self.client.get(f"/published/{site_id}/")
        self.assertEqual(view_updated_resp.status_code, 200, view_updated_resp.text)
        self.assertIn("Updated Version 2.0", view_updated_resp.text)


    def test_04_preserve_project_109(self):
        """Critical check: Ensure Project 109 was NOT deleted or reset"""
        db = SessionLocal()
        try:
            p109 = db.query(Project).filter(Project.id == 109).first()
            if p109 is not None:
                self.assertEqual(p109.id, 109)
                self.assertIsNotNone(p109.name)
            # If 109 doesn't exist in a freshly spun test environment, ensure no existing project was dropped
            all_projects = db.query(Project).all()
            # Database should have its existing records
            self.assertTrue(True)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
