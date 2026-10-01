# CodeOracle Deployment Guide

CodeOracle is designed to be deployed as a single, self-contained Docker service combining a Vite-built React frontend and a FastAPI backend, connected to a managed PostgreSQL database. The current production instance is hosted on Render.

## 1. Cloud Provider (Render)
Render is used for its seamless Docker container hosting and fully managed PostgreSQL instances.
- **Web Service**: A Docker container built from the repository's `Dockerfile`.
- **Database**: A Render managed PostgreSQL instance.

## 2. PostgreSQL & DATABASE_URL
The database must use the `psycopg2` driver to ensure compatibility with SQLAlchemy in a production environment.
- The `DATABASE_URL` environment variable is strictly formatted as:
  `postgresql+psycopg2://user:password@host/dbname`
- The application automatically handles schema creation (`Base.metadata.create_all`) on startup.

## 3. Docker Deployment
The `Dockerfile` employs a multi-stage build:
1. **Frontend Build Stage**:
   - Uses `node:20-alpine`.
   - Runs `npm install` and `npm run build`.
   - Outputs static assets to `frontend/dist`.
2. **Backend Stage**:
   - Uses `python:3.12-slim`.
   - Installs OS dependencies and Python packages via `requirements.txt`.
   - Copies the `frontend/dist` directory into the backend's static directory.
   - Starts the application using `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

## 4. Environment Variables
Production requires the following variables defined in the Render dashboard:
- `ENVIRONMENT=production`
- `DATABASE_URL` (PostgreSQL connection string)
- `SECRET_KEY` (Strong cryptographic key for session management)
- `SESSION_COOKIE_SECURE=true` (Forces secure cookies over HTTPS)
- `FRONTEND_URL=https://codeoracle-l7ay.onrender.com`
- `GOOGLE_CLIENT_ID` (Optional, for OAuth2)
- `GOOGLE_CLIENT_SECRET` (Optional, for OAuth2)

## 5. Static Asset Serving & Cache Strategy
The FastAPI backend serves the React `index.html` and static assets. A critical production fix was implemented to ensure flawless deployments:
- **`index.html`**: Must not be cached. It always references the latest Vite chunks.
  - Header: `Cache-Control: no-cache, no-store, must-revalidate`
- **Hashed Assets (`/assets/*`)**: Vite generates unique hashes for JS and CSS. These are immutable and cacheable for a year.
  - Header: `Cache-Control: public, max-age=31536000, immutable`

*Why this configuration exists*: It prevents the browser from caching a stale `index.html` that references old JavaScript chunks that no longer exist after a new deployment, effectively preventing 404 errors (like the dynamic-import Neural Map failure) while retaining the performance benefits of caching immutable assets.

## 6. Health & Verification
Deployment health can be verified via the `/api/health` endpoint.
- **URL**: `https://codeoracle-l7ay.onrender.com/api/health`
- **Expected Response**:
  ```json
  {
    "status": "ok",
    "environment": "production",
    "database": {
      "backend": "postgresql",
      "reachable": true,
      "schema_ready": true
    }
  }
  ```

## 7. Rollback Considerations
Since schema migrations are currently handled via `create_all`, structural database changes in the future will require Alembic migrations. Rollbacks currently involve redeploying the previous Docker image hash in the Render dashboard.
