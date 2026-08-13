# CodeOracle - Implementation & Development Checklist

## Checkpoint 1: Foundation & Scaffolding (Completed & Verified)
- [x] Inspect workspace and verify zero-state environment
- [x] Create project documentation (`BUILD_SPEC.md`, `ARCHITECTURE.md`, `API_SPEC.md`, `IMPLEMENTATION_CHECKLIST.md`)
- [x] Scaffold Python FastAPI backend (`backend/app`, routes, models, database initialization)
- [x] Implement backend health check endpoint (`GET /api/health`)
- [x] Write backend unit test for health endpoint (`tests/test_health.py`)
- [x] Scaffold React + TypeScript + Vite + Tailwind CSS frontend (`frontend/src`)
- [x] Add project root metadata: `.gitignore`, `.env.example`, `README.md`
- [x] Verify backend tests pass via `pytest`
- [x] Verify frontend builds cleanly (`tsc && vite build`)

---

## Checkpoint 2: Ingestion & Static AST Analysis Engine (Completed & Verified)
- [x] Research official references and create `docs/RESEARCH_NOTES.md`
- [x] Fix FastAPI static file serving and SPA fallback routing (`/{full_path:path}`)
- [x] Replace wildcard CORS with environment-configured origins (`settings.CORS_ORIGINS`)
- [x] Replace mutable Pydantic defaults with `Field(default_factory=...)`
- [x] Safe `.zip` upload handler with Zip Slip path containment check & chunked streaming
- [x] Implement Zip Bomb mitigations (compressed/uncompressed size, entry count, compression ratio limits)
- [x] Non-interactive git clone pipeline for public GitHub repositories (`GIT_TERMINAL_PROMPT=0`, argument array)
- [x] Isolated workspace directory creation and auto-cleanup on failure (`workspaces/<workspace_id>`)
- [x] Source discovery engine (Python `.py`, JS `.js`, `.jsx`, `.mjs`, `.cjs`)
- [x] Ignore list filtering (`.git`, `node_modules`, `dist`, `build`, `venv`, `*.min.js`, lockfiles, binary files)
- [x] Defensive text line counting and SHA-256 file hashing
- [x] Enforce maximum 10,000 relevant source lines limit
- [x] Persistent SQLite database schemas (`jobs`, `projects`, `project_files`)
- [x] Interrupted job recovery on server startup (`recover_interrupted_jobs`)
- [x] REST endpoints: `POST /api/jobs/upload`, `POST /api/jobs/github`, `GET /api/jobs/{id}`, `GET /api/projects/{id}`, `GET /api/projects/{id}/files`
- [x] React frontend integration with bounded exponential backoff polling (`useJobPoller`)
- [x] Drag-and-drop ZIP upload UI with file size formatting & validation
- [x] GitHub repository URL input with inline validation
- [x] Job progress bar, stage indicator, error banner, and retry controls
- [x] Project summary stats card and discovered source file inventory table
- [x] Comprehensive backend test suite (31 tests passed cleanly)
- [x] Browser verification via Puppeteer / Browser subagent (verified 0 console errors)

---

## Checkpoint 3: Multi-Level Code Explanation Service
- [ ] OpenAI-compatible LLM Gateway implementation (`LLMProvider`)
- [ ] Prompt construction for project-, module-, class-, and function-level explanations
- [ ] Fallback static analyzer for keyless execution
- [ ] API routes for explanation retrieval (`GET /api/jobs/{job_id}/explanation`)

---

## Checkpoint 4: Unit Test Generator & Coverage Estimator
- [ ] Python `pytest` test code generator based on AST signatures
- [ ] JavaScript `Vitest` test code generator based on AST signatures
- [ ] Mock generator for external imports
- [ ] Static line coverage estimator targeting >60% coverage
- [ ] API routes for generated tests (`GET /api/jobs/{job_id}/tests`)

---

## Checkpoint 5: Modernization & Refactoring Engine
- [ ] Modernized code transformer (Python 3.12 syntax, JS ES6+ async/await)
- [ ] Breaking change detector and risk level classifier
- [ ] Diff generator (original vs refactored code)
- [ ] API routes for refactored code (`GET /api/jobs/{job_id}/refactor`)

---

## Checkpoint 6: Frontend Integration & Interactive Visualizations
- [ ] Explanation Tab UI with hierarchical markdown view
- [ ] Dependency Graph Tab UI powered by React Flow with zoom, pan, node detail modal
- [ ] Generated Tests Tab UI with code copy and language syntax highlighting
- [ ] Refactored Code Tab UI with side-by-side diff viewer and warning badges

---

## Checkpoint 7: Docker Packaging & Hackathon Demo Preparation
- [ ] Single-stage/Multi-stage Dockerfile serving Vite build from FastAPI
- [ ] Docker Compose / single container startup verification
- [ ] Final smoke testing and hackathon demo script
