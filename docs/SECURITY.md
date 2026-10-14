# AI Engineering Workspace — Security Model

## Authentication & Authorization

- **JWT Bearer tokens** are required for all `/api/v1/*` and legacy tool endpoints
- Tokens are signed with `SECRET_KEY` from `.env` using HS256
- Token expiry is configurable (default 30 minutes)
- `GET /auth/me` validates token and returns user identity
- Passwords are hashed with bcrypt

### Ownership Isolation

Every project-scoped endpoint enforces `project.user_id == current_user.id`.  
Cross-user access returns `404` (not `403`) to prevent user/project enumeration.

Legacy tool downloads (`/code/*`, `/website/download`, `/website/download-html`, `/data-cleaner/download`, `/document-generator/download`) require the authenticated owner. Missing or unclaimed files are denied and are not claimed by the download request.

### Published websites (intentionally public)

`POST /website/publish` requires an authenticated user. That caller must own `site_id` before files are written. Existing unclaimed publish directories cannot be taken over.

After a successful publish, `GET /published/{site_id}/` is **public static hosting**. Anyone with the URL can read the published files. This is product behavior (shareable site URL), not an authenticated workspace download.

### Website download tokens

`POST /website/generate-download-link/{project_name}` requires the authenticated owner. It issues a 32-byte `token_urlsafe` value, scoped to that project, single-use, and valid for 60 seconds.

`GET /website/download-file/{token}/{filename}` is a **standalone bearer capability**: the token is enough to download that project's ZIP. The `{filename}` path segment is not used as a filesystem path. Invalid, reused, expired, or traversal-like tokens/filenames are rejected.

---

## Generated Code Execution

### ⚠️ Critical Security Boundary

**Generated code is untrusted.** It must NEVER be executed directly on the host system.

### Approved Execution Path

Test artifacts are executed ONLY through the Docker-isolated runner (`services/test_runner.py`):

```
Isolation controls applied:
  --network none                Network completely disabled
  --rm                          Container auto-removed after exit
  --read-only                   Root filesystem is read-only
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m
  --user 10001:10001            Non-root user
  --cap-drop ALL                All Linux capabilities dropped
  --security-opt no-new-privileges
  --pids-limit 64               Process limit
  --memory 256m --memory-swap 256m
  --cpus 0.5                    CPU throttle
  --ulimit cpu=20:20
  --ulimit nofile=64:64
  Execution timeout: 30 seconds
```

### When Docker Is Unavailable

The runner returns `status: runner_unavailable`. No fallback execution is attempted. The result is persisted honestly — no fake test results are generated.

### Prohibited Patterns

The following are **never used** in this codebase:

| Pattern | Status |
|---|---|
| `eval()` | ❌ Prohibited |
| `exec()` | ❌ Prohibited |
| `os.system()` | ❌ Prohibited |
| Unrestricted `subprocess` of generated code | ❌ Prohibited |
| Direct host execution of generated Python | ❌ Prohibited |

---

## Input Validation

- All API request bodies use **Pydantic v2 models** with field constraints
- Artifact paths validated by `_safe_artifact_path()`: no absolute paths, no `..`, no null bytes, no Windows separators — only relative POSIX `.py` paths
- SQL queries use **SQLAlchemy ORM** (parameterized) — no raw SQL string interpolation

---

## Secret Management

- `.env` contains `SECRET_KEY`, `GEMINI_API_KEY`, database credentials
- `.env` is listed in both `.gitignore` files
- `.env.example` exists with placeholder values only
- API keys are never returned in API responses
- Logs never include secret values

---

## CORS Policy

CORS origins are controlled by `CORS_ORIGINS` in `.env`.  
If unset, only local development origins (localhost/127.0.0.1 on ports 3000–3002 and 5173) are allowed. Credentials are enabled only with this explicit allow-list, never with `*`.

---

## Tool resource ownership

Ownership records live under `backend/resource_owners/<type>/<id>.owner`. New claims use `O_CREAT|O_EXCL` so the first writer wins. Missing, empty, or unreadable records deny access (fail closed). Resource IDs are casefolded so `Report.py` and `report.py` cannot be claimed by different users.

Authorization is enforced on the HTTP tool routes before files are read or overwritten. Internal Python service helpers are not a public API; callers that import them directly would bypass route checks. Do not invoke those helpers from new unauthenticated code paths.

This application creates outbound ZIP archives. It does not extract uploaded archives.

## Known Limitations

1. **SQLite in production**: Single-writer limitation. Use PostgreSQL for concurrent load.
2. **JWT revocation**: Tokens cannot be revoked before expiry (no token blacklist).
3. **Docker image pull policy**: `--pull=never` — the runner image must be pre-built. If not available, returns `runner_unavailable`.
4. **No rate limiting**: API endpoints have no rate limiting. Add nginx/API gateway in production.
5. **No audit log**: User actions are not independently audited (GenerationRun provides partial traceability).
6. **Host filesystem exposure**: The `workspace.db` SQLite file is on the host filesystem. Backup and restrict access.
7. **LLM prompt injection**: LLM prompts include user-provided requirement text. Gemini API content policies provide partial protection, but this is not a hardened boundary.
8. **Ownership locking**: The in-memory ownership lock is process-local. Concurrent claims on one host (or multiple processes sharing the same `resource_owners` directory) are serialized by `O_EXCL` file creation. Multiple app instances **without** a shared `resource_owners` filesystem are not protected and can grant the same name to different users.
9. **Corrupt ownership files**: Empty or unreadable `.owner` files deny all access, including the original owner, until an administrator removes or repairs the record. Ownership is never auto-reassigned.
10. **Windows symlink tests**: Path containment follows `Path.resolve()`. Creating symlinks for tests may require Administrator or Developer Mode; those tests skip when symlink creation is unavailable.

---

## Dependency Supply Chain

- Backend dependencies pinned in `requirements.txt`
- Docker runner image uses: `python:3.12.8-slim-bookworm` + `pytest==8.3.5`, `SQLAlchemy==2.0.36`, `pydantic==2.10.4`, `fastapi==0.115.6`
- No arbitrary `pip install` inside the runner at execution time
