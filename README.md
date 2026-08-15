# CodeOracle

CodeOracle turns an unfamiliar Python or JavaScript codebase into an understandable, reviewable modernization plan. Upload a ZIP, connect a public GitHub repository, or use the bundled demo.

**Live application:** [https://codeoracle-zker.onrender.com](https://codeoracle-zker.onrender.com)

## What works

- Simple project, module, class, and function explanations grounded in AST analysis
- Interactive dependency graph with internal/external filtering, cycles, entry points, and drill-down
- Deterministic pytest and Vitest generation with syntax validation and downloadable ZIPs
- Real source-only coverage measurement for the trusted benchmark: **73.8%**, above the required 60%
- Non-destructive Python 2 and legacy JavaScript modernization proposals
- Unified diffs, static syntax checks, and explicit breaking-change warnings
- Explainable 0-100 modernization readiness score across five engineering dimensions
- Per-file change-impact simulation with downstream blast radius, affected entry points, and tests to run
- Prioritized migration roadmap plus a downloadable executive Markdown report
- Python and JavaScript support for repositories up to 100,000 relevant source lines
- Higher-capacity ingestion: 200 MB ZIP, 500 MB extracted/clone size, 50 MB per file, and 10,000 archive entries
- Secure ZIP extraction and bounded, non-interactive public GitHub cloning

Uploaded repositories are never executed by default. Only the bundled trusted benchmark may run generated tests automatically.

## Run locally

Prerequisites: Python 3.10+, Node.js 18+, npm, and Git.

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. For a reliable offline demonstration, click **Try Demo**.

Use a repository URL in this exact form:

```text
https://github.com/rougier/numpy-100
```

Do not append `.do`; that is not part of the repository address.

## Test and build

```bash
cd backend
python -m pytest -q -p no:cacheprovider --basetemp=.pytest-run

cd ../frontend
npm run build
```

Current verification: **98 backend tests pass**, the TypeScript/Vite production build passes, and the browser-tested demo achieves **73.8% measured line coverage**.

The extended benchmark also covers a synthetic 100,000-line mixed-language project plus the real [Flask](https://github.com/pallets/flask) and [Express](https://github.com/expressjs/express) repositories. See [docs/BENCHMARKS.md](docs/BENCHMARKS.md) for reproducible results.

## Docker deployment

The multi-stage image builds the React app and serves it from FastAPI as one service.

```bash
docker build -t codeoracle .
docker run --rm -p 8000:8000 codeoracle
```

Open `http://127.0.0.1:8000`. The container respects the platform-provided `PORT` environment variable and includes the trusted demo benchmark.

For Render, Railway, or another Docker host:

1. Create a web service from this repository.
2. Select Docker deployment using the root `Dockerfile`.
3. Prefer a managed PostgreSQL database and set `DATABASE_URL`; the included `render.yaml` provisions and connects one automatically.
4. For SQLite-only hosts, attach persistent storage at `/app/data` or configure `CODEORACLE_DATA_DIR`.
5. Keep `TEST_EXECUTION_ENABLED=false` and `TEST_EXECUTION_ALLOW_UNTRUSTED=false`.
6. Use `/api/health` as the health-check path and verify `database.reachable` and `database.schema_ready`.

On first local startup, an existing `backend/codeoracle.db` is copied safely to `backend/data/codeoracle.db`. The original file is retained as a fallback. Render's free PostgreSQL tier is suitable for demos but currently expires after 30 days, so use a paid or external managed database for long-lived production data.

## 90-second judge flow

1. Click **Full Demo** and show the mixed Python/JavaScript plain-language summary and function explanations.
2. Open **Dependency Graph** and point out the internal module edge.
3. Open **Generated Tests**, click **Generate tests**, and show 73.8% measured coverage.
4. Open **Refactored Code**, click **Generate proposal**, and show the syntax-valid `xrange` to `range` diff.
5. Open **Migration Plan**, show the readiness score, and select a priority file to demonstrate its downstream blast radius.
6. Download the executive report and emphasize that uploads are statically analyzed but never executed.

## Architecture

- Backend: FastAPI, SQLAlchemy, SQLite/PostgreSQL, Python AST, deterministic JavaScript/TypeScript parsing
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Flow
- Persistence: managed PostgreSQL in the Render Blueprint, with deterministic SQLite storage and automatic legacy-file migration for local development
- Deployment: single multi-stage Docker image

API documentation is available at `/api/docs` while the server is running.
