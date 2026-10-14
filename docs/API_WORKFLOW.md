# AI Engineering Workspace — API Workflow

## Authentication

All `/api/v1/` endpoints require a Bearer JWT token.

```
POST /auth/register   { email, password, name }  → { message }
POST /auth/login      { email, password }         → { access_token, token_type }
GET  /auth/me                                     → { id, email, name }
```

---

## Project Lifecycle Workflow

### Stage 1 — Project

```
POST /api/v1/projects               { name, description? }   → Project
GET  /api/v1/projects                                        → ProjectListResponse
GET  /api/v1/projects/{id}                                   → Project
PATCH /api/v1/projects/{id}         { name?, description? }  → Project
DELETE /api/v1/projects/{id}                                 → 204
```

### Stage 2 — Requirements

```
POST /api/v1/projects/{id}/requirements          { raw_text }           → Requirement
GET  /api/v1/projects/{id}/requirements                                 → Requirement[]
GET  /api/v1/projects/{id}/requirements/{req_id}                        → Requirement
POST /api/v1/projects/{id}/requirements/analyze  { requirement_id? }   → RequirementAnalyzeResponse
```

The `/analyze` call triggers `analyze_requirement_pipeline()` which:
- Calls the LLM to produce structured JSON (actors, functional_requirements, entities, etc.)
- Falls back to heuristic extraction if LLM fails
- Persists result in `Requirement.structured` (JSON)
- Creates a `GenerationRun` record

### Stage 3 — Specification

```
POST /api/v1/projects/{id}/specification   { requirement_id? }   → SpecificationResponse
GET  /api/v1/projects/{id}/specification                         → Specification (JSON)
```

Triggers `generate_specification_pipeline()`. Persists as a `documentation` artifact (`specification.json`).

### Stage 4 — Implementation Plan

```
POST /api/v1/projects/{id}/plan   { requirement_id? }   → PlanResponse
GET  /api/v1/projects/{id}/plan                         → ImplementationPlan (JSON)
```

Triggers `generate_plan_pipeline()`. Persists as a `documentation` artifact (`implementation_plan.json`).

### Stage 5 — Multi-Artifact Generation

```
POST /api/v1/projects/{id}/generate   → Artifact[]
```

Triggers `generate_artifacts_pipeline()` producing 5 tiers:

| Tier | artifact_type | Example |
|---|---|---|
| Database model | `database` | `{name}_models.py` |
| Backend router | `backend` | `{name}_routes.py` |
| Frontend component | `frontend` | `{Name}View.tsx` |
| Test suite | `tests` | `test_{name}.py` |
| Documentation | `documentation` | `{name}_architecture.md` |

### Stage 6 — Artifact CRUD

```
GET  /api/v1/projects/{id}/artifacts                → ArtifactListResponse
GET  /api/v1/projects/{id}/artifacts/{art_id}       → Artifact
POST /api/v1/projects/{id}/artifacts                → Artifact (manual creation)
PUT  /api/v1/projects/{id}/artifacts/{art_id}       → Artifact (update content/status)
```

### Stage 7 — Validation

```
POST /api/v1/projects/{id}/validate   → ValidationRunResponse
GET  /api/v1/projects/{id}/defects    → Defect[]
```

`validate_artifacts_pipeline()` runs:
1. Python AST syntax compilation (for `.py` artifacts)
2. Requirement traceability coverage (actors, functional_requirements, entities)
3. Multi-tier completeness (all 5 tier types present)

Validation checks are persisted. A check is linked to an artifact when the
validator identifies a matching artifact; detected artifact failures create
`Defect` records linked to the matching failed check when available. Validation
is static and does not establish that generated software satisfies its
requirements or runs correctly.

### Stage 8 — Repair

```
POST /api/v1/projects/{id}/repair   { defect_id }   → RepairResponse
```

Calls `repair_defect_pipeline()`, which may use LLM-assisted patch generation
or a deterministic, format-specific fallback. Repairs are recorded as
attempts. A syntax check on the proposed change does not establish semantic
correctness, and repair does not automatically create a linked post-repair
validation result.

### Stage 9 — Tests

```
POST /api/v1/projects/{id}/tests                              { name, description?, test_type, artifact_id?, requirement_id? }  → TestCase
GET  /api/v1/projects/{id}/tests                                        → TestCase[]
GET  /api/v1/projects/{id}/tests/{tc_id}                                → TestCase
GET  /api/v1/projects/{id}/tests/{tc_id}/results                        → TestResult[]
POST /api/v1/projects/{id}/tests/{tc_id}/run                            → TestExecutionResponse
GET  /api/v1/projects/{id}/test-results                                 → TestResult[]
```

#### Test Execution Status Values

| Status | Meaning |
|---|---|
| `passed` | Docker ran pytest; exit code 0 |
| `failed` | Docker ran pytest; non-zero exit |
| `timed_out` | Execution exceeded 30-second limit |
| `runner_unavailable` | Docker not installed or daemon not running |
| `execution_error` | OS/subprocess error before pytest ran |

### Stage 10 — Run History

```
GET /api/v1/projects/{id}/runs   → GenerationRunListResponse
```

Returns all `GenerationRun` records with operation, provider, model, status, timestamps, and metadata.

### Stage 11 — Persisted Evaluation Summary

```
GET /api/v1/projects/{id}/evaluation   → project-scoped counts, provenance, metrics, limitations
```

The report is read-only and owner-authorized. It summarizes persisted backend
records only; standalone browser mock state is in-memory and excluded. Rates
include their numerator and denominator, and zero-denominator metrics have a
`null` value with `insufficient_data` status. Provider metadata does not prove
that a live model response was produced. Repair success and defect detection
rates are not measurable because the backend does not persist post-repair
validation links or an independently labelled ground-truth defect set.

---

## Legacy Tool Endpoints

These endpoints remain fully functional:

```
POST /code/generate       Code generation
POST /code/explain        Code explanation (requires LLM)
POST /code/save           Save to disk
POST /code/run            Run saved file

POST /website/generate    Website HTML/CSS generation
POST /website/save        Save website files

POST /data-cleaner/clean  CSV cleaning & analysis

POST /document-generator/generate  Document generation (DOCX)
```

---

## Ownership Enforcement

Every `/api/v1/projects/{project_id}/*` endpoint verifies `project.user_id == current_user.id`. A project belonging to another user returns `404` (not `403`) to prevent user enumeration.
