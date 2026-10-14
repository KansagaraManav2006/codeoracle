# CodeOracle Security Threat Model & Data Lifecycle Specification

> **Phase 2 Hardening**  
> **Status:** Active & Implemented  
> **Scope:** Ingestion, Storage, Authentication, Authorization, Execution Boundaries, Retention

---

## 1. Threat Matrix & Defense-in-Depth Analysis

| Domain | Primary Threats & Attack Vectors | Architectural Defense & Mitigation | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **ZIP Uploads** | Zip Slip path traversal (`../`, absolute paths), decompression bombs (zip bombs), oversized files, malicious symlinks, null-byte filenames, corrupted archives. | Streaming memory validation (checks size and magic bytes before saving); strict path containment check via `Path.is_relative_to`; entry limits (max 10,000); uncompressed size limits (max 500MB); individual file limit (max 50MB); compression ratio threshold (100:1 max); symlink / FIFO / special device rejection; transactional directory cleanup on extraction failure. | `backend/app/ingestion/zip_ingest.py`<br>`extract_zip_safely()` |
| **Public GitHub Ingestion** | Argument injection via crafted URLs, SSRF / local protocol exploitation (`file://`, `ext::`, `ssh://`), malicious recursive submodules, runaway clone execution, giant repository denial-of-service. | Strict regex matching `https://github.com/owner/repo`; credentials in URLs stripped and rejected; query strings and fragments rejected; `GIT_ALLOW_PROTOCOL=https`; `protocol.file.allow=never`; `submodule.recurse=false`; strict parameter separation (`--`); 300s subprocess execution timeout; post-clone size check (max 500MB); symlink scan; automatic target cleanup on failure. | `backend/app/ingestion/github_ingest.py`<br>`clone_github_repository()` |
| **Repository Source Storage** | Unauthorized access to user codebase files, path traversal from clients, cross-tenant file reads. | Random UUID-based workspace isolation (`workspaces/{ws_id}/raw`); strict relative path containment (`Path.is_relative_to`); absolute system paths stripped from all API outputs; user-facing project deletion permanently purges disk directory. | `backend/app/ingestion/workspace.py`<br>`get_workspace_dir()` |
| **Authentication Sessions** | Session hijacking, token leakage from database compromises, brute-force credential attacks, stale lingering sessions. | Opaque 256-bit cryptographically secure tokens (`co_...`); tokens stored **hashed at rest using SHA-256** in database; client receives raw token via `HttpOnly`, `SameSite=Lax`, `Secure` cookies; per-IP rate limiting on login/register (10–15 attempts/min); startup cleanup of expired sessions. | `backend/app/api/auth.py`<br>`create_user_session()` |
| **Project Ownership** | Insecure Direct Object References (IDOR), cross-user data leakage, unauthorized project modification/deletion. | `_get_authorized_project` enforced on all 24 project endpoints; public demo projects (`is_public_demo=1`) are read-only; private projects strictly restricted to `project.user_id == user.id`; project deletion requires authenticated ownership and explicitly rejects deleting public demos. | `backend/app/api/routes.py`<br>`_get_authorized_project()` |
| **Generated Downloads** | Malicious script delivery, ZIP slip in generated archives, cross-origin data theft. | Explicit safe test paths; no host executable binary delivery; `Content-Disposition: attachment` with sanitized alphanumeric filenames; CSRF origin and `Sec-Fetch-Site` validation. | `backend/app/api/routes.py`<br>`download_project_*()` |
| **Background Jobs** | Abandoned/stuck jobs, server restart state inconsistency, worker thread saturation. | Explicit state machine (`queued` -> `extracting` -> `analyzing` -> `generating` -> `completed`/`failed`); server lifespan recovery transitions stuck active jobs to `failed` on restart; cleanup of abandoned jobs and temporary upload archives older than 24 hours. | `backend/app/ingestion/service.py`<br>`recover_interrupted_jobs()` |
| **Resource Exhaustion** | Denial-of-service via concurrent heavy AST analysis, repetitive auth queries, massive file generation. | Per-user and per-IP sliding-window rate limiting (10 req/min for uploads, 15 req/min for analysis/generation); maximum lines of code bounded (100,000 lines); timeouts on test execution (20s). | `backend/app/api/rate_limiter.py`<br>`rate_limit()` |
| **Logs & Error Messages** | Leakage of customer proprietary source code, system paths, passwords, or session tokens in logs and traces. | Sanitized git stderr logging (removes tokens, filesystem paths, credentials); generic user-facing HTTP 500 error messages (never exposing internal tracebacks or local directory structures); AST parsers process in-memory and do not emit source lines to log streams. | `backend/app/ingestion/github_ingest.py`<br>`sanitize_git_stderr()` |

---

## 2. Rate Limiting Policy

| Action | Scope | Max Requests | Window | Keying Strategy | Breached Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| User Registration | Public | 10 | 60 seconds | `rl:ip:auth_register:<IP>` | `429 Too Many Requests` |
| User Login | Public | 15 | 60 seconds | `rl:ip:auth_login:<IP>` | `429 Too Many Requests` |
| Google OAuth Initiation | Public | 15 | 60 seconds | `rl:ip:auth_google:<IP>` | `429 Too Many Requests` |
| ZIP Archive Upload | Authenticated | 10 | 60 seconds | `rl:user:zip_upload:<UserID>` & `rl:ip:...` | `429 Too Many Requests` |
| GitHub URL Ingestion | Authenticated | 10 | 60 seconds | `rl:user:github_ingest:<UserID>` & `rl:ip:...` | `429 Too Many Requests` |
| AST Re-Analysis | Authenticated / Owner | 15 | 60 seconds | `rl:user:analyze:<UserID>` & `rl:ip:...` | `429 Too Many Requests` |
| Test Generation | Authenticated / Owner | 15 | 60 seconds | `rl:user:testgen:<UserID>` & `rl:ip:...` | `429 Too Many Requests` |
| Refactor Proposal | Authenticated / Owner | 15 | 60 seconds | `rl:user:refactor:<UserID>` & `rl:ip:...` | `429 Too Many Requests` |

---

## 3. Browser & Session Security Headers

CodeOracle attaches mandatory security headers to all HTTP responses via FastAPI middleware:
- **`Content-Security-Policy`**: `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; frame-ancestors 'none';`
- **`X-Frame-Options`**: `DENY` (prevents clickjacking)
- **`X-Content-Type-Options`**: `nosniff` (prevents MIME type sniffing)
- **`Referrer-Policy`**: `strict-origin-when-cross-origin`
- **`Permissions-Policy`**: `camera=(), microphone=(), geolocation=()`
- **`Strict-Transport-Security`**: `max-age=31536000; includeSubDomains` (enabled in production)
- **CSRF Defense**: State-changing cookie requests are blocked if `Sec-Fetch-Site: cross-site` or if the `Origin` header does not match permitted CORS origins.

---

## 4. Workspace Data Lifecycle & Retention Policy

1. **Active Storage**:
   Uploaded archives and cloned repositories reside strictly inside `workspaces/{workspace_id}/raw/`.
2. **User-Controlled Deletion**:
   Users can invoke `DELETE /api/projects/{project_id}`. This permanently removes:
   - The on-disk workspace directory (`workspaces/{workspace_id}`) via recursive unlinking.
   - Any associated temporary upload zip files in `temp_storage/`.
   - All database records across `projects`, `project_files`, `project_analyses`, `project_tests`, `project_refactors`, and `jobs`.
3. **Immutability of Public Demos**:
   Pre-bundled benchmark projects (`is_public_demo == 1`) cannot be deleted or mutated by any user or guest.
4. **Automated Pruning**:
   - Expired user sessions (`expires_at < now`) are pruned automatically on server startup.
   - Orphaned temporary upload files older than 24 hours from failed or completed jobs are purged on server startup.
