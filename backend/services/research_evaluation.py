"""Honest project evaluation summaries based only on persisted backend records."""

from datetime import timezone
from typing import Any, Iterable


def _records_for_project(records: Iterable[Any], project_id: int) -> list[Any]:
    return [record for record in records if getattr(record, "project_id", None) == project_id]


def _rate(numerator: int, denominator: int) -> dict[str, Any]:
    return {
        "numerator": numerator,
        "denominator": denominator,
        "value": round(numerator / denominator, 4) if denominator else None,
        "status": "available" if denominator else "insufficient_data",
    }


def _duration_seconds(run: Any) -> float | None:
    started = getattr(run, "started_at", None)
    completed = getattr(run, "completed_at", None)
    if started is None or completed is None:
        return None
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    if completed.tzinfo is None:
        completed = completed.replace(tzinfo=timezone.utc)
    duration = (completed - started).total_seconds()
    return duration if duration >= 0 else None


def build_project_evaluation(
    project_id: int,
    requirements: Iterable[Any],
    artifacts: Iterable[Any],
    generation_runs: Iterable[Any],
    validation_runs: Iterable[Any],
    defects: Iterable[Any],
    repair_attempts: Iterable[Any],
    test_cases: Iterable[Any],
    test_results: Iterable[Any],
) -> dict[str, Any]:
    """Build counts and rates without inferring links that are absent from stored IDs."""
    requirements = _records_for_project(requirements, project_id)
    artifacts = _records_for_project(artifacts, project_id)
    generation_runs = _records_for_project(generation_runs, project_id)
    validation_runs = _records_for_project(validation_runs, project_id)
    defects = _records_for_project(defects, project_id)
    test_cases = _records_for_project(test_cases, project_id)

    requirement_ids = {requirement.id for requirement in requirements}
    artifact_ids = {artifact.id for artifact in artifacts}
    validation_ids = {run.id for run in validation_runs}
    validation_by_id = {run.id: run for run in validation_runs}
    defect_ids = {defect.id for defect in defects}
    test_case_ids = {test_case.id for test_case in test_cases}

    linked_requirements = {
        artifact.requirement_id
        for artifact in artifacts
        if artifact.requirement_id in requirement_ids
    }
    linked_artifact_validations = {
        run.artifact_id
        for run in validation_runs
        if run.artifact_id in artifact_ids
    }
    linked_defects = [
        defect
        for defect in defects
        if defect.validation_run_id in validation_ids
        and (defect.artifact_id is None or defect.artifact_id in artifact_ids)
        and validation_by_id[defect.validation_run_id].artifact_id == defect.artifact_id
    ]
    project_repairs = [
        attempt for attempt in repair_attempts if attempt.defect_id in defect_ids
    ]
    project_results = [
        result for result in test_results if result.test_case_id in test_case_ids
    ]

    static_results = [
        result for result in project_results
        if (result.verification_type or "").casefold() == "static verification"
    ]
    runtime_results = [
        result for result in project_results
        if (result.verification_type or "").casefold() == "docker runtime"
    ]
    passed_statuses = {"passed", "static_pass"}

    completed_runs = [
        run for run in generation_runs
        if (run.status or "").casefold() == "completed"
    ]
    durations = [
        duration for run in completed_runs
        if (duration := _duration_seconds(run)) is not None
    ]
    provider_counts: dict[str, int] = {}
    for run in generation_runs:
        provider = getattr(run, "provider", None) or "unknown"
        provider_counts[provider] = provider_counts.get(provider, 0) + 1

    return {
        "project_id": project_id,
        "data_scope": {
            "source": "persisted_backend_records",
            "execution_mode": "not_recorded",
            "mock_runs_included": False,
            "note": (
                "Standalone browser mock state is in-memory and is not represented "
                "in backend records. Provider metadata is reported as stored and "
                "does not by itself prove a live model response."
            ),
        },
        "counts": {
            "requirements": len(requirements),
            "artifacts": len(artifacts),
            "generation_runs": len(generation_runs),
            "validation_checks": len(validation_runs),
            "defects": len(defects),
            "repair_attempts": len(project_repairs),
            "test_cases": len(test_cases),
            "test_results": len(project_results),
        },
        "provenance": {"generation_runs_by_provider": provider_counts},
        "metrics": {
            "requirement_artifact_traceability": _rate(
                len(linked_requirements), len(requirements)
            ),
            "artifact_validation_traceability": _rate(
                len(linked_artifact_validations), len(artifacts)
            ),
            "defect_validation_traceability": _rate(
                len(linked_defects), len(defects)
            ),
            "generation_run_completion_rate": _rate(
                len(completed_runs), len(generation_runs)
            ),
            "validation_check_pass_rate": _rate(
                sum((run.status or "").casefold() == "passed" for run in validation_runs),
                len(validation_runs),
            ),
            "static_test_pass_rate": _rate(
                sum((result.status or "").casefold() in passed_statuses for result in static_results),
                len(static_results),
            ),
            "runtime_test_pass_rate": _rate(
                sum((result.status or "").casefold() == "passed" for result in runtime_results),
                len(runtime_results),
            ),
            "mean_completed_generation_duration_seconds": {
                "value": round(sum(durations) / len(durations), 3) if durations else None,
                "observations": len(durations),
                "status": "available" if durations else "insufficient_data",
            },
            "repair_success_rate": {
                "value": None,
                "numerator": None,
                "denominator": len(project_repairs),
                "status": "not_measurable",
                "reason": (
                    "Repair attempts are persisted, but the schema does not link an "
                    "attempt to a post-repair validation run or artifact version."
                ),
            },
            "defect_detection_rate": {
                "value": None,
                "numerator": None,
                "denominator": None,
                "status": "not_measurable",
                "reason": "No ground-truth defect dataset is recorded.",
            },
        },
        "limitations": [
            "Metrics summarize persisted backend records only; in-memory standalone mock results are excluded.",
            "Generation-run completion measures recorded operation status, not output quality.",
            "Requirement links are available only where artifact.requirement_id is populated.",
            "Validation traceability is counted only when validation_runs.artifact_id is populated.",
            "Static test outcomes are not runtime execution outcomes.",
            "No baseline or ground-truth defect dataset is included.",
        ],
    }
