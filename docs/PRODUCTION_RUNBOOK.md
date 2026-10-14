# CodeOracle Production Runbook

**Document Version:** 1.0.0  
**Effective Date:** October 14, 2026  
**System Classification:** Production Operational Guide

---

## 1. Production Architecture Overview

CodeOracle is packaged as a unified multi-stage container running:
- **FastAPI Backend (Uvicorn ASGI):** Port 8000 (internal), served on root/subpaths.
- **Vite SPA Frontend:** Pre-built static assets served by FastAPI static mounting with client-side SPA fallback.
- **Database Engine:** SQLite in-process (default single-node / persistent disk) or PostgreSQL (via `DATABASE_URL`).
- **Telemetry & Monitoring:** Structured JSON logs, `/api/health/*` lifecycle probes, and `/api/metrics` Prometheus text telemetry.

```
 Internet (HTTPS)
       │
       ▼
 ┌─────────────┐
 │ Render PaaS │ (SSL termination, reverse proxy, DDoS mitigation)
 └──────┬──────┘
        │ HTTP / 8000
        ▼
 ┌────────────────────────────────────────────────────────┐
 │ CodeOracle Container (appuser UID 1000)                │
 │ ┌───────────────────┐  ┌─────────────────────────────┐ │
 │ │ Structured Logger │  │ Security / Sanitizer Filter │ │
 │ └─────────┬─────────┘  └──────────────┬──────────────┘ │
 │           │                           │                │
 │ ┌─────────▼───────────────────────────▼──────────────┐ │
 │ │ FastAPI Engine (Uvicorn workers)                   │ │
 │ │  • /api/health/liveness                            │ │
 │ │  • /api/health/readiness (DB + Disk Probe)         │ │
 │ │  • /api/health/startup                             │ │
 │ │  • /api/metrics (Prometheus text)                  │ │
 │ │  • /api/health/metrics (JSON Telemetry)            │ │
 │ └─────────┬───────────────────────────┬──────────────┘ │
 │           │                           │                │
 │ ┌─────────▼─────────┐       ┌─────────▼──────────────┐ │
 │ │ SQLite / Postgres │       │ Workspace Storage      │ │
 │ │ (data/app.db)     │       │ (/tmp/codeoracle_repos)│ │
 │ └───────────────────┘       └────────────────────────┘ │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Required Production Environment Variables

| Variable Name | Required | Default / Format | Secret? | Description |
|---|---|---|---|---|
| `PORT` | Yes (Render sets automatically) | `8000` | No | Internal port for Uvicorn HTTP server |
| `ENVIRONMENT` | Yes | `production` | No | Application environment (`production`, `staging`, `development`). Activates JSON logging |
| `SECRET_KEY` | **Yes** | *None* (min 32 chars) | **YES** | Cryptographic key for session signing and auth cookies |
| `DATABASE_URL` | No | `sqlite:///./data/app.db` | Semi | Connection string for database. Use persistent disk for SQLite or managed Postgres |
| `WORKSPACE_DIR` | No | `/tmp/codeoracle_repos` | No | Filesystem directory for repository clones and ZIP unzipping |
| `CORS_ORIGINS` | No | `https://codeoracle.onrender.com` | No | Comma-separated allowed origins for CORS headers |
| `SESSION_COOKIE_SECURE` | Yes (in prod) | `true` | No | Enforces `Secure` flag on session cookies |
| `SESSION_COOKIE_SAMESITE`| No | `lax` | No | CSRF mitigation attribute (`lax` or `strict`) |
| `GOOGLE_CLIENT_ID` | Optional | `""` | No | Google OAuth 2.0 Client ID for SSO |
| `GOOGLE_CLIENT_SECRET` | Optional | `""` | **YES** | Google OAuth 2.0 Client Secret |
| `MAX_FILE_SIZE_BYTES` | No | `209715200` (200MB) | No | Maximum archive file upload limit |
| `MAX_TOTAL_LOC` | No | `100000` | No | Maximum codebase lines of code allowed for analysis |

---

## 3. Database Lifecycle & Migrations

### 3.1 Initial Schema Provisioning
Database schema initialization is idempotent. When the backend initializes (`backend/app/db/session.py`), SQLAlchemy inspects existing tables and provisions missing models (`Base.metadata.create_all(bind=engine)`):
- `users`
- `projects`
- `project_files`
- `project_analyses`
- `jobs`
- `migration_plans`
- `refactor_proposals`

### 3.2 Backup Procedure
#### SQLite (Default)
```bash
# 1. Create timestamped snapshot
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sqlite3 /app/data/app.db ".backup '/app/backups/codeoracle_${TIMESTAMP}.db'"

# 2. Verify backup integrity
sqlite3 "/app/backups/codeoracle_${TIMESTAMP}.db" "PRAGMA integrity_check;"
# Expected output: ok

# 3. Offload backup to secure cold storage (S3 / R2)
aws s3 cp "/app/backups/codeoracle_${TIMESTAMP}.db" "s3://codeoracle-backups/prod/"
```

#### PostgreSQL (Managed)
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -Fc --no-owner --no-privileges "$DATABASE_URL" > "codeoracle_${TIMESTAMP}.dump"
```

### 3.3 Restore Procedure
#### SQLite
```bash
# 1. Stop web process
docker stop codeoracle-instance

# 2. Overwrite database with verified backup
cp "/app/backups/codeoracle_VERIFIED.db" "/app/data/app.db"

# 3. Set proper ownership
chown 1000:1000 /app/data/app.db
chmod 600 /app/data/app.db

# 4. Restart container and probe readiness
docker start codeoracle-instance
curl -f http://localhost:8000/api/health/readiness
```

---

## 4. Deployment Procedures

### 4.1 Production Docker Image Build
```bash
# Clean deterministic build
docker build --no-cache -t codeoracle:production .

# Smoke test local image
docker run -d --name codeoracle-smoke \
  -e ENVIRONMENT=production \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -p 8080:8000 \
  codeoracle:production

# Verify readiness probe
curl -i http://localhost:8080/api/health/readiness
# Expected: HTTP/1.1 200 OK, {"status": "ready"}

docker rm -f codeoracle-smoke
```

### 4.2 Render PaaS Deployment
1. Navigate to Render Dashboard -> CodeOracle Service.
2. Confirm the environment configuration matches [`render.yaml`](file:///f:/CodeOracle/render.yaml):
   - Health Check Path: `/api/health/readiness`
   - Auto Deploy: Disabled for controlled releases; triggers on manual release or GitHub release tag.
3. Trigger Manual Deploy -> `Deploy latest commit`.
4. Monitor deploy logs until `readiness probe succeeded` and traffic is routed.

---

## 5. Rollback Procedures

### 5.1 Instant Container Rollback (Render)
1. In the Render Dashboard, open **Deploys**.
2. Select the last known healthy deployment commit.
3. Click **Rollback to this deploy**.
4. Render immediately updates the routing layer to point to the prior container image without downtime.

### 5.2 Local / Docker Swarm Rollback
```bash
# Point service to previous immutable tag
docker service update --image codeoracle:v1.0.4 codeoracle_stack_web
```

---

## 6. Incident Diagnosis & Triage

### 6.1 Request Tracing & Correlation IDs
Every HTTP request generates or propagates an `X-Request-ID` header.
- The `X-Request-ID` is returned in all HTTP response headers.
- All log messages produced during the request include `"request_id"`.
- If an analysis job is triggered, the log record links `"job_id"` and `"project_id"`.

To isolate an error from a user report:
```bash
grep '0d2a4f61-b...' /var/log/codeoracle.log | jq .
```

### 6.2 Standard Error Taxonomy
Logs contain a sanitized `error_category` to prevent sensitive leakage:
- `VALIDATION_ERROR`: Malformed parameters, payload too large, invalid repository URL.
- `AUTHENTICATION_ERROR`: Missing/expired session, invalid credentials.
- `AUTHORIZATION_ERROR`: Attempt to access private project owned by another user.
- `NOT_FOUND`: Project, job, or file record does not exist.
- `DATABASE_ERROR`: Connection timeout, disk write error, or query execution failure.
- `GIT_INGESTION_ERROR`: Clone failure, rate limit, timeout, or branch missing.
- `AST_PARSE_ERROR`: Tree-sitter or Python `ast` syntax error in analyzed codebase.
- `RESOURCE_EXHAUSTED`: Disk space warning, job timeout, or memory ceiling reached.

### 6.3 Health & Metrics Telemetry Endpoints
- **Liveness:** `GET /api/health/liveness`
  - Returns 200 if Python event loop and ASGI worker are healthy.
- **Readiness:** `GET /api/health/readiness`
  - Returns 200 if Database `SELECT 1` succeeds, tables are initialized, and workspace directory is writable.
  - Returns 503 if any dependency check fails.
- **Prometheus Metrics:** `GET /api/metrics`
  - Exposes standard Prometheus text metrics:
    - `codeoracle_http_requests_total`
    - `codeoracle_http_errors_total`
    - `codeoracle_http_request_duration_seconds`
    - `codeoracle_jobs_total`
    - `codeoracle_jobs_failed_total`
    - `codeoracle_job_duration_seconds`
    - `codeoracle_jobs_queued`
    - `codeoracle_db_connected`
    - `codeoracle_db_latency_seconds`
    - `codeoracle_workspace_disk_used_bytes`
- **JSON Telemetry:** `GET /api/health/metrics`
  - Machine-readable operational telemetry for synthetic monitoring probes.

---

## 7. Workspace Storage & Disk Retention

Ingested codebases (ZIP files and GitHub repositories) are cloned to `WORKSPACE_DIR` (default: `/tmp/codeoracle_repos`).

### 7.1 Automatic Job Cleanup
- Completed jobs retain parsed AST and graph data in the database.
- Cloned directories can be pruned safely after analysis completes without impacting the user experience.

### 7.2 Scheduled Pruning Cron
A background cron job or sidecar runs hourly to purge workspaces older than 24 hours:
```bash
find /tmp/codeoracle_repos -mindepth 1 -maxdepth 1 -type d -mmin +1440 -exec rm -rf {} +
```

### 7.3 Disk Exhaustion Emergency Triage
If `codeoracle_workspace_disk_used_bytes` approaches 90% disk capacity:
```bash
# Emergency purge of unreferenced temporary clones
rm -rf /tmp/codeoracle_repos/*
# Trigger readiness probe to verify writability restored
curl -f http://localhost:8000/api/health/readiness
```

---

## 8. Secret Rotation Runbook

### 8.1 `SECRET_KEY` Rotation
1. Generate new 256-bit cryptographically secure key:
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   ```
2. Update `SECRET_KEY` in Render Dashboard Environment Settings.
3. Trigger service restart.
4. *Impact:* Users will be required to log in again as existing session cookies signed by the old key will be invalidated. No database or project data is affected.

### 8.2 Google OAuth Credentials Rotation
1. Generate new Client Secret in Google Cloud Console -> APIs & Credentials.
2. Add new secret to Render environment: `GOOGLE_CLIENT_SECRET`.
3. Restart application.
4. Verify Google OAuth sign-in flow on `/signin`.
5. Revoke old Client Secret in Google Cloud Console once verified.
