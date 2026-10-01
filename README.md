# CodeOracle

CodeOracle turns an unfamiliar Python or JavaScript codebase into an understandable, reviewable modernization plan. Upload a ZIP, connect a public GitHub repository, or use the bundled demo.

**Live application:** [https://codeoracle-l7ay.onrender.com](https://codeoracle-l7ay.onrender.com)

---

## 🚀 The Problem Being Solved
Legacy codebases and unfamiliar repositories are difficult to understand, refactor, and modernize. Developers spend hours reading disorganized code to understand dependencies, architecture, and potential refactoring paths. CodeOracle automates this initial discovery phase, providing an interactive, visual, and analytical workspace that breaks down the codebase logically.

---

## ✨ Key Features
- **Interactive 3D Repository Topology**: Central repository node, surrounding module topology with directional dependency indicators, keyboard and hover focus inspection.
- **Split-Screen Authentication**: Dedicated sign-in and registration pages at `/signin` and `/register` with visual storytelling, accessible validation, password strength rules, and "Continue with Google" integration.
- **Strict Role & Ownership Isolation**: Guests have demo-only access, while authenticated users have full access to custom GitHub/ZIP analysis.
- **Codebase Modernization Engine**: AST-grounded explanations, interactive dependency graphs, automated test generation, non-destructive refactoring proposals with unified diffs, and migration wave roadmaps.
- **Asynchronous Job Processing**: Robust polling mechanism handles complex ingestion and code analysis seamlessly.
- **Export Capabilities**: Download project structures as JSON or architecture as Mermaid diagrams.

---

## 🏗️ Architecture & Technology Stack
CodeOracle is built as a unified web application with a strict separation between a fast, interactive frontend and a robust analytical backend.

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Three.js/React Three Fiber (for Neural Map), Framer Motion.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic, pytest.
- **Database**: PostgreSQL (via Render).
- **Deployment**: Render (Docker container).

### How the System Works
1. **Ingestion Methods**: Users can ingest code via ZIP upload, public GitHub repository URLs, or access pre-bundled Demo benchmarks.
2. **Code Analysis Capabilities**: The Python backend parses Abstract Syntax Trees (AST) of the ingested code, determining functions, classes, imports, and cross-file dependencies.
3. **Workspace Modules**: The parsed metadata is exposed via APIs to the React frontend, populating modules like System Pulse, Risk Hotspots, Dependency Graph, and Refactor Proposals.
4. **Polling/Job Architecture**: Ingestion and generation are asynchronous. The frontend polls a job endpoint until a terminal state (`completed` or `failed`) is reached.
5. **PostgreSQL Persistence**: Analysis results, job metadata, and user project records are stored in PostgreSQL using SQLAlchemy models.
6. **Authentication**: JWT-based session authentication with optional Google OAuth2 integration.

---

## 🛠️ Local Development Setup

### Prerequisites
- Docker and Docker Compose

### Starting the Application
The entire CodeOracle stack (Postgres, FastAPI Backend, React Frontend) runs natively via Docker Compose.

```bash
docker compose -f docker-compose.dev.yml up -d
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/api/docs`

### Environment Variables
CodeOracle uses a structured multi-tier environment loading strategy:
- `.env` (Root): Shared application environment defaults.
- `backend/.env`: Backend database, secret keys, OAuth secrets.
- `frontend/.env`: Frontend public Vite variables.

### Testing
Run backend tests inside the Docker container:
```bash
docker compose -f docker-compose.dev.yml exec backend pytest tests/ -v
```

Run frontend unit tests and production build:
```bash
cd frontend
npm test
npm run build
```

---

## 🐳 Docker Deployment
The multi-stage Dockerfile builds the React app and serves it from FastAPI as a single container service.

```bash
docker build -t codeoracle .
docker run --rm -p 8000:8000 codeoracle
```

---

## 📂 Project Structure
- `frontend/` - React frontend application (Vite, TypeScript).
- `backend/` - FastAPI backend application (Python).
- `docs/` - Architecture, deployment, and testing documentation.
- `tests/` - (Backend) Pytest suite.
- `Dockerfile` - Multi-stage Docker build for production.
- `docker-compose.yml` - Production Docker Compose layout.
- `docker-compose.dev.yml` - Development Docker Compose layout with Hot Reload.
- `render.yaml` - Render infrastructure as code configuration.

---

## ⚠️ Known Limitations
- **File Size Restrictions**: ZIP ingestion is currently limited to reasonably sized repositories to prevent memory exhaustion during AST parsing.
- **Language Support**: Deep AST parsing currently supports Python and JavaScript. Other languages provide fallback regex-based metrics.
- **Job Concurrency**: In high-traffic scenarios, synchronous AST parsing might block the main event loop if deployed without a dedicated background worker queue (like Celery).

---

## 🔮 Future Improvements
- **Background Worker Queue**: Implement Celery/Redis for true asynchronous offloading of AST parsing tasks.
- **Expanded AST Parsers**: Support TypeScript, Java, and Go natively.
- **WebSockets**: Replace HTTP polling with WebSockets for real-time progress updates.
- **LLM Integration**: Provide AI-generated summaries and intelligent refactoring insights based on the existing metadata structures.
