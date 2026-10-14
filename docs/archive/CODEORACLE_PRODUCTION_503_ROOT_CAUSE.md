# CODEORACLE_PRODUCTION_503_ROOT_CAUSE

## Executive Summary
The CodeOracle production deployment on Render returns HTTP 503 Service Unavailable because the backend container suffers an immediate, fatal crash during Python module initialization. Render dynamically injects the PostgreSQL connection string using the legacy `postgres://` scheme. SQLAlchemy dropped support for this scheme, resulting in a `NoSuchModuleError`. Compounding this, the environment resolves to SQLAlchemy 2.1.1 which defaults to the new `psycopg` (v3) driver, but the repository only installs `psycopg2-binary`. These dual database configuration defects crash Uvicorn instantly, preventing the HTTP port from binding and causing Render's `/api/health` check to fail.

## Evidence

### 1. The Primary Crash (Render Default Scheme)
When the Docker container is started with Render's injected environment (`DATABASE_URL="postgres://user:pass@host/db"`), the application crashes immediately upon import:
```text
Traceback (most recent call last):
  ...
  File "/app/app/database.py", line 107, in <module>
    engine = create_engine(
  ...
sqlalchemy.exc.NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:postgres
```
*HTTP Status:* N/A (Port never binds; Render returns 503).

### 2. The Secondary Crash (Driver Incompatibility)
When simulating a patched URL scheme (`DATABASE_URL="postgresql://user:pass@host/db"`), the application crashes again due to missing dependencies:
```text
Traceback (most recent call last):
  ...
  File "/usr/local/lib/python3.12/site-packages/sqlalchemy/dialects/postgresql/psycopg.py", line 497, in import_dbapi
    import psycopg
ModuleNotFoundError: No module named 'psycopg'
```

### 3. Dependency Evidence
From `backend/requirements.txt`:
```text
sqlalchemy>=2.0.28
psycopg2-binary>=2.9.9
```
From `docker run --rm codeoracle-backend pip list`:
```text
psycopg2-binary        2.9.13
SQLAlchemy             2.1.1
```
*Note:* SQLAlchemy 2.1 changed the default PostgreSQL dialect from `psycopg2` to `psycopg` (v3).

## Failure Chain
1. **Render** provisions the PostgreSQL database and automatically injects `DATABASE_URL=postgres://...`.
2. **Docker** starts the container and runs `uvicorn app.main:app --host 0.0.0.0 --port 10000`.
3. **Application** imports `app.main`, which transitively imports `app.database`.
4. **Database** module executes `engine = create_engine("postgres://...")` at the global scope.
5. **SQLAlchemy** throws `NoSuchModuleError` because the `postgres` dialect plugin was removed.
6. **Uvicorn** crashes instantly and exits.
7. **Port/Health** binding never occurs; Render's probe to `/api/health` is refused.
8. **Render** marks the deployment as failed/down and serves an HTTP 503 to all external requests.

## Root Cause
The `resolve_database_url` function in `backend/app/database.py` does not sanitize Render's legacy `postgres://` prefix into a format recognized by SQLAlchemy. Furthermore, there is an explicit mismatch between the installed database driver (`psycopg2-binary`) and the default driver expected by the resolved version of SQLAlchemy (`psycopg` v3).

## Contributing Factors
- The `create_engine` call is executed synchronously at the global module level in `database.py` rather than being deferred to the FastAPI `lifespan` context manager. This transforms what should be a runtime connection error into a fatal application boot crash.
- `requirements.txt` specifies unpinned floating versions (`sqlalchemy>=2.0.28`), allowing the build to drift into breaking major/minor changes (SQLAlchemy 2.1).

## Recommended Fix
Modify `resolve_database_url` in `backend/app/database.py` to intercept Render's `postgres://` scheme and explicitly force the `psycopg2` driver:
```python
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
```
*(Alternatively, update `requirements.txt` to install `psycopg[binary]` instead of `psycopg2-binary`, and replace `postgres://` with `postgresql://`).*

## Confidence
**CONFIRMED**. The startup failure was reliably reproduced locally using the built production Docker image and matching Render environment variables.

## Release Impact
The 503 error completely prevents all access. Public website access, API routing, authentication, repository ingestion, and demo workflows are entirely **BLOCKED**. The production deployment is completely offline.

## Final Restrictions Verification
- Source files modified: 0
- Tests modified: 0
- Dependencies modified: 0
- Docker configuration modified: 0
- Render configuration modified: 0
- Database modified: 0
