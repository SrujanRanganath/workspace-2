"""Focused tests for path containment in user-controlled file outputs."""

from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
import zipfile
from unittest.mock import patch

from fastapi import HTTPException
from starlette.datastructures import UploadFile

from utils.file_security import resolve_contained_path
from tools.website_builder.routes import publish
from tools.website_builder.schemas import PublishWebsiteRequest
from tools.code_tool.routes import save_project
from tools.code_tool.schemas import SaveProjectRequest
from tools.data_cleaner.routes import clean_uploaded_file
from tools.document_generator.routes import generate
from tools.document_generator.schemas import DocumentRequest


TEST_USER = SimpleNamespace(email="path-security-test@example.invalid")


class TestFilePathSecurity(unittest.TestCase):
    def test_resolver_rejects_posix_and_windows_path_escape_forms(self):
        with TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "output"
            root.mkdir()
            for unsafe in (
                "../outside.txt",
                "nested/../../outside.txt",
                "/outside.txt",
                r"..\..\outside.txt",
                r"C:\outside.txt",
                r"C:outside.txt",
                r"\outside.txt",
                r"\\server\share\outside.txt",
            ):
                with self.subTest(path=unsafe), self.assertRaises(ValueError):
                    resolve_contained_path(root, unsafe)

    def test_resolver_rejects_existing_symlink_escape(self):
        with TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            root = temp / "output"
            outside = temp / "outside"
            root.mkdir()
            outside.mkdir()
            try:
                (root / "linked").symlink_to(outside, target_is_directory=True)
            except (OSError, NotImplementedError) as exc:
                self.skipTest(f"Symlinks are unavailable: {exc}")

            with self.assertRaises(ValueError):
                resolve_contained_path(root, "linked/outside.txt")

    def test_website_publish_rejects_traversal_and_accepts_nested_file(self):
        with TemporaryDirectory() as temp_dir:
            output_root = Path(temp_dir) / "published"
            with patch("tools.website_builder.routes.PUBLISHED_WEBSITES_DIR", output_root):
                for path in ("../outside.txt", r"..\..\outside.txt", r"C:\outside.txt"):
                    request = PublishWebsiteRequest(
                        project_name="safe-site",
                        site_id="site",
                        files={path: "blocked"},
                    )
                    with self.subTest(path=path), self.assertRaises(HTTPException) as raised:
                        publish(request, TEST_USER)
                    self.assertEqual(raised.exception.status_code, 400)

                nested_request = PublishWebsiteRequest(
                    project_name="safe-site",
                    site_id="site",
                    files={
                        "src/components/App.tsx": "export default function App() {}",
                        r"src\components\WindowsApp.tsx": "export default function WindowsApp() {}",
                    },
                )
                result = publish(nested_request, TEST_USER)
                nested_file = output_root / "site" / "src" / "components" / "App.tsx"
                self.assertTrue(nested_file.is_file())
                self.assertEqual(nested_file.read_text(encoding="utf-8"), "export default function App() {}")
                self.assertIn("src/components/App.tsx", result.files_published)
                self.assertTrue((output_root / "site/src/components/WindowsApp.tsx").is_file())

                unsafe_site_id = PublishWebsiteRequest(
                    project_name="safe-site",
                    site_id=r"C:\outside",
                    files={"index.html": "blocked"},
                )
                with self.assertRaises(HTTPException) as raised:
                    publish(unsafe_site_id, TEST_USER)
                self.assertEqual(raised.exception.status_code, 400)

                unsafe_project_name = PublishWebsiteRequest(
                    project_name="../outside",
                    files={"index.html": "blocked"},
                )
                with self.assertRaises(HTTPException) as raised:
                    publish(unsafe_project_name, TEST_USER)
                self.assertEqual(raised.exception.status_code, 400)

    def test_code_project_save_rejects_traversal_and_accepts_nested_file(self):
        with TemporaryDirectory() as temp_dir:
            output_root = Path(temp_dir) / "generated_projects"
            with patch("tools.code_tool.service.PROJECTS_DIR", output_root):
                for path in ("../outside.py", r"..\..\outside.py", r"C:\outside.py"):
                    request = SaveProjectRequest(project_name="project", files={path: "blocked"})
                    with self.subTest(path=path), self.assertRaises(HTTPException) as raised:
                        save_project(request, TEST_USER)
                    self.assertEqual(raised.exception.status_code, 400)
                    self.assertFalse((Path(temp_dir) / "outside.py").exists())

                nested_request = SaveProjectRequest(
                    project_name="project",
                    files={"src/components/App.tsx": "export default function App() {}"},
                )
                result = save_project(nested_request, TEST_USER)
                nested_file = output_root / "project" / "src" / "components" / "App.tsx"
                self.assertTrue(nested_file.is_file())
                self.assertEqual(result.file_count, 1)
                with zipfile.ZipFile(output_root / "project.zip") as archive:
                    self.assertIn("project/src/components/App.tsx", archive.namelist())

    def test_data_cleaner_rejects_traversal_and_accepts_valid_upload(self):
        with TemporaryDirectory() as temp_dir:
            output_root = Path(temp_dir) / "cleaned"
            output_root.mkdir()
            with patch("tools.data_cleaner.service.OUTPUT_FOLDER", str(output_root)):
                for filename in ("../outside.csv", r"C:\outside.csv"):
                    upload = UploadFile(filename=filename, file=BytesIO(b"name\nAlice\n"))
                    with self.subTest(filename=filename), self.assertRaises(HTTPException) as raised:
                        clean_uploaded_file(upload, TEST_USER)
                    self.assertEqual(raised.exception.status_code, 400)
                    self.assertFalse((Path(temp_dir) / "outside_cleaned.csv").exists())

                upload = UploadFile(filename="people.csv", file=BytesIO(b"name\nAlice\n"))
                response = clean_uploaded_file(upload, TEST_USER)
                self.assertEqual(response.filename, "people_cleaned.csv")
                self.assertTrue((output_root / response.filename).is_file())

    def test_document_generator_rejects_traversal_and_accepts_valid_title(self):
        with TemporaryDirectory() as temp_dir:
            output_root = Path(temp_dir) / "documents"
            output_root.mkdir()
            with patch("tools.document_generator.service.OUTPUT_FOLDER", str(output_root)):
                for title in ("../outside", r"C:\outside"):
                    request = DocumentRequest(
                        document_type="docx",
                        template="resume",
                        title=title,
                        name="Test User",
                        company="",
                        content="Test content",
                    )
                    with self.subTest(title=title), self.assertRaises(HTTPException) as raised:
                        generate(request, TEST_USER)
                    self.assertEqual(raised.exception.status_code, 400)
                    self.assertFalse((Path(temp_dir) / "outside.docx").exists())

                request = DocumentRequest(
                    document_type="docx",
                    template="resume",
                    title="Demo Resume",
                    name="Test User",
                    company="",
                    content="Test content",
                )
                response = generate(request, TEST_USER)
                self.assertEqual(response.filename, "Demo_Resume.docx")
                self.assertTrue((output_root / response.filename).is_file())


if __name__ == "__main__":
    unittest.main()
