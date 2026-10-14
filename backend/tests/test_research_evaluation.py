from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from services.research_evaluation import build_project_evaluation


def record(**values):
    return SimpleNamespace(**values)


def test_project_metrics_use_only_valid_project_scoped_links_and_outcomes():
    started = datetime(2026, 1, 1, tzinfo=timezone.utc)
    project_requirements = [
        record(id=1, project_id=7),
        record(id=2, project_id=7),
        record(id=99, project_id=8),
    ]
    project_artifacts = [
        record(id=10, project_id=7, requirement_id=1),
        record(id=11, project_id=7, requirement_id=999),
        record(id=90, project_id=8, requirement_id=99),
    ]
    project_runs = [
        record(
            id=20,
            project_id=7,
            status="completed",
            provider="deterministic_offline_parser",
            started_at=started,
            completed_at=started + timedelta(seconds=2),
        ),
        record(
            id=21,
            project_id=7,
            status="failed",
            provider="gemini",
            started_at=started,
            completed_at=None,
        ),
        record(
            id=22,
            project_id=8,
            status="completed",
            provider="ollama",
            started_at=started,
            completed_at=started,
        ),
    ]
    project_validation_runs = [
        record(id=30, project_id=7, artifact_id=10, status="passed"),
        record(id=31, project_id=7, artifact_id=None, status="warning"),
        record(id=32, project_id=8, artifact_id=90, status="passed"),
    ]
    project_defects = [
        record(id=40, project_id=7, artifact_id=10, validation_run_id=30),
        record(id=41, project_id=7, artifact_id=10, validation_run_id=None),
        record(id=43, project_id=7, artifact_id=11, validation_run_id=30),
        record(id=42, project_id=8, artifact_id=90, validation_run_id=32),
    ]
    project_test_cases = [record(id=50, project_id=7)]
    project_test_results = [
        record(test_case_id=50, verification_type="Static Verification", status="STATIC_PASS"),
        record(test_case_id=50, verification_type="Static Verification", status="STATIC_FAIL"),
        record(test_case_id=51, verification_type="Docker Runtime", status="passed"),
    ]

    report = build_project_evaluation(
        7,
        project_requirements,
        project_artifacts,
        project_runs,
        project_validation_runs,
        project_defects,
        [record(defect_id=40, status="applied")],
        project_test_cases,
        project_test_results,
    )

    assert report["counts"] == {
        "requirements": 2,
        "artifacts": 2,
        "generation_runs": 2,
        "validation_checks": 2,
        "defects": 3,
        "repair_attempts": 1,
        "test_cases": 1,
        "test_results": 2,
    }
    assert report["metrics"]["requirement_artifact_traceability"]["numerator"] == 1
    assert report["metrics"]["requirement_artifact_traceability"]["denominator"] == 2
    assert report["metrics"]["artifact_validation_traceability"]["value"] == 0.5
    assert report["metrics"]["defect_validation_traceability"]["numerator"] == 1
    assert report["metrics"]["defect_validation_traceability"]["denominator"] == 3
    assert report["metrics"]["defect_validation_traceability"]["value"] == 0.3333
    assert report["metrics"]["generation_run_completion_rate"]["value"] == 0.5
    assert report["metrics"]["validation_check_pass_rate"]["value"] == 0.5
    assert report["metrics"]["static_test_pass_rate"]["value"] == 0.5
    assert report["metrics"]["runtime_test_pass_rate"]["status"] == "insufficient_data"
    assert report["metrics"]["mean_completed_generation_duration_seconds"]["value"] == 2.0
    assert report["metrics"]["repair_success_rate"]["status"] == "not_measurable"
    assert report["data_scope"]["execution_mode"] == "not_recorded"
    assert report["data_scope"]["mock_runs_included"] is False


def test_zero_denominators_are_reported_as_insufficient_data_not_success():
    empty = build_project_evaluation(1, [], [], [], [], [], [], [], [])

    for metric_name in (
        "requirement_artifact_traceability",
        "artifact_validation_traceability",
        "defect_validation_traceability",
        "generation_run_completion_rate",
        "validation_check_pass_rate",
        "static_test_pass_rate",
        "runtime_test_pass_rate",
    ):
        metric = empty["metrics"][metric_name]
        assert metric["value"] is None
        assert metric["denominator"] == 0
        assert metric["status"] == "insufficient_data"

    assert empty["metrics"]["mean_completed_generation_duration_seconds"]["value"] is None
    assert empty["metrics"]["mean_completed_generation_duration_seconds"]["status"] == "insufficient_data"
