# Development Status

> Status reflects repository capabilities, not production readiness. See
> [Research Evaluation](RESEARCH_EVALUATION.md) for the capability matrix,
> metric definitions, reproducibility protocol, and limits on claims.

## Implemented surfaces

### Backend

| Capability | Current status |
|---|---|
| JWT authentication and project ownership checks | Implemented; covered by API tests |
| Project and requirement CRUD | Implemented |
| Requirement analysis, specification, plan, and artifact generation | Implemented with provider and deterministic fallback paths |
| Artifact CRUD and requirement linking | Implemented; cross-project requirement links are rejected |
| Static validation and defect persistence | Implemented; not runtime or semantic proof |
| Repair attempts | Implemented; post-repair success is not measurable with current traceability |
| Test case/result persistence | Implemented |
| Docker test runner | Conditional; reports unavailable when Docker/image prerequisites are absent |
| Project evaluation report | Implemented as owner-scoped, read-only `GET /api/v1/projects/{project_id}/evaluation` |
| Legacy tools | Implemented for code, HTML/CSS/JavaScript website output, CSV/XLSX cleaning, and DOCX generation |

### Frontend

| Capability | Current status |
|---|---|
| Login/register and protected pages | Implemented |
| Project list and project lifecycle | Implemented |
| Standalone project mock | In-memory simulation; validation warns it was not run, test runs are marked simulated, repair does not mutate |
| Live API mode | Uses the configured backend base URL and authenticated API client |
| Legacy tools | Implemented; generated outputs still require user review |

## Verification record

Run checks in the current checkout before release and record their actual
outputs. The test counts in older project notes describe earlier revisions and
are not a substitute for running the commands below.

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest tests/ -v
Set-Location ..\frontend
npm run test
npm run lint
npm run build
Set-Location ..
git diff --check
```

No performance baseline, ground-truth defect benchmark, or automated browser
end-to-end suite is currently part of the repository. Docker runtime test
coverage depends on Docker and the runner image. Report those as unavailable
unless their prerequisites and tests have actually been exercised.

## Important limitations

- LLM-backed operations require configured credentials and may use deterministic
  fallback output. Persisted provider metadata alone does not prove a live model
  response.
- Standalone mock project data is browser-memory-only and resets on reload; its
  simulated outcomes are not backend evaluation data.
- Static validation checks syntax and coarse completeness/traceability; it does
  not prove requirements are satisfied.
- Docker test execution is conditional. Static verification is not runtime
  execution.
- Repair attempts are not linked to a post-repair artifact version and
  validation run, so repair success rate is not measurable.
- No independently labelled defect corpus exists, so defect detection rate is
  not measurable.
- Website generation produces static HTML/CSS/JavaScript, not a compiled
  React/Vue application. Published websites are publicly readable after owner
  authorization.
- Document generation supports DOCX; the data-cleaner accepts CSV/XLSX subject
  to its upload limit.
- Browser automation is not configured. Manual UI inspection is not a
  substitute for repeatable browser E2E tests.

## Local development

Backend setup and local environment variables are described in
[`backend/.env.example`](../backend/.env.example). Do not commit populated
secrets.

```powershell
Set-Location backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
Set-Location frontend
npm ci
npm run dev
```

The frontend dev server binds port 3000. Select **Standalone Engine** for an
in-memory simulation or **Live FastAPI** for the configured backend.

## Production work remaining

Production use requires, at minimum, deployment-specific secret management,
rate limiting, explicit CORS configuration, operational monitoring/auditing,
database concurrency planning, and a reviewed threat model. These are not
provided by the local-development defaults.
