"""
AI Engineering Workspace — Comprehensive V1 API & Rebuild Verification Suite.

Tests:
1. Authentication (Register, Login, Token generation)
2. Project Lifecycle (Create, List, Update, Retrieve)
3. Requirement Pipeline (Create, Analyze into structured JSON)
4. Architecture Specification Generation
5. Implementation Plan Synthesis
6. Multi-Artifact Code Generation (DB, Backend, Frontend, Tests, Docs)
7. Verification & Traceability Validation
8. Defect Tracking and Repair
9. Legacy Tool Endpoints Integrity
"""

import unittest
import uuid
import json
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from models.user import User
from models.validation import Defect, ValidationRun


class TestAIEngineeringWorkspace(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        # Create unique test developer
        cls.unique_suffix = uuid.uuid4().hex[:6]
        cls.email = f"lead.engineer.{cls.unique_suffix}@rit.ac.in"
        cls.password = "Secur3P@ssw0rd!2026"
        cls.name = f"Prof Engineer {cls.unique_suffix}"

        # Register
        reg_resp = cls.client.post(
            "/auth/register",
            json={"email": cls.email, "password": cls.password, "name": cls.name}
        )
        assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"

        # Login
        login_resp = cls.client.post(
            "/auth/login",
            json={"email": cls.email, "password": cls.password}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        data = login_resp.json()
        cls.token = data.get("access_token")
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def _create_project(self, name, headers=None):
        response = self.client.post(
            "/api/v1/projects",
            json={"name": name},
            headers=headers or self.headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def _create_test_case(self, project_id, name, headers=None, artifact_id=None):
        response = self.client.post(
            f"/api/v1/projects/{project_id}/tests",
            json={
                "name": name,
                "description": "Deterministic API test case",
                "test_type": "unit",
                "artifact_id": artifact_id,
                "requirement_id": None,
            },
            headers=headers or self.headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def _create_generated_test_artifact(self, project_id, headers=None):
        response = self.client.post(
            f"/api/v1/projects/{project_id}/artifacts",
            json={
                "artifact_type": "tests",
                "name": "test_generated_project.py",
                "path": "tests/test_generated_project.py",
                "content": "def test_generated_project():\n    assert True\n",
            },
            headers=headers or self.headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_01_auth_me(self):
        resp = self.client.get("/auth/me", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        user_data = resp.json()
        self.assertEqual(user_data["email"], self.email)

    def test_02_project_crud(self):
        # Create
        create_payload = {
            "name": "Smart Campus IoT Monitor",
            "description": "Enterprise telemetry collection with anomaly alerts and live dashboard"
        }
        res = self.client.post("/api/v1/projects", json=create_payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        project = res.json()
        self.assertEqual(project["name"], "Smart Campus IoT Monitor")
        self.assertEqual(project["status"], "draft")
        project_id = project["id"]

        # List
        list_res = self.client.get("/api/v1/projects", headers=self.headers)
        self.assertEqual(list_res.status_code, 200)
        projects = list_res.json()["projects"]
        self.assertTrue(any(p["id"] == project_id for p in projects))

        # Get
        get_res = self.client.get(f"/api/v1/projects/{project_id}", headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["id"], project_id)

    @patch("services.llm.get_llm_provider")
    def test_03_end_to_end_project_engineering_pipeline(self, mock_get_provider):
        mock_provider = mock_get_provider.return_value
        mock_provider.generate.side_effect = RuntimeError(
            "Simulated LLM provider failure for offline testing"
        )

        # 1. Create project
        p_res = self.client.post(
            "/api/v1/projects",
            json={"name": "Hospital Bed Tracker", "description": "Real-time bed availability tracking"},
            headers=self.headers
        )
        self.assertEqual(p_res.status_code, 201)
        project_id = p_res.json()["id"]

        # 2. Add requirement
        req_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements",
            json={"raw_text": "System must manage hospital wards and beds, track occupancy in real time, authenticate nurses via JWT, and provide an alert if ICU capacity exceeds 90%."},
            headers=self.headers
        )
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.json()["id"]

        # 3. Analyze requirement
        analyze_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements/analyze",
            json={"requirement_id": req_id},
            headers=self.headers
        )
        self.assertEqual(analyze_res.status_code, 200)
        structured = analyze_res.json()["structured"]
        self.assertIn("actors", structured)
        self.assertIn("functional_requirements", structured)
        self.assertIn("entities", structured)
        self.assertTrue(len(structured["functional_requirements"]) > 0)

        # 4. Generate specification
        spec_res = self.client.post(
            f"/api/v1/projects/{project_id}/specification",
            json={"requirement_id": req_id},
            headers=self.headers
        )
        self.assertEqual(spec_res.status_code, 200)
        spec = spec_res.json()["specification"]
        self.assertIn("architecture_pattern", spec)
        self.assertIn("database_schema", spec)

        # 5. Generate plan
        plan_res = self.client.post(
            f"/api/v1/projects/{project_id}/plan",
            json={"requirement_id": req_id},
            headers=self.headers
        )
        self.assertEqual(plan_res.status_code, 200)
        plan = plan_res.json()["plan"]
        self.assertIn("phases", plan)
        self.assertTrue(len(plan["phases"]) >= 4)

        # 6. Generate Multi-Artifacts
        gen_res = self.client.post(
            f"/api/v1/projects/{project_id}/generate",
            headers=self.headers
        )
        self.assertEqual(gen_res.status_code, 200)
        artifacts = gen_res.json()
        self.assertTrue(len(artifacts) >= 5)
        art_types = [a["artifact_type"] for a in artifacts]
        self.assertIn("database", art_types)
        self.assertIn("backend", art_types)
        self.assertIn("frontend", art_types)
        self.assertIn("tests", art_types)
        self.assertIn("documentation", art_types)

        # 7. Validate project artifacts
        val_res = self.client.post(
            f"/api/v1/projects/{project_id}/validate",
            headers=self.headers
        )
        self.assertEqual(val_res.status_code, 200)
        val_data = val_res.json()
        self.assertIn("summary", val_data)
        self.assertIn("results", val_data)
        self.assertGreater(val_data["summary"]["passed"], 0)

        # 8. Check Generation Runs
        runs_res = self.client.get(
            f"/api/v1/projects/{project_id}/runs",
            headers=self.headers
        )
        self.assertEqual(runs_res.status_code, 200)
        runs = runs_res.json()["runs"]
        self.assertTrue(len(runs) >= 3)

    def test_04_legacy_tools_preservation(self):
        # Verify /health
        health_res = self.client.get("/health")
        self.assertEqual(health_res.status_code, 200)
        self.assertEqual(health_res.json()["status"], "healthy")

        # Verify /code/explain without calling the live Gemini API
        stub_explanation = (
            "This recursive Fibonacci function returns n for n <= 1 and "
            "otherwise returns fib(n-1) + fib(n-2)."
        )
        with patch(
            "tools.code_tool.service.ask_llm",
            return_value=stub_explanation,
        ) as mock_ask_llm:
            explain_res = self.client.post(
                "/code/explain",
                json={
                    "code": "def fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)",
                    "language": "python",
                },
                headers=self.headers,
            )

        self.assertEqual(explain_res.status_code, 200)
        payload = explain_res.json()
        self.assertIn("explanation", payload)
        self.assertEqual(payload["explanation"], stub_explanation)
        mock_ask_llm.assert_called_once()

    def test_05_create_test_case(self):
        project_id = self._create_project("Test Case Creation Project")

        response = self.client.post(
            f"/api/v1/projects/{project_id}/tests",
            json={
                "name": "test_project_health",
                "description": "Checks the project health contract",
                "test_type": "unit",
                "artifact_id": None,
                "requirement_id": None,
            },
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 201, response.text)
        test_case = response.json()
        self.assertEqual(test_case["project_id"], project_id)
        self.assertEqual(test_case["name"], "test_project_health")
        self.assertEqual(test_case["description"], "Checks the project health contract")
        self.assertEqual(test_case["test_type"], "unit")
        self.assertEqual(test_case["status"], "pending")
        self.assertIsNone(test_case["artifact_id"])
        self.assertIsNone(test_case["requirement_id"])
        self.assertIn("created_at", test_case)

    def test_06_list_test_cases(self):
        project_id = self._create_project("Test Case Listing Project")
        first = self._create_test_case(project_id, "test_first")
        second = self._create_test_case(project_id, "test_second")

        response = self.client.get(
            f"/api/v1/projects/{project_id}/tests",
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200, response.text)
        test_cases = response.json()
        self.assertEqual({item["id"] for item in test_cases}, {first["id"], second["id"]})
        self.assertTrue(all(item["project_id"] == project_id for item in test_cases))

    def test_07_get_test_case(self):
        project_id = self._create_project("Test Case Retrieval Project")
        created = self._create_test_case(project_id, "test_retrieval")

        response = self.client.get(
            f"/api/v1/projects/{project_id}/tests/{created['id']}",
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], created["id"])
        self.assertEqual(response.json()["project_id"], project_id)

    def test_08_list_test_results_when_empty(self):
        project_id = self._create_project("Empty Test Results Project")
        test_case = self._create_test_case(project_id, "test_without_results")

        response = self.client.get(
            f"/api/v1/projects/{project_id}/tests/{test_case['id']}/results",
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), [])

    def test_09_test_case_project_ownership_isolation(self):
        other_email = f"other.engineer.{uuid.uuid4().hex[:6]}@rit.ac.in"
        other_password = "Secur3P@ssw0rd!2026"
        register_response = self.client.post(
            "/auth/register",
            json={
                "email": other_email,
                "password": other_password,
                "name": "Other Test Engineer",
            },
        )
        self.assertIn(register_response.status_code, [200, 201], register_response.text)
        login_response = self.client.post(
            "/auth/login",
            json={"email": other_email, "password": other_password},
        )
        self.assertEqual(login_response.status_code, 200, login_response.text)
        other_token = login_response.json()["access_token"]
        other_headers = {"Authorization": "Bearer " + other_token}
        other_project_id = self._create_project("Other User Test Project", other_headers)
        other_test_case = self._create_test_case(
            other_project_id,
            "test_owned_by_other_user",
            other_headers,
        )
        own_project_id = self._create_project("Owned Test Project")

        other_project_response = self.client.get(
            f"/api/v1/projects/{other_project_id}/tests",
            headers=self.headers,
        )
        foreign_case_response = self.client.get(
            f"/api/v1/projects/{own_project_id}/tests/{other_test_case['id']}",
            headers=self.headers,
        )
        foreign_results_response = self.client.get(
            f"/api/v1/projects/{own_project_id}/tests/{other_test_case['id']}/results",
            headers=self.headers,
        )

        self.assertEqual(other_project_response.status_code, 404)
        self.assertEqual(foreign_case_response.status_code, 404)
        self.assertEqual(foreign_results_response.status_code, 404)

    def test_10_run_test_case_ownership_validation(self):
        other_email = f"runner.owner.{uuid.uuid4().hex[:6]}@rit.ac.in"
        other_password = "Secur3P@ssw0rd!2026"
        register_response = self.client.post(
            "/auth/register",
            json={
                "email": other_email,
                "password": other_password,
                "name": "Runner Owner",
            },
        )
        self.assertIn(register_response.status_code, [200, 201], register_response.text)
        login_response = self.client.post(
            "/auth/login",
            json={"email": other_email, "password": other_password},
        )
        self.assertEqual(login_response.status_code, 200, login_response.text)
        other_headers = {
            "Authorization": "Bearer " + login_response.json()["access_token"]
        }
        other_project_id = self._create_project("Foreign Runner Project", other_headers)
        foreign_artifact = self._create_generated_test_artifact(
            other_project_id,
            other_headers,
        )
        foreign_test_case = self._create_test_case(
            other_project_id,
            "test_foreign_runner_case",
            other_headers,
            artifact_id=foreign_artifact["id"],
        )
        own_project_id = self._create_project("Owned Runner Project")

        foreign_project_response = self.client.post(
            f"/api/v1/projects/{other_project_id}/tests/{foreign_test_case['id']}/run",
            headers=self.headers,
        )
        foreign_case_response = self.client.post(
            f"/api/v1/projects/{own_project_id}/tests/{foreign_test_case['id']}/run",
            headers=self.headers,
        )

        self.assertEqual(foreign_project_response.status_code, 404)
        self.assertEqual(foreign_case_response.status_code, 404)

    def test_11_run_test_case_requires_project_test_artifact(self):
        project_id = self._create_project("Missing Test Artifact Project")
        test_case = self._create_test_case(project_id, "test_missing_artifact")

        response = self.client.post(
            f"/api/v1/projects/{project_id}/tests/{test_case['id']}/run",
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Test artifact not found.")

    def test_12_run_test_case_when_docker_unavailable_runs_static_verification_and_persists_result(self):
        project_id = self._create_project("Unavailable Runner Project")
        artifact = self._create_generated_test_artifact(project_id)
        test_case = self._create_test_case(
            project_id,
            "test_runner_unavailable",
            artifact_id=artifact["id"],
        )

        with patch("services.test_runner.shutil.which", return_value=None):
            response = self.client.post(
                f"/api/v1/projects/{project_id}/tests/{test_case['id']}/run",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "STATIC_PASS")
        self.assertEqual(response.json()["verification_type"], "Static Verification")
        self.assertEqual(response.json()["docker_status"], "NOT EXECUTED")
        self.assertIn("Static verification passed", response.json()["message"])
        self.assertIn("Docker is unavailable", response.json()["message"])
        results_response = self.client.get(
            f"/api/v1/projects/{project_id}/test-results",
            headers=self.headers,
        )
        self.assertEqual(results_response.status_code, 200, results_response.text)
        self.assertEqual(len(results_response.json()), 1)
        self.assertEqual(results_response.json()[0]["test_case_id"], test_case["id"])
        self.assertEqual(results_response.json()[0]["status"], "STATIC_PASS")
        self.assertEqual(results_response.json()[0]["verification_type"], "Static Verification")

    def test_12b_docker_runner_maintains_runner_unavailable_isolation_directly(self):
        """Verify the underlying Docker runner function itself is unchanged and never runs host subprocesses."""
        from services.test_runner import run_test_artifacts
        with patch("services.test_runner.shutil.which", return_value=None):
            res = run_test_artifacts(
                {"artifact_type": "tests", "path": "tests/test_x.py", "content": "assert True"},
                []
            )
        self.assertEqual(res.status, "runner_unavailable")
        self.assertIn("Docker is not installed", res.message)

    def test_12c_static_verification_fails_on_syntax_error(self):
        project_id = self._create_project("Syntax Error Test Project")
        resp = self.client.post(
            f"/api/v1/projects/{project_id}/artifacts",
            json={
                "artifact_type": "tests",
                "name": "test_syntax_broken.py",
                "path": "tests/test_syntax_broken.py",
                "content": "def test_invalid_syntax(:\n    assert True\n",
            },
            headers=self.headers,
        )
        artifact = resp.json()
        test_case = self._create_test_case(project_id, "tc_syntax_broken", artifact_id=artifact["id"])

        with patch("services.test_runner.shutil.which", return_value=None):
            run_res = self.client.post(
                f"/api/v1/projects/{project_id}/tests/{test_case['id']}/run",
                headers=self.headers,
            )
        self.assertEqual(run_res.status_code, 200)
        self.assertEqual(run_res.json()["status"], "STATIC_FAIL")
        self.assertEqual(run_res.json()["verification_type"], "Static Verification")
        self.assertIn("Python syntax error", run_res.json()["message"])

    def test_12d_static_verification_fails_on_empty_content(self):
        project_id = self._create_project("Empty Test Project")
        resp = self.client.post(
            f"/api/v1/projects/{project_id}/artifacts",
            json={
                "artifact_type": "tests",
                "name": "test_empty.py",
                "path": "tests/test_empty.py",
                "content": "   ",
            },
            headers=self.headers,
        )
        artifact = resp.json()
        test_case = self._create_test_case(project_id, "tc_empty", artifact_id=artifact["id"])

        with patch("services.test_runner.shutil.which", return_value=None):
            run_res = self.client.post(
                f"/api/v1/projects/{project_id}/tests/{test_case['id']}/run",
                headers=self.headers,
            )
        self.assertEqual(run_res.status_code, 200)
        self.assertEqual(run_res.json()["status"], "STATIC_FAIL")
        self.assertIn("missing or empty", run_res.json()["message"])

    def test_12e_static_verification_fails_on_missing_test_functions(self):
        project_id = self._create_project("No Test Functions Project")
        resp = self.client.post(
            f"/api/v1/projects/{project_id}/artifacts",
            json={
                "artifact_type": "tests",
                "name": "test_no_functions.py",
                "path": "tests/test_no_functions.py",
                "content": "x = 42\ny = 'hello world'\n",
            },
            headers=self.headers,
        )
        artifact = resp.json()
        test_case = self._create_test_case(project_id, "tc_no_functions", artifact_id=artifact["id"])

        with patch("services.test_runner.shutil.which", return_value=None):
            run_res = self.client.post(
                f"/api/v1/projects/{project_id}/tests/{test_case['id']}/run",
                headers=self.headers,
            )
        self.assertEqual(run_res.status_code, 200)
        self.assertEqual(run_res.json()["status"], "STATIC_FAIL")
        self.assertIn("No test functions", run_res.json()["message"])

    def test_12f_static_verification_passes_with_specification_coverage(self):
        """Full specification + domain entities + API contracts + test suite verification."""
        project_id = self._create_project("Full Verification Project")
        spec_content = {
            "project_name": "Full Verification Project",
            "api_contract": [
                {"endpoint": "/api/v1/auth/login", "method": "POST"},
                {"endpoint": "/api/v1/events", "method": "GET"},
            ],
            "database_schema": [
                {"table_name": "users", "columns": ["id", "email"]},
                {"table_name": "events", "columns": ["id", "title"]},
            ],
        }
        self.client.post(
            f"/api/v1/projects/{project_id}/artifacts",
            json={
                "artifact_type": "documentation",
                "name": "specification.json",
                "path": "docs/SPECIFICATION.json",
                "content": json.dumps(spec_content),
            },
            headers=self.headers,
        )
        test_suite_code = (
            '"""Automated test suite for Full Verification Project."""\n\n'
            'SPEC_API_CONTRACT = ["/api/v1/auth/login", "/api/v1/events"]\n'
            'SPEC_DB_TABLES = ["users", "events"]\n\n'
            'def test_auth_and_login_contract():\n'
            '    assert "/api/v1/auth/login" in SPEC_API_CONTRACT\n\n'
            'def test_database_schema_entities():\n'
            '    assert "users" in SPEC_DB_TABLES\n'
            '    assert "events" in SPEC_DB_TABLES\n'
        )
        resp = self.client.post(
            f"/api/v1/projects/{project_id}/artifacts",
            json={
                "artifact_type": "tests",
                "name": "test_full_verification.py",
                "path": "tests/test_full_verification.py",
                "content": test_suite_code,
            },
            headers=self.headers,
        )
        artifact = resp.json()
        test_case = self._create_test_case(project_id, "tc_full_verification", artifact_id=artifact["id"])

        with patch("services.test_runner.shutil.which", return_value=None):
            run_res = self.client.post(
                f"/api/v1/projects/{project_id}/tests/{test_case['id']}/run",
                headers=self.headers,
            )
        self.assertEqual(run_res.status_code, 200)
        self.assertEqual(run_res.json()["status"], "STATIC_PASS")
        self.assertEqual(run_res.json()["verification_type"], "Static Verification")
        self.assertEqual(run_res.json()["docker_status"], "NOT EXECUTED")
        self.assertIn("Static verification passed", run_res.json()["message"])
        checks = run_res.json()["checks"]
        self.assertTrue(checks["artifact_exists"])
        self.assertTrue(checks["ast_syntax_valid"])
        self.assertTrue(checks["test_functions_present"])
        self.assertTrue(checks["api_endpoints_covered"])
        self.assertTrue(checks["domain_entities_represented"])


    def test_13_run_test_case_uses_mocked_runner_and_persists_result(self):
        from services.test_runner import TestExecutionResult

        project_id = self._create_project("Mocked Runner Project")
        artifact = self._create_generated_test_artifact(project_id)
        test_case = self._create_test_case(
            project_id,
            "test_mocked_runner",
            artifact_id=artifact["id"],
        )
        execution = TestExecutionResult(
            status="passed",
            stdout="1 passed",
            stderr="",
            exit_code=0,
            duration_ms=17,
        )

        with patch("api.validation.run_test_artifacts", return_value=execution) as runner:
            response = self.client.post(
                f"/api/v1/projects/{project_id}/tests/{test_case['id']}/run",
                headers=self.headers,
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "passed")
        self.assertEqual(response.json()["exit_code"], 0)
        self.assertEqual(response.json()["stdout"], "1 passed")
        runner.assert_called_once()
        case_results = self.client.get(
            f"/api/v1/projects/{project_id}/tests/{test_case['id']}/results",
            headers=self.headers,
        )
        project_results = self.client.get(
            f"/api/v1/projects/{project_id}/test-results",
            headers=self.headers,
        )
        self.assertEqual(case_results.status_code, 200, case_results.text)
        self.assertEqual(project_results.status_code, 200, project_results.text)
        self.assertEqual(len(case_results.json()), 1)
        self.assertEqual(len(project_results.json()), 1)
        self.assertEqual(project_results.json()[0]["status"], "passed")

    @patch("services.llm.get_llm_provider")
    def test_14_smart_college_event_domain_analysis_does_not_inject_workspace_entities(self, mock_get_provider):
        mock_provider = mock_get_provider.return_value
        mock_provider.generate.side_effect = RuntimeError("Simulated Gemini quota exhausted (429)")

        project_id = self._create_project("Smart College Event & Attendance Management System")
        raw_text = """Build a Smart College Event & Attendance Management System for a college.

The system must have three user roles: Student, Organizer, and Administrator.

Students must be able to register and log in, view available college events, view event details, register for events, see their registered events, and view their attendance history.

Organizers must be able to create, update, and delete events, define event date, time, venue, capacity and description, view registered participants, upload attendance data using CSV or XLSX files, and generate attendance reports.

Administrators must be able to manage users and events, view system-wide attendance information, and monitor system activity.

The system must prevent duplicate event registration, prevent attendance for users who are not registered for an event, and prevent attendance from being recorded more than once for the same participant and event.

Attendance uploads must be validated and cleaned before being stored. Invalid rows, missing required fields, duplicate records, and inconsistent values must be identified and reported.

The system must provide REST APIs for authentication, users, events, registrations, attendance, file upload, data cleaning, and reports.

The frontend must be responsive and provide dashboards appropriate to each role.

The backend must use a relational database with entities for users, events, registrations and attendance records.

Acceptance criteria:
- Users can authenticate according to their role.
- Students can register for and view events.
- Organizers can manage events and attendance.
- Administrators can manage system data.
- Duplicate registrations are rejected.
- Invalid attendance uploads are detected and reported.
- Attendance records are protected against duplicates."""

        req_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements",
            json={"raw_text": raw_text},
            headers=self.headers
        )
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.json()["id"]

        analyze_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements/analyze",
            json={"requirement_id": req_id},
            headers=self.headers
        )
        self.assertEqual(analyze_res.status_code, 200, analyze_res.text)
        data = analyze_res.json()
        structured = data["structured"]

        actors = [a.lower() for a in structured.get("actors", [])]
        entities_text = " ".join(structured.get("entities", [])).lower()

        # Specifically verify: Student, Organizer, Administrator extracted as actors
        self.assertTrue(any("student" in a for a in actors), f"Student missing from actors: {actors}")
        self.assertTrue(any("organizer" in a for a in actors), f"Organizer missing from actors: {actors}")
        self.assertTrue(any("admin" in a for a in actors), f"Administrator missing from actors: {actors}")

        # Specifically verify domain entities: Event, Registration, Attendance
        self.assertIn("event", entities_text)
        self.assertTrue("attendance" in entities_text or "registration" in entities_text)

        # Specifically verify that internal workspace entities (Project, Artifact) are NOT present
        self.assertNotIn("project", entities_text)
        self.assertNotIn("artifact", entities_text)
        self.assertNotIn("system service", actors)

        # Verify generation run metadata reflects truthful offline parsing
        runs_res = self.client.get(f"/api/v1/projects/{project_id}/runs", headers=self.headers)
        self.assertEqual(runs_res.status_code, 200)
        latest_run = runs_res.json()["runs"][0]
        self.assertEqual(latest_run["operation"], "requirement_analysis")
        self.assertEqual(latest_run["provider"], "deterministic_offline_parser")
        self.assertEqual(latest_run["output_metadata"]["mode"], "deterministic_offline_parser")

    @patch("services.llm.get_llm_provider")
    def test_15_smart_college_event_requirement_analysis_preserves_successful_llm_path(self, mock_get_provider):
        mock_provider = mock_get_provider.return_value
        llm_payload = {
            "actors": ["Student", "Organizer", "Administrator"],
            "functional_requirements": [
                "Students can register and view college events",
                "Organizers can manage events and upload attendance records",
                "Administrators can monitor system activity"
            ],
            "non_functional_requirements": ["JWT auth", "ACID persistence"],
            "entities": ["User (id, email)", "Event (id, title)", "Registration (id, user_id)", "Attendance (id, event_id)"],
            "workflows": ["Login", "Event Registration", "Attendance Processing"],
            "api_requirements": ["POST /api/v1/auth/login", "GET /api/v1/events", "POST /api/v1/attendance"],
            "frontend_requirements": ["Student Portal", "Organizer Console", "Admin Dashboard"],
            "data_requirements": ["Relational tables for User, Event, Registration, Attendance"],
            "documentation_requirements": ["Architecture overview", "API contracts"],
            "acceptance_criteria": ["Students can register for events", "Attendance is recorded without duplicates"]
        }
        mock_provider.generate.return_value = json.dumps(llm_payload)

        project_id = self._create_project("Smart College Event LLM Path Project")
        req_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements",
            json={"raw_text": "A college event management system with student and organizer roles."},
            headers=self.headers
        )
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.json()["id"]

        analyze_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements/analyze",
            json={"requirement_id": req_id},
            headers=self.headers
        )
        self.assertEqual(analyze_res.status_code, 200, analyze_res.text)
        data = analyze_res.json()
        self.assertEqual(data["structured"]["actors"], ["Student", "Organizer", "Administrator"])
        self.assertIn("Event (id, title)", data["structured"]["entities"])
        mock_provider.generate.assert_called_once()

    @patch("services.llm.get_llm_provider")
    def test_16_smart_college_specification_synthesis_domain_consistency_and_no_items(self, mock_get_provider):
        mock_provider = mock_get_provider.return_value
        mock_provider.generate.side_effect = RuntimeError("Simulated Gemini quota exhausted (429)")

        project_id = self._create_project("Smart College Event Offline Spec Project")
        raw_text = """The system must support Student, Organizer, and Administrator roles.
Students register for and attend events. Organizers create and manage events.
The system must prevent duplicate event registration, prevent attendance for users who are not registered for an event, and prevent attendance from being recorded more than once for the same participant and event.
Attendance uploads must be validated and cleaned before being stored. Invalid rows, missing required fields, duplicate records, and inconsistent values must be identified and reported.
The system must provide REST APIs for authentication, users, events, registrations, attendance, file upload, data cleaning, and reports.
The frontend must be responsive and provide dashboards appropriate to each role.
The backend must use a relational database with entities for users, events, registrations and attendance records."""

        # 1. Post and analyze requirement
        req_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements",
            json={"raw_text": raw_text},
            headers=self.headers
        )
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.json()["id"]

        analyze_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements/analyze",
            json={"requirement_id": req_id},
            headers=self.headers
        )
        self.assertEqual(analyze_res.status_code, 200)
        structured = analyze_res.json()["structured"]

        # Verify entity deduplication: Attendance is present, Attendance Record is deduplicated, Participant not fabricated
        entities = structured.get("entities", [])
        entity_names = [e.split("(")[0].strip() for e in entities]
        self.assertIn("Attendance", entity_names)
        self.assertNotIn("Attendance Record", entity_names)
        self.assertNotIn("Participant", entity_names)

        # 2. Synthesize specification
        spec_res = self.client.post(
            f"/api/v1/projects/{project_id}/specification",
            json={"requirement_id": req_id},
            headers=self.headers
        )
        self.assertEqual(spec_res.status_code, 200, spec_res.text)
        spec_data = spec_res.json()
        spec = spec_data["specification"]

        # Verify no generic /items endpoint
        endpoints = [ep["endpoint"] for ep in spec.get("api_contract", [])]
        for ep in endpoints:
            self.assertNotIn("/items", ep, f"Generic /items found in endpoint: {ep}")
            self.assertFalse(ep.endswith("/items"))

        # Verify comprehensive API coverage (auth, users, events, registrations, attendance, upload, cleaning, reports)
        self.assertTrue(any("/auth/login" in ep for ep in endpoints), "Missing /auth/login endpoint")
        self.assertTrue(any("/auth/register" in ep for ep in endpoints), "Missing /auth/register endpoint")
        self.assertTrue(any("/users" in ep for ep in endpoints), "Missing /users endpoint")
        self.assertTrue(any("/events" in ep for ep in endpoints), "Missing /events endpoint")
        self.assertTrue(any("/register" in ep for ep in endpoints), "Missing registration endpoint")
        self.assertTrue(any("/attendance" in ep for ep in endpoints), "Missing attendance endpoint")
        self.assertTrue(any("/attendance/upload" in ep for ep in endpoints), "Missing attendance upload endpoint")
        self.assertTrue(any("/attendance/validate-clean" in ep for ep in endpoints), "Missing attendance cleaning endpoint")
        self.assertTrue(any("/reports/attendance" in ep for ep in endpoints), "Missing attendance report endpoint")
        self.assertGreaterEqual(len(endpoints), 15, f"Expected at least 15 endpoints, got {len(endpoints)}")

        # Verify database schema: domain tables, concrete columns, no payload JSON
        tables = spec.get("database_schema", [])
        table_names = [t["table_name"] for t in tables]
        self.assertIn("users", table_names)
        self.assertIn("events", table_names)
        self.assertIn("registrations", table_names)
        self.assertIn("attendances", table_names)
        # Deduplication check: no duplicate attendance_records table
        self.assertNotIn("attendance_records", table_names)

        for table in tables:
            columns_str = " ".join(table.get("columns", []))
            self.assertNotIn("payload json", columns_str.lower(), f"Generic payload JSON found in {table['table_name']}")
            self.assertIn("PRIMARY KEY", columns_str)

        # Check events table columns
        events_table = next(t for t in tables if t["table_name"] == "events")
        events_cols = " ".join(events_table["columns"])
        self.assertIn("title", events_cols)
        self.assertIn("venue", events_cols)
        self.assertIn("capacity", events_cols)
        self.assertIn("organizer_id", events_cols)

        # Check registration unique constraint
        reg_table = next(t for t in tables if t["table_name"] == "registrations")
        reg_cols = " ".join(reg_table["columns"])
        self.assertIn("uq_event_user", reg_cols)

        # Check attendance unique constraint
        att_table = next(t for t in tables if t["table_name"] == "attendances")
        att_cols = " ".join(att_table["columns"])
        self.assertIn("uq_attendance_event_user", att_cols)

        # Verify generation run metadata
        runs_res = self.client.get(f"/api/v1/projects/{project_id}/runs", headers=self.headers)
        self.assertEqual(runs_res.status_code, 200)
        latest_run = runs_res.json()["runs"][0]
        self.assertEqual(latest_run["operation"], "specification_generation")
        self.assertEqual(latest_run["provider"], "deterministic_offline_synthesizer")
        self.assertEqual(latest_run["output_metadata"]["mode"], "deterministic_offline_synthesizer")
        self.assertGreater(latest_run["output_metadata"]["api_endpoints"], 10)

    @patch("services.llm.get_llm_provider")
    def test_17_smart_college_specification_preserves_successful_llm_path(self, mock_get_provider):
        mock_provider = mock_get_provider.return_value
        llm_spec_payload = {
            "project_name": "Smart College Event LLM Project",
            "architecture_pattern": "Three-tier Modular Architecture",
            "system_overview": "LLM generated college event architecture overview",
            "database_schema": [
                {
                    "table_name": "users",
                    "description": "User credentials and roles",
                    "columns": ["id INTEGER PRIMARY KEY", "email VARCHAR(255) UNIQUE NOT NULL", "role VARCHAR(50) NOT NULL"]
                },
                {
                    "table_name": "events",
                    "description": "Scheduled events",
                    "columns": ["id INTEGER PRIMARY KEY", "title VARCHAR(255) NOT NULL", "organizer_id INTEGER REFERENCES users(id)"]
                }
            ],
            "api_contract": [
                {
                    "endpoint": "/api/v1/auth/login",
                    "method": "POST",
                    "description": "Authenticate user",
                    "request_body": "LoginRequest",
                    "response_schema": "TokenResponse"
                },
                {
                    "endpoint": "/api/v1/events",
                    "method": "GET",
                    "description": "List events",
                    "request_body": None,
                    "response_schema": "EventListResponse"
                }
            ],
            "frontend_components": [
                {"component_name": "EventDashboard", "route": "/events", "purpose": "Events view", "connected_apis": ["/api/v1/events"]}
            ],
            "security_considerations": ["JWT authentication", "Role-based authorization"],
            "traceability_matrix": [
                {"requirement_category": "Authentication", "target_components": ["/api/v1/auth/login"]}
            ]
        }
        mock_provider.generate.return_value = json.dumps(llm_spec_payload)

        project_id = self._create_project("Smart College Event LLM Spec Project")
        req_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements",
            json={"raw_text": "A college event management system with student and organizer roles."},
            headers=self.headers
        )
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.json()["id"]

        spec_res = self.client.post(
            f"/api/v1/projects/{project_id}/specification",
            json={"requirement_id": req_id},
            headers=self.headers
        )
        self.assertEqual(spec_res.status_code, 200, spec_res.text)
        spec_data = spec_res.json()
        self.assertEqual(spec_data["specification"]["synthesis_mode"], "llm")
        self.assertEqual(spec_data["specification"]["architecture_pattern"], "Three-tier Modular Architecture")
        mock_provider.generate.assert_called_once()

        runs_res = self.client.get(f"/api/v1/projects/{project_id}/runs", headers=self.headers)
        self.assertEqual(runs_res.status_code, 200)
        latest_run = runs_res.json()["runs"][0]
        self.assertEqual(latest_run["operation"], "specification_generation")
        self.assertEqual(latest_run["output_metadata"]["mode"], "llm")

    @patch("services.llm.get_llm_provider")
    def test_18_artifact_generation_uses_current_specification_not_generic_template(self, mock_get_provider):
        """Regression: POST /generate must produce domain-specific artifacts from the
        current persisted specification, not the old hardcoded generic template."""
        mock_provider = mock_get_provider.return_value
        mock_provider.generate.side_effect = RuntimeError("Simulated Gemini quota exhausted (429)")

        project_id = self._create_project("Smart College Event Attendance System")
        raw_text = (
            "Build a Smart College Event Attendance Management System for a college. "
            "Three user roles: Student, Organizer, Administrator. "
            "Students register for events and view attendance history. "
            "Organizers create events, upload attendance CSV files, generate attendance reports. "
            "Administrators manage users and monitor system activity. "
            "Prevent duplicate event registration and duplicate attendance records. "
            "Attendance uploads validated; invalid rows and duplicates detected. "
            "REST APIs for auth, users, events, registrations, attendance, upload, cleaning, reports. "
            "The backend must use a relational database with entities for "
            "users, events, registrations and attendance records."
        )

        req_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements",
            json={"raw_text": raw_text}, headers=self.headers
        )
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.json()["id"]

        self.assertEqual(
            self.client.post(f"/api/v1/projects/{project_id}/requirements/analyze",
                json={"requirement_id": req_id}, headers=self.headers).status_code, 200
        )
        self.assertEqual(
            self.client.post(f"/api/v1/projects/{project_id}/specification",
                json={"requirement_id": req_id}, headers=self.headers).status_code, 200
        )

        gen_res = self.client.post(f"/api/v1/projects/{project_id}/generate", headers=self.headers)
        self.assertEqual(gen_res.status_code, 200, gen_res.text)
        artifacts = gen_res.json()
        self.assertGreaterEqual(len(artifacts), 5)

        art = {a["artifact_type"]: a["content"] for a in artifacts}
        for tier in ("database", "backend", "frontend", "tests", "documentation"):
            self.assertIn(tier, art, f"Missing {tier} artifact")

        all_c = "".join(art.values())

        # Database: real domain tables, real FK columns, no generic _items, no payload JSON
        self.assertIn("users", art["database"])
        self.assertIn("events", art["database"])
        self.assertIn("registrations", art["database"])
        self.assertIn("attendances", art["database"])
        self.assertNotIn("_items", art["database"])
        self.assertNotIn("payload json", art["database"].lower())
        self.assertIn("ForeignKey", art["database"])

        # Backend: domain endpoints, no /items
        self.assertIn("/api/v1/events", art["backend"])
        self.assertIn("/register", art["backend"])
        self.assertIn("/attendance/upload", art["backend"])
        self.assertIn("/auth/login", art["backend"])
        self.assertNotIn("/items", art["backend"])

        # Frontend: role-specific components, no old generic placeholder names
        self.assertNotIn("WorkspaceDashboard", art["frontend"])
        self.assertNotIn("ResourceEditor", art["frontend"])
        self.assertNotIn("QualityInspector", art["frontend"])
        self.assertTrue(any(r in art["frontend"] for r in ("Student", "Organizer", "Admin")))


        # Global: no /items, no payload JSON across database and backend artifacts
        # (tests/docs artifacts contain these strings inside assertion code — that is correct)
        self.assertNotIn("/items", art["database"], "Database artifact contains /items")
        self.assertNotIn("/items", art["backend"], "Backend artifact contains /items")
        self.assertNotIn("payload json", art["database"].lower(), "Database artifact has payload JSON")
        self.assertNotIn("payload json", art["backend"].lower(), "Backend artifact has payload JSON")

    @patch("services.llm.get_llm_provider")
    def test_19_generate_artifacts_with_llm_429_returns_valid_created_at_and_persists(self, mock_get_provider):
        """
        Regression: POST /generate must succeed even if LLM provider returns 429 quota exhausted,
        and all returned artifacts must contain non-null id, name, artifact_type, content, and valid created_at datetime.
        Subsequent re-generation must increment versions, keep valid created_at, and clean up duplicate rows.
        """
        mock_provider = mock_get_provider.return_value
        mock_provider.generate.side_effect = RuntimeError("429 RESOURCE_EXHAUSTED: Quota exceeded")
        mock_provider.provider_name.return_value = "gemini"
        mock_provider.model_name.return_value = "gemini-2.0-flash"

        p_res = self.client.post(
            "/api/v1/projects",
            json={"name": "Event Attendance Quota 429 Project"},
            headers=self.headers
        )
        self.assertEqual(p_res.status_code, 201)
        project_id = p_res.json()["id"]

        raw_text = (
            "Build a Smart College Event Attendance Management System for a college. "
            "Three user roles: Student, Organizer, Administrator. "
            "Students register for events and view attendance history. "
            "Organizers create events, upload attendance CSV files, generate attendance reports. "
            "Administrators manage users and monitor system activity. "
            "Prevent duplicate event registration and duplicate attendance records. "
            "Attendance uploads validated; invalid rows and duplicates detected. "
            "REST APIs for auth, users, events, registrations, attendance, upload, cleaning, reports. "
            "The backend must use a relational database with entities for "
            "users, events, registrations and attendance records."
        )

        req_res = self.client.post(
            f"/api/v1/projects/{project_id}/requirements",
            json={"raw_text": raw_text}, headers=self.headers
        )
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.json()["id"]

        # Requirements analysis and spec generation
        self.assertEqual(
            self.client.post(f"/api/v1/projects/{project_id}/requirements/analyze",
                json={"requirement_id": req_id}, headers=self.headers).status_code, 200
        )
        self.assertEqual(
            self.client.post(f"/api/v1/projects/{project_id}/specification",
                json={"requirement_id": req_id}, headers=self.headers).status_code, 200
        )

        gen_res = self.client.post(f"/api/v1/projects/{project_id}/generate", headers=self.headers)

        self.assertEqual(gen_res.status_code, 200, f"Generate failed on 429 mock: {gen_res.text}")
        artifacts = gen_res.json()
        self.assertGreaterEqual(len(artifacts), 5)

        for a in artifacts:
            self.assertIsNotNone(a.get("id"), "Artifact missing id")
            self.assertTrue(len(a.get("name", "")) > 0, "Artifact missing name")
            self.assertIn(a.get("artifact_type"), ["database", "backend", "frontend", "tests", "documentation"])
            self.assertTrue(len(a.get("content", "")) > 0, "Artifact missing content")
            created_at_str = a.get("created_at")
            self.assertIsNotNone(created_at_str, f"Artifact {a['name']} created_at is None")
            from datetime import datetime
            parsed_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            self.assertIsNotNone(parsed_dt)

        # Re-run generate to test deduplication and version increment with valid created_at
        gen_res_2 = self.client.post(f"/api/v1/projects/{project_id}/generate", headers=self.headers)
        self.assertEqual(gen_res_2.status_code, 200, gen_res_2.text)
        artifacts_2 = gen_res_2.json()
        self.assertEqual(len(artifacts), len(artifacts_2))
        for a in artifacts_2:
            self.assertEqual(a["version"], 2, f"Expected version 2 for {a['name']}")
            self.assertIsNotNone(a.get("created_at"), f"Artifact {a['name']} created_at is None on v2")

    def test_20_evaluation_report_uses_owned_persisted_traceability(self):
        project_id = self._create_project("Research Evaluation Traceability")
        other_project_id = self._create_project("Other Evaluation Project")
        requirement_response = self.client.post(
            f"/api/v1/projects/{project_id}/requirements",
            json={"raw_text": "The service must validate project artifacts."},
            headers=self.headers,
        )
        self.assertEqual(requirement_response.status_code, 201, requirement_response.text)
        requirement_id = requirement_response.json()["id"]

        foreign_requirement = self.client.post(
            f"/api/v1/projects/{other_project_id}/requirements",
            json={"raw_text": "This requirement belongs to another project."},
            headers=self.headers,
        )
        self.assertEqual(foreign_requirement.status_code, 201, foreign_requirement.text)
        foreign_artifact = self.client.post(
            f"/api/v1/projects/{project_id}/artifacts",
            json={
                "artifact_type": "backend",
                "name": "foreign.py",
                "content": "pass",
                "requirement_id": foreign_requirement.json()["id"],
            },
            headers=self.headers,
        )
        self.assertEqual(foreign_artifact.status_code, 404, foreign_artifact.text)

        artifact_response = self.client.post(
            f"/api/v1/projects/{project_id}/artifacts",
            json={
                "artifact_type": "backend",
                "name": "broken.py",
                "content": "def broken(:\n    pass\n",
                "requirement_id": requirement_id,
            },
            headers=self.headers,
        )
        self.assertEqual(artifact_response.status_code, 201, artifact_response.text)
        artifact_id = artifact_response.json()["id"]

        validation_response = self.client.post(
            f"/api/v1/projects/{project_id}/validate",
            headers=self.headers,
        )
        self.assertEqual(validation_response.status_code, 200, validation_response.text)

        with SessionLocal() as db:
            validation_run = (
                db.query(ValidationRun)
                .filter_by(project_id=project_id, artifact_id=artifact_id, status="failed")
                .first()
            )
            defect = (
                db.query(Defect)
                .filter_by(project_id=project_id, artifact_id=artifact_id)
                .first()
            )
            self.assertIsNotNone(validation_run)
            self.assertIsNotNone(defect)
            self.assertEqual(defect.validation_run_id, validation_run.id)

        report_response = self.client.get(
            f"/api/v1/projects/{project_id}/evaluation",
            headers=self.headers,
        )
        self.assertEqual(report_response.status_code, 200, report_response.text)
        report = report_response.json()
        self.assertEqual(report["counts"]["requirements"], 1)
        self.assertEqual(report["counts"]["artifacts"], 1)
        self.assertEqual(report["counts"]["defects"], 1)
        self.assertEqual(report["metrics"]["requirement_artifact_traceability"]["value"], 1.0)
        self.assertEqual(report["metrics"]["artifact_validation_traceability"]["value"], 1.0)
        self.assertEqual(report["metrics"]["defect_validation_traceability"]["value"], 1.0)
        self.assertEqual(report["metrics"]["validation_check_pass_rate"]["value"], 0.0)
        self.assertEqual(report["data_scope"]["execution_mode"], "not_recorded")

        unauthorized_response = self.client.get(
            f"/api/v1/projects/{project_id}/evaluation",
        )
        self.assertEqual(unauthorized_response.status_code, 401)

        other_email = f"evaluation.viewer.{uuid.uuid4().hex[:6]}@rit.ac.in"
        other_password = "Secur3P@ssw0rd!2026"
        register_response = self.client.post(
            "/auth/register",
            json={
                "email": other_email,
                "password": other_password,
                "name": "Evaluation Viewer",
            },
        )
        self.assertIn(register_response.status_code, [200, 201], register_response.text)
        login_response = self.client.post(
            "/auth/login",
            json={"email": other_email, "password": other_password},
        )
        self.assertEqual(login_response.status_code, 200, login_response.text)
        other_headers = {
            "Authorization": "Bearer " + login_response.json()["access_token"]
        }
        forbidden_project_response = self.client.get(
            f"/api/v1/projects/{project_id}/evaluation",
            headers=other_headers,
        )
        self.assertEqual(forbidden_project_response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
