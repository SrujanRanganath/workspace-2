# Research Evaluation and Demonstration Protocol

## Scope and evidence policy

The application implements a requirement-oriented project lifecycle, but the
presence of an endpoint or generated file is not evidence of software quality.
This report uses only persisted backend records for its metrics. Standalone
browser mock state is held in memory, is not sent to the backend, and is
excluded. The evaluation report does not include prompts, source contents,
emails, tokens, or credentials.

The project API exposes a read-only, owner-authorized report:

```text
GET /api/v1/projects/{project_id}/evaluation
```

It returns counts, provenance available in persisted generation-run fields,
metric numerators and denominators, and explicit limitations. A metric with a
zero denominator has a `null` value and `insufficient_data` status. Unavailable
relationships are not inferred from names, timestamps, or similar content.
Use the authenticated Swagger UI at `/docs`, or call it with a bearer token:

```powershell
curl.exe -H "Authorization: Bearer <ACCESS_TOKEN>" `
  http://127.0.0.1:8000/api/v1/projects/<PROJECT_ID>/evaluation
```

Example response excerpt (illustrative shape, not measured project results):

```json
{
  "project_id": 7,
  "counts": {
    "requirements": 2,
    "artifacts": 3,
    "generation_runs": 2,
    "validation_checks": 4,
    "defects": 1,
    "repair_attempts": 0,
    "test_cases": 0,
    "test_results": 0
  },
  "metrics": {
    "requirement_artifact_traceability": {
      "numerator": 1, "denominator": 2, "value": 0.5, "status": "available"
    },
    "runtime_test_pass_rate": {
      "numerator": 0, "denominator": 0, "value": null,
      "status": "insufficient_data"
    },
    "repair_success_rate": {
      "value": null, "numerator": null, "denominator": 0,
      "status": "not_measurable",
      "reason": "Repair attempts are persisted, but the schema does not link an attempt to a post-repair validation run or artifact version."
    }
  }
}
```

The values above demonstrate response structure only; query the authenticated
endpoint for actual persisted project results.

## Capability matrix

| Capability | Classification | Evidence and limits |
|---|---|---|
| Requirement ingestion | Implemented and verified | Project-scoped persisted requirements and input validation. |
| Requirement analysis | Implemented but not fully verified | Gemini-backed with deterministic fallback; provider outcomes depend on configuration. |
| Specification generation | Implemented but not fully verified | Persisted documentation artifact; model-backed or fallback output. |
| Plan generation | Implemented but not fully verified | Persisted documentation artifact; model-backed or fallback output. |
| Code generation | Implemented but not fully verified | Code tool supports provider/fallback behavior; generated source must be reviewed. |
| Website generation | Implemented but not fully verified | Output is HTML/CSS/JavaScript. It does not compile React or Vue projects. |
| Data cleaning | Implemented and verified | CSV/XLSX input, 10 MiB upload cap, generated cleaned file; verify domain-specific correctness before use. |
| Document generation | Implemented and verified | DOCX only; other document formats are unsupported. |
| Artifact integration | Partially implemented | Multi-tier files are persisted and project-linked; generation does not establish that the collection builds as a deployable application. |
| Static validation | Implemented but not fully verified | Project validation parses Python syntax and checks coarse completeness/traceability. It does not execute application code; completeness is not proof of requirement satisfaction. |
| Runtime validation | Implemented but not fully verified | Registered test artifacts can run in a disposable Docker container when available. Docker-unavailable paths do not execute generated tests. |
| Defect detection | Partially implemented | Static validation creates defects for detected failures; there is no ground-truth defect corpus or measured recall. |
| Repair | Partially implemented | Repair output is syntax-checked for supported formats before applying; a successful syntax check is not proof of semantic correctness or a full post-repair validation. |
| Test generation | Implemented but not fully verified | A test-artifact tier exists; generated tests require review and safe isolated execution. |
| Test execution | Implemented but not fully verified | Docker runtime results are distinguished from static verification and unavailable-runner states. |
| Authentication | Implemented and verified | JWT-protected backend routes and frontend login/register flows. |
| Authorization | Implemented and verified | Backend project/resource ownership checks and file-resource ownership controls; public published sites are intentional. |
| Artifact versioning | Implemented and verified | Content updates and regeneration increment versions; status-only artifact updates do not. |
| Publishing | Implemented but not fully verified | Authenticated owner publishes static website files; the mounted published-site path is public after publication. |
| Download | Implemented but not fully verified | Authenticated tool downloads; website tokenized download links are single-use and time-limited. |
| Research metrics | Partially implemented | Persisted-record summary endpoint; no historical baseline, ground-truth set, or standalone mock telemetry. |
| Requirement-to-artifact traceability | Partially implemented | Requirement and artifact foreign keys exist. Validation and defect links are persisted where a concrete artifact match exists; prior records may lack links. |
| Repair-to-revalidation traceability | Planned/not implemented | The schema does not identify a post-repair validation run for each attempt/version. Repair success rate is therefore unavailable. |

“Implemented and verified” here means covered by repository tests or direct
contract checks; it is not a production-readiness claim.

## Metric definitions

Each rate is reported as `numerator / denominator`, plus a decimal in `[0, 1]`.
Every eligible recorded outcome remains in its denominator, including failures,
warnings, and incomplete runs where relevant.

| Metric | Numerator | Denominator | Interpretation |
|---|---|---|---|
| Requirement-artifact traceability | Project requirements with at least one same-project artifact whose `requirement_id` matches | All project requirements | Measures explicit FK coverage, not semantic requirement satisfaction. |
| Artifact-validation traceability | Project artifacts with at least one same-project validation row linked by `artifact_id` | All project artifacts | Rows with no direct artifact FK are not credited. |
| Defect-validation traceability | Project defects linked to a same-project validation row whose `artifact_id` matches the defect's `artifact_id` (including both IDs being null) | All project defects | Measures stored links, not the correctness of defect detection. |
| Generation-run completion rate | Generation runs with `status=completed` | All persisted generation runs for the project | Completion is not output quality or successful deployment. Failed and still-running records count in the denominator. |
| Validation-check pass rate | Persisted validation checks with `status=passed` | All persisted validation checks | Warnings and failures remain in the denominator. |
| Static-test pass rate | `STATIC_PASS` or `passed` outcomes marked `Static Verification` | All outcomes marked `Static Verification` | Static inspection only; no runtime claim. |
| Runtime-test pass rate | `passed` outcomes marked `Docker Runtime` | All outcomes marked `Docker Runtime` | Only actual persisted Docker runtime test outcomes. |
| Mean completed generation duration | Sum of non-negative duration from runs with start and completion timestamps | Number of such runs | Incomplete or invalid timestamps are not represented in this statistic; observation count is provided. |
| Repair success rate | Not reported | Not reported | Attempt-to-post-repair-validation/version association is not persisted, so this metric is not measurable. |
| Defect detection rate | Not reported | Not reported | No independently labelled ground-truth defect set exists. |

Runs are counted once per persisted `GenerationRun` row; retries represented by
separate rows count as separate attempts. The current schema does not persist
the frontend adapter mode. The report therefore labels execution mode
`not_recorded`, excludes browser-only mock data, and reports provider names only
as stored metadata. A provider label alone does not prove a live model response.

## Traceability model and limitations

Existing foreign keys provide these links without schema migration:

```text
Project → Requirement → Artifact → ValidationRun → Defect → RepairAttempt
                              TestCase → TestResult
```

Validation records now attach to a named artifact when the validator supplies a
matching artifact name, and matching defects reference the failed validation
record. Manual artifact creation rejects a requirement from another project.
Generated implementation plans inherit the requirement association of their
specification artifact.

Not every historical record has these references. The evaluator reports stored
links only. `RepairAttempt` links to a defect, but does not link to the changed
artifact version or a later validation run; it cannot support a reliable repair
success metric. No migrations are used by this repository; the additions reuse
existing columns and tables.

## Baseline and reproducibility protocol

No baseline comparison or research experiment has been run as part of this
implementation. Do not report performance or quality improvement until data
has been collected.

For a future comparison, use the same frozen requirement fixture, environment,
model/provider and model version, timeout/retry policy, and output contract for
each arm. A suitable within-project comparison is:

1. **Single-pass baseline:** produce artifacts once, without repair.
2. **Iterative workflow:** produce artifacts, run the defined validator, and
   allow a predeclared repair budget.

Record every attempted workflow, including failures, mode, provider metadata,
timestamps, artifact IDs/versions, validation outcomes, test verification type,
and exclusions. Do not compare mock fixtures to live model runs. Avoid
persisting raw requirements or source code in research exports; use record IDs
or hashes only when necessary and approved. Report sample size, missing data,
retry handling, confidence intervals where warranted, and all metric
denominators. The API report is an observational summary, not a benchmark
runner, experimental dataset, or causal evaluation.

## Setup, tests, and demo path

Use Python 3.12+ and Node/npm. From the repository root, create/configure a
backend `.env` using `backend/.env.example` and safe local secrets. Never commit
the populated file. Start the backend from `backend`:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The checked-in frontend dev script binds port 3000:

```powershell
Set-Location frontend
npm ci
npm run dev
```

The UI can be demonstrated without a backend by selecting **Standalone Engine**.
Create a project and follow its requirement, specification, plan, artifact,
validation, and test tabs. Standalone outputs are simulations: validation
reports a warning that it was not run, test runs are labelled simulated, and
repair is not applied. Project state resets when the frontend page reloads.

For backend workflows, use **Live FastAPI** and an authenticated test account.
Never use a production database for tests. Run:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest tests/ -v
Set-Location ..\frontend
npm run test
npm run lint
npm run build
```

After creating a project, the owner can fetch its persisted evaluation report
with an authenticated request:

```powershell
curl.exe -H "Authorization: Bearer <ACCESS_TOKEN>" `
  http://127.0.0.1:8000/api/v1/projects/<PROJECT_ID>/evaluation
```

Replace placeholders locally; never paste tokens into documentation, logs, or
source control. Docker test execution is conditional on Docker and the runner
image being available. Without it, only the backend's explicit static test
verification path is available. Browser end-to-end verification requires
separately configured browser automation; no Playwright/Cypress project is
currently configured.
