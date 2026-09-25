# CodeOracle

CodeOracle turns an unfamiliar Python or JavaScript codebase into an understandable, reviewable modernization plan. Upload a ZIP, connect a public GitHub repository, or use the bundled demo.

**Live application:** [https://codeoracle-zker.onrender.com](https://codeoracle-zker.onrender.com)

---

## Key Features & Architecture

- **Interactive 3D Repository Topology**: Central repository node, surrounding module topology with directional dependency indicators, keyboard and hover focus inspection, and synchronized detail panel.
- **Split-Screen Authentication**: Dedicated sign-in and registration pages at `/signin` and `/register` with visual storytelling, accessible validation, password strength rules, and "Continue with Google" integration.
- **Strict Role & Ownership Isolation**:
  - **Guests**: Demo-only access to bundled benchmarks. Cannot upload ZIPs or import GitHub repositories.
  - **Authenticated Users**: Full access to upload codebases, analyze public GitHub repos, view private projects, and inspect dedicated demo benchmarks.
- **Job Completion Robustness**: Backend job status is the source of truth for analysis completion. Progress percentage alone never closes the modal; the analysis modal automatically dismisses once the job transitions to `completed` and project data is verified.
- **Unified Warm-Neutral & Indigo Palette**: Consistent design tokens across landing page, authentication screens, and analysis workspace (`#F5F1E9` canvas, `#181715` charcoal ink, `#4C4FD6` indigo primary).
- **Codebase Modernization Engine**: AST-grounded explanations, interactive dependency graphs, automated test generation, non-destructive refactoring proposals with unified diffs, and migration wave roadmaps.

---

## Application Routes

- `/`: Detailed landing page with repository composer, feature previews, scroll storytelling, interactive topology specimen, and benchmark demo launch.
- `/signin`: Split-screen sign-in panel with email/password authentication, Google Sign-In button, and demo link.
- `/register`: Split-screen registration panel with validation and Google Sign-In button.
- `/workspace`: Full analysis workspace with collapsible navigation, real-time polling, and modernization analysis tabs.
- `*`: 404 Not Found fallback with direct links back to home and workspace.

---

## Environment Configuration

CodeOracle implements a structured multi-tier environment loading strategy:

```
F:\GDG/
├── .env                # Root: shared application environment defaults
├── .env.example        # Safe template for root environment
├── backend/
│   ├── .env            # Backend: database, secret keys, OAuth secrets (server-only)
│   └── .env.example    # Safe template for backend environment
└── frontend/
    ├── .env            # Frontend: public Vite variables (browser-exposed)
    └── .env.example    # Safe template for frontend environment
```

### Precedence Rules

1. **Process Environment Variables**: System/shell environment variables have the highest precedence.
2. **Backend Configuration (`backend/.env`)**: Overrides root configuration for backend-specific settings.
3. **Root Configuration (`.env`)**: Base configuration shared across components.

### Cookie Security Policy (Local vs. Production)

CodeOracle sets `HttpOnly` and `SameSite=Lax` cookies for both session authentication (`codeoracle_session`) and OAuth CSRF state validation (`codeoracle_oauth_state`).

The `Secure` attribute is automatically environment-aware:
- **Local Development**: When running over plain HTTP (`http://localhost:5173` or `http://127.0.0.1:8000`), `secure=False` to allow cookie transmission in local browsers.
- **Production / TLS**: In production (`ENVIRONMENT=production` or `FRONTEND_URL` starting with `https://`), `secure=True` is enforced automatically.
- **Manual Override**: The `SESSION_COOKIE_SECURE` setting in `backend/.env` can explicitly enforce `true` or `false` when running behind reverse proxies (e.g., Render, Nginx, AWS ALB).

### Project Ownership & Demo Migration Policy

- **Guest Access**: Unauthenticated visitors are restricted to pre-bundled public demo benchmarks (`/api/demo/projects` and `/api/demo/benchmarks/{name}`). ZIP uploads and GitHub imports return `HTTP 401 Unauthorized`.
- **Authenticated Isolation**: Signed-in users see only their personal projects in `/api/projects`. Cross-user inspection, job polling, and downloads return `HTTP 404 Not Found`.
- **Legacy / Unowned Records Migration**: Existing project records without an assigned `user_id` remain strictly inaccessible to users unless explicitly designated as public demos (`is_public_demo=1`). To migrate legacy projects, either assign them to an authenticated user (`UPDATE projects SET user_id = 'usr_...' WHERE id = '...'`) or publish them as benchmarks (`UPDATE projects SET is_public_demo = 1 WHERE id = '...'`).

---

## Local Development & Startup

### Prerequisites

- Python 3.10+ (virtual environment located in `backend/.venv`)
- Node.js 18+ & npm

### Starting the Backend

```bash
cd backend
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`. API documentation is available at `http://127.0.0.1:8000/api/docs`.

### Starting the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`. Vite automatically proxies `/api` requests to `http://127.0.0.1:8000`.

---

## Google Sign-In Integration Guide

CodeOracle includes a complete server-side Google OAuth 2.0 flow with cryptographic CSRF state signing and verified-email checks.

### Distinction: Credentials Configured vs. Live Login Verified
- **Unconfigured**: If `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` are omitted or contain placeholders, `/api/auth/google/status` returns `{"configured": false}` and the login route returns `HTTP 503`. The UI displays a clear "Setup Pending" badge.
- **Configured**: Setting valid client ID and client secret enables the route, returning `{"configured": true}` and redirecting to Google's consent screen with HMAC-signed state.
- **Live Login Verified**: Full end-to-end authentication requires an interactive browser session with a registered Google account, matching authorized origins and redirect URIs in Google Cloud Console.

### Google Cloud Console Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Configure the OAuth consent screen (scopes: `openid`, `email`, `profile`).
3. Create an **OAuth 2.0 Client ID** (Application type: **Web application**).
4. Configure Authorized JavaScript origins:
   - Development: `http://localhost:5173`, `http://127.0.0.1:8000`
   - Production: `https://your-domain.com`
5. Configure Authorized redirect URIs:
   - Development: `http://127.0.0.1:8000/api/auth/google/callback` (or `http://localhost:8000/api/auth/google/callback`)
   - Production: `https://your-domain.com/api/auth/google/callback`
6. Add the credentials to `backend/.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
   ```
7. Restart the backend service.

---

## Testing & Verification

### Run Backend Tests (Isolated Suite)

Run the full backend test suite using the isolated SQLite in-memory test configuration:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest tests/test_auth.py tests/test_health.py tests/test_project_summary.py tests/test_guest_and_ownership_regression.py tests/test_migration_plan.py tests/test_refactor.py tests/test_ingestion.py -v
```

All 82 tests pass cleanly with 100% test isolation independent of active `.env` values.

### Run Frontend Unit Tests & Production Build

```bash
cd frontend
# Run unit tests (Neural Map + Job Poller state machine)
npm test

# Run TypeScript checks and production Vite build
npm run build
```

Build succeeds with 0 TypeScript errors and optimized production assets.

---

## Docker Deployment

The multi-stage image builds the React app and serves it from FastAPI as a single container service.

```bash
docker build -t codeoracle .
docker run --rm -p 8000:8000 codeoracle
```

Open `http://127.0.0.1:8000`. The container respects platform-provided `PORT` environment variables and includes the trusted demo benchmark.

---

## 90-Second Demo Flow

1. Click **Full Demo** from the landing page or workspace to load the mixed Python/JavaScript benchmark without requiring sign-in.
2. Inspect the **Plain-Language Summary** and function explanations.
3. Open the **Dependency Graph** to view module connections and dependency direction.
4. Open **Generated Tests** and click **Generate tests** to see syntax-valid tests and measured coverage.
5. Open **Refactored Code** and click **Generate proposal** to view syntax-checked diffs.
6. Open **Migration Plan** to view modernization readiness scores and per-file blast radius.
7. Click **Sign In** to switch to an authenticated session for custom repository analysis.
