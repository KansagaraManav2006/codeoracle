# CodeOracle

CodeOracle turns an unfamiliar Python, JavaScript, or TypeScript codebase into an understandable, reviewable modernization plan. Upload a ZIP, connect a public GitHub repository, or explore the pre-bundled demo benchmark.

**Live application:** [https://codeoracle-l7ay.onrender.com](https://codeoracle-l7ay.onrender.com)

---

## 🚀 The Problem Being Solved
Legacy codebases and unfamiliar repositories are difficult to understand, refactor, and modernize. Developers spend hours reading disorganized code to understand dependencies, architecture, and potential refactoring paths. CodeOracle automates this initial discovery phase, providing an interactive, visual, and analytical workspace that breaks down the codebase logically without executing untrusted code.

---

## ✨ Key Features
- **Interactive Neural Graph Topology**: Force-directed semantic module and file topology with directional dependency indicators, cluster physics, and hover focus inspection.
- **Split-Screen Authentication**: Dedicated sign-in and registration pages at `/signin` and `/register` with visual storytelling, accessible validation, password strength rules, and optional "Continue with Google" OAuth 2.0.
- **Strict Role & Ownership Isolation**: Guests have demo-only access, while authenticated users have private access to custom GitHub/ZIP analysis.
- **Codebase Modernization Engine**: AST-grounded explanations, interactive dependency graphs, automated test generation, non-destructive refactoring proposals with unified diffs, and migration wave roadmaps.
- **Asynchronous Job Processing**: Robust polling mechanism handles complex ingestion and code analysis seamlessly.
- **Export Capabilities**: Download project structures as JSON, architecture as Mermaid diagrams, or migration plans as portable Markdown.

---

## 🏗️ Architecture & Technology Stack
CodeOracle is built as a unified web application with strict separation between an interactive frontend and a deterministic analytical backend.

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Flow (`@xyflow/react`), D3 Force.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic v2, Tree-sitter, pytest.
- **Database**: PostgreSQL (production via Render or Docker), SQLite (supported for local development and tests).
- **Deployment**: Render (Docker container).

### How the System Works
1. **Ingestion Methods**: Users can ingest code via ZIP upload (up to 200MB compressed / 500MB extracted), public GitHub repository URLs (shallow clone with 300s timeout), or explore pre-bundled demo benchmarks.
2. **Code Analysis Capabilities**: The Python backend parses Abstract Syntax Trees (AST for Python, Tree-sitter for JavaScript/TypeScript), extracting functions, classes, imports, and cross-file dependencies.
3. **Workspace Modules**: The parsed metadata powers 9 interactive workspace views: Overview, System Pulse, Explanation, Risk Hotspots, Dependency Graph, Neural Map, Generated Tests, Refactor Proposals, and Migration Plan.
4. **Polling/Job Architecture**: Ingestion and re-analysis are asynchronous. The frontend polls `/api/jobs/{job_id}` until a terminal state (`completed` or `failed`) is reached.
5. **Persistence**: Analysis results, job metadata, and user accounts are stored in PostgreSQL/SQLite using SQLAlchemy models.
6. **Authentication**: Database-backed opaque session tokens stored in secure, HTTP-only cookies (`codeoracle_session`), with bcrypt password hashing.

---

## 🛠️ Local Development Setup

### Option A: Docker Compose (Recommended)

#### Prerequisites
- Docker and Docker Compose (Docker Desktop on Windows/macOS)

#### Starting the Application
```bash
docker compose -f docker-compose.dev.yml up -d
```
This starts:
- **PostgreSQL 16**: `localhost:5432` (with healthcheck and persistent `pgdata` volume)
- **FastAPI Backend**: `http://localhost:8000` (with live code reloading)
- **Vite Frontend**: `http://localhost:5173` (with hot module replacement)
- **API Docs**: `http://localhost:8000/api/docs`

To stop:
```bash
docker compose -f docker-compose.dev.yml down
```

---

### Option B: Local Non-Docker Development

#### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 20+ and npm

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# Activate virtual environment:
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend will be available at `http://127.0.0.1:8000` (defaults to local SQLite database `backend/codeoracle.db`).

#### 2. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm ci
npm run dev
```
Frontend will be available at `http://localhost:5173`. API requests to `/api` are automatically proxied to `http://127.0.0.1:8000`.

---

## 🧪 Verification & Testing

### 1. Automated Testing Suite

#### Backend Tests (Pytest)
```bash
# Non-Docker (with active backend virtualenv):
pytest backend/tests/ -v

# Via Docker Compose:
docker compose -f docker-compose.dev.yml exec backend pytest tests/ -v
```

#### Frontend Unit Tests
```bash
cd frontend
npm test
```

#### TypeScript Type-Check & Lint
```bash
cd frontend
npm run lint
```

#### Frontend Production Build
```bash
cd frontend
npm run build
```

---

### 2. Production Docker Verification

To verify the unified production container locally:
```bash
# Build multi-stage image
docker build -t codeoracle .

# Run container
docker run --rm -p 8000:8000 -e ENVIRONMENT=production codeoracle

# Verify health endpoint
curl http://localhost:8000/api/health
```

Or test with PostgreSQL using the production compose layout:
```bash
docker compose up -d
```

---

## ⚙️ Environment Variables

CodeOracle uses a multi-tier environment loading strategy:
- `.env.example` (Root): Shared application defaults. Copy to `.env` as needed.
- `backend/.env.example`: Server-only settings (database URL, session secrets, Google OAuth credentials).
- `frontend/.env.example`: Client-safe variables (`VITE_*`).

Templates contain **no real secrets** and are safe for version control. Real `.env` files are gitignored.

---

## 📂 Project Structure
```text
CodeOracle/
├── backend/
│   ├── app/                 # FastAPI application and analytical engines
│   │   ├── analysis/        # AST and Tree-sitter parsers, complexity, graphs
│   │   ├── api/             # REST endpoints and authentication routes
│   │   ├── hotspots/        # Risk hotspots scoring service
│   │   ├── ingestion/       # Safe ZIP validation and shallow GitHub clone
│   │   ├── migration/       # Migration plan and wave calculator
│   │   ├── pulse/           # System pulse and repository health observatory
│   │   ├── refactor/        # Modernization proposals and verification
│   │   └── testgen/         # AST-driven test generator
│   ├── tests/               # Backend Pytest suite (160 tests)
│   ├── requirements.txt     # Python dependencies
│   ├── pyproject.toml       # Python packaging and pytest configuration
│   └── Dockerfile.dev       # Development container definition
├── frontend/
│   ├── src/
│   │   ├── components/      # React components and workspace tabs
│   │   ├── context/         # AuthContext and state providers
│   │   ├── hooks/           # Polling and simulation hooks
│   │   └── utils/           # Formatters, routing, and network helpers
│   ├── tests/               # Frontend Node.js unit tests
│   ├── package.json         # Frontend dependencies and npm scripts
│   └── vite.config.ts       # Vite build and proxy configuration
├── docs/                    # Architecture, baseline audit, and deployment specs
├── demo/                    # Pre-bundled offline benchmark repositories
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions automated CI workflow
├── Dockerfile               # Multi-stage production container build
├── docker-compose.yml       # Production-parity compose configuration
├── docker-compose.dev.yml   # Development compose configuration (Hot Reload)
└── render.yaml              # Render infrastructure specification
```

---

## 🔧 Troubleshooting Guide

### Python & Backend
- **`ModuleNotFoundError: No module named 'app'`**: Ensure your current working directory is `backend/` or your `PYTHONPATH` includes `backend/`. When running tests, run `pytest backend/tests/` from the repository root or `pytest tests/` from inside `backend/`.
- **Python Version Incompatibility**: Backend requires Python 3.10–3.12. If using Python 3.14+, some C-extensions or deprecated Starlette methods may emit warnings; use a Python 3.12 virtual environment for strict production parity.
- **Virtualenv Activation Blocked on Windows**: If PowerShell gives an execution policy error (`running scripts is disabled`), run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` before activating `.venv\Scripts\Activate.ps1`.

### Node & Frontend
- **`npm error Missing script: "typecheck"`**: Use `npm run lint` which executes `tsc --noEmit`.
- **`npm ci` Fails**: Ensure `frontend/package-lock.json` matches `package.json`. If you added new packages, run `npm install` inside `frontend/` first to update the lockfile.
- **Port 5173 Already in Use**: Specify a custom port via `npm run dev -- --port 5174` or terminate the conflicting process.

### PostgreSQL & Database
- **`connection to server at "localhost" (::1), port 5432 failed`**: Ensure your PostgreSQL service is running (`docker compose -f docker-compose.dev.yml up -d db`). In non-Docker development, backend defaults automatically to SQLite (`sqlite:///./codeoracle.db`).
- **Port 5432 Conflict**: If you have a local PostgreSQL instance already running on port 5432, change the external port mapping in `docker-compose.dev.yml` to `"5433:5432"` and update `DATABASE_URL` accordingly.

### Docker & Containerization
- **`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`**: Docker Desktop is not running. Launch the Docker Desktop application on Windows and wait until the engine status icon indicates "Engine running".
- **File Permission Errors on Linux**: If Docker volumes create files owned by `root`, ensure proper user mapping (`--user $(id -u):$(id -g)`) or check directory permissions for `workspaces/` and `temp_storage/`.
