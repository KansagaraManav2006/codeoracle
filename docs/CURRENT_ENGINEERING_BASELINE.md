# CodeOracle - Current Engineering Baseline

> **Date:** October 14, 2026  
> **Status:** Phase 0 Baseline Established  
> **Repository Root:** `F:\CodeOracle`  
> **Active Branch:** `Trupesh2`

---

## 1. Executive Summary

CodeOracle is an operational codebase-intelligence and modernization-planning web application. This baseline audit documents the verified engineering reality across code, tests, dependencies, deployment files, and documentation.

### Core Verified Facts
- **Frontend Health:** 18/18 frontend tests pass; TypeScript type-checking passes cleanly; production bundle builds successfully in ~3.8 seconds.
- **Backend Health:** 148/160 backend tests pass; 1 skipped; 11 failed. The 11 failures are test-fixture alignment defects caused by recent tenant isolation/authorization policies (`can_access_project`), which correctly protect private project endpoints against unauthenticated access.
- **Infrastructure Status:** Docker client is installed (v29.5.3), but the Docker Desktop daemon was not running during the audit. The repository is missing `docker-compose.yml` and `docker-compose.dev.yml` referenced by `README.md`. No GitHub Actions CI workflow exists.

---

## 2. Test & Build Execution Results

| Command | Scope | Result | Details |
| :--- | :--- | :--- | :--- |
| `npm test` (in `frontend/`) | Frontend Unit Tests | **PASS** (18/18) | Tests for Neural Map adapter, deterministic physics settling, and job polling state transitions passed in 1.89s. |
| `npm run lint` (`tsc --noEmit`) | Frontend TypeScript Check | **PASS** (0 errors) | Strict type checking passed with zero diagnostics. |
| `npm run build` (`tsc && vite build`) | Frontend Production Build | **PASS** | Successfully built to `frontend/dist/` in 3.77s. Main bundle chunk is 687 kB (warning threshold: 600 kB). |
| `pytest backend/tests/` (via `backend/.venv`) | Backend Test Suite | **PASS** (159 pass, 1 skip, 0 fail) | 160 tests collected. All 11 legacy fixture auth alignment issues resolved; 100% green suite in 22.56s. |
| `docker build` | Docker Image Build | **BLOCKED (Environment)** | Docker client is v29.5.3, but local Docker Desktop daemon is stopped (`//./pipe/dockerDesktopLinuxEngine` not found). |

---

## 3. Findings Taxonomy

### A. Product Defects
- **Test Fixture Authorization Alignment (11 Backend Failures):**
  When tenant-isolation security controls were introduced in `app.api.auth.can_access_project`, earlier test files were not updated. The endpoints return `404 Not Found` for unowned projects accessed by unauthenticated test clients.
  - Affected files: `test_analysis.py` (2), `test_graph_and_security.py` (5), `test_hotspots.py` (1), `test_refactor_verification.py` (1), `test_system_pulse.py` (2).
  - *Fix requirement:* Update test fixtures to explicitly set `is_public_demo=1` or supply an authenticated session cookie. Do not weaken `can_access_project`.

### B. Missing Project Files
- **`docker-compose.yml` & `docker-compose.dev.yml`:** Referenced in `README.md` lines 52 and 95-96 as the primary local development command, but absent from the repository root.
- **GitHub Actions CI (`.github/workflows/ci.yml`):** No automated continuous integration pipeline exists to enforce tests and linting on pull requests or commits.

### C. Documentation Defects
- **Session Authentication Mechanism:** `README.md` claims "JWT-based session authentication", but the codebase uses database-backed opaque session tokens (`UserSession` table in SQLite/PostgreSQL) with secure HTTP-only cookies.
- **Neural Map Rendering Technology:** `README.md` claims "Interactive 3D Repository Topology" with "Three.js/React Three Fiber". The actual implementation is an interactive 2D canvas with `d3-force` simulation. No `@react-three` package is installed or used.
- **Supported Languages:** `README.md` lists TypeScript under "Future Improvements: Expanded AST Parsers", but TypeScript is already discovered and parsed by Tree-sitter in `backend/app/ingestion/discovery.py` and `javascript_analyzer.py`.
- **Upload Limits & Clone Timeouts:** Documentation mentions 100MB compressed / 300MB uncompressed, whereas `backend/app/config.py` enforces 200MB compressed (`MAX_ZIP_COMPRESSED_BYTES`) and 500MB uncompressed (`MAX_ZIP_UNCOMPRESSED_BYTES`). Clone timeout is 300s in code vs 60s in older audit documents.
- **Test Suite Location:** `README.md` references root `tests/` instead of `backend/tests/`.

### D. Dependency Problems
- **`pyproject.toml` vs `requirements.txt`:** `bcrypt>=4.0.0` is present in `backend/requirements.txt` and installed in the virtualenv, but omitted from `backend/pyproject.toml` dependencies.

### E. Local Machine / Environment Conditions
- **Local Python Configuration:** System-wide Python is Python 3.14.2 at `D:\Python Files\python.exe`. Backend dependencies are installed inside the dedicated virtualenv at `F:\CodeOracle\backend\.venv`. Commands must use the virtualenv binary (`backend\.venv\Scripts\python.exe` / `backend\.venv\Scripts\pytest.exe`).
- **Docker Daemon:** Docker Desktop daemon is not currently running.

---

## 4. Architectural & System Inventory

### API Route Catalog (38 Endpoints)

#### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - User registration with bcrypt hashing
- `POST /api/auth/login` - Session creation & cookie issuance
- `GET  /api/auth/me` - Current authenticated user profile
- `POST /api/auth/logout` - Session invalidation
- `GET  /api/auth/google/status` - Checks if Google OAuth is configured
- `GET  /api/auth/google/login` - Initiates Google OAuth redirection
- `GET  /api/auth/google/callback` - OAuth authorization code callback

#### Ingestion & Job Processing (`/api/jobs`, `/api/demo`)
- `POST /api/jobs/upload` - ZIP archive upload (auth required, streaming validation)
- `POST /api/jobs/github` - Public GitHub URL ingestion (auth required, shallow clone)
- `GET  /api/jobs/{job_id}` - Polling endpoint for ingestion & reanalysis jobs
- `GET  /api/demo/projects` - Public demo benchmark listing
- `POST /api/demo/benchmarks/{benchmark_name}` - Seeds pre-bundled demo projects

#### Project Exploration & Metrics (`/api/projects`)
- `GET  /api/projects` - List accessible recent projects
- `GET  /api/projects/{project_id}` - Project metadata
- `GET  /api/projects/{project_id}/summary` - High-level project summary
- `GET  /api/projects/{project_id}/files` - File inventory with language/hash metadata
- `GET  /api/projects/{project_id}/system-pulse` - Repository Health Observatory
- `GET  /api/projects/{project_id}/hotspots` - Cyclomatic complexity & risk hotspots
- `GET  /api/projects/{project_id}/architecture` - Architecture overview

#### Analysis & Graph (`/api/projects/{project_id}`)
- `POST /api/projects/{project_id}/analyze` - Triggers background AST re-analysis
- `GET  /api/projects/{project_id}/analysis` - Cached AST analysis payload
- `GET  /api/projects/{project_id}/explanation` - Module explanation catalog
- `GET  /api/projects/{project_id}/graph` - Dependency graph with cycles & fan-in/out
- `GET  /api/projects/{project_id}/impact` - Transitive change-impact calculation

#### Safety Tests & Refactoring (`/api/projects/{project_id}`)
- `POST /api/projects/{project_id}/tests/generate` - AST-driven test generation
- `GET  /api/projects/{project_id}/tests` - Generated test suites and protection accounting
- `POST /api/projects/{project_id}/refactor` - Non-destructive modernization diff generator
- `GET  /api/projects/{project_id}/refactor` - Generated diffs and warnings
- `POST /api/projects/{project_id}/refactor/verify` - Statically/runtime verifies proposed diffs
- `GET  /api/projects/{project_id}/refactor/verify` - Verification status and test runs
- `GET  /api/projects/{project_id}/migration-plan` - Modernization readiness & wave roadmaps

#### Export & Download Endpoints
- `GET  /api/projects/{project_id}/analysis/download` - Analysis JSON export
- `GET  /api/projects/{project_id}/graph/download` - Graph JSON export
- `GET  /api/projects/{project_id}/tests/download` - Generated test files ZIP archive
- `GET  /api/projects/{project_id}/refactor/download` - Refactoring diffs ZIP archive
- `GET  /api/projects/{project_id}/migration-plan/download` - Portable Markdown migration report
- `GET  /api/projects/{project_id}/migration-plan/download-json` - Migration plan JSON

#### System Diagnostics
- `GET  /api/health` - Health status, version, database connectivity diagnostics

---

### Major Frontend Pages & Workspace Tabs
1. **Landing Page (`/`):** Hero, Capability Bento, Fact Strip, Problem/Product Reveal, Migration Roadmap, Trust/Protection, and FAQ sections.
2. **Authentication Pages:** `/signin` and `/register` with split-screen visual storytelling and password policy validation.
3. **Workspace Shell:** Persistent navigation sidebar, header, global shortcuts modal (`?`), pipeline strip, and 9 intelligence tabs:
   - `overview`: Project Details, language statistics, file inventory.
   - `pulse`: System Pulse (Repository Health Observatory).
   - `explanation`: Codebase AST-derived explanations and domain boundaries.
   - `hotspots`: Risk Hotspots and cyclomatic complexity ranking.
   - `graph`: Interactive React Flow dependency graph with cycle detection.
   - `neural-map`: 2D force-directed canvas cluster visualization.
   - `tests`: Generated unit/contract tests with protection metrics.
   - `refactor`: Modernization candidates with side-by-side diff review.
   - `migration`: Migration waves, readiness scores, and change impact blast radius.

---

### Security & Isolation Boundaries
- **Tenant Isolation:** Enforced via `can_access_project(project, user)`. Public demos (`is_public_demo=1`) are readable by all; private projects are strictly restricted to `project.user_id == user.id`. Unauthenticated users receive 404 for non-public projects.
- **Upload / Ingestion Protection:** ZIP ingestion uses streaming validation (`validate_zip_stream`) checking size and magic bytes in memory. Extraction mitigates Zip Slip (using `is_relative_to`), Zip Bombs (max 10k entries, max 500MB uncompressed, 100:1 max compression ratio), and skips symlinks.
- **Git Clone Sandbox:** HTTPS-only URL regex validation, credentials stripped, quiet non-interactive execution, 300s timeout, sanitized stderr logging.
- **Untrusted Code Execution Safety:** Test execution defaults to disabled (`TEST_EXECUTION_ENABLED=False`). Uploaded user code is never executed without explicit isolation.

---

## 5. Risk Assessment

| Risk Area | Severity | Description | Mitigation Strategy |
| :--- | :---: | :--- | :--- |
| **Test Fixture Regression** | **High** | 11 backend test failures break automated verification and mask real regressions. | Align test fixtures with auth models by setting `is_public_demo=1` or user context. |
| **Missing Docker Compose** | **Medium** | New developers or automated pipelines cannot spin up the stack via the documented commands. | Provide standard `docker-compose.yml` and `docker-compose.dev.yml` files. |
| **Missing CI Pipeline** | **Medium** | No GitHub Actions workflow runs tests on PRs, risking silent breakage. | Add `.github/workflows/ci.yml` running pytest and npm test/lint. |
| **Frontend Monoliths** | **Medium** | 4 tab components exceed 1,400–2,000 lines, slowing developer velocity. | Incrementally split UI panels and modals into subcomponents in Phase 2. |
| **Default Secret Key** | **Medium** | Default `SECRET_KEY` is insecure if deployed without environment overrides. | Enforce startup assertion or warning if `ENVIRONMENT=production` has default secret. |

---

## 6. Prioritized Engineering Backlog

### P0: Release Blockers & Security Alignment
- [ ] **Fix 11 Backend Test Fixtures:** Update `test_analysis.py`, `test_graph_and_security.py`, `test_hotspots.py`, `test_refactor_verification.py`, and `test_system_pulse.py` to create test projects as public demos (`is_public_demo=1`) or test user sessions so all 160 backend tests pass.
- [ ] **Production Secret Validation:** Add check in `backend/app/main.py` lifespan warning against default development `SECRET_KEY` in production.

### P1: Correctness, Infrastructure & Reproducibility
- [ ] **Create `docker-compose.yml` and `docker-compose.dev.yml`:** Provide working multi-container definitions (PostgreSQL, FastAPI backend, React frontend) with hot-reloading for development.
- [ ] **Create GitHub Actions CI (`.github/workflows/ci.yml`):** Automate backend pytest (160 tests), frontend test (18 tests), TypeScript type-checking, and build validation.
- [ ] **Synchronize Dependencies:** Add `bcrypt>=4.0.0` to `backend/pyproject.toml`.

### P2: Performance & Maintainability
- [ ] **Frontend Bundle Optimization:** Implement dynamic imports (`React.lazy`) for heavy workspace tabs (`DependencyGraphTab`, `NeuralMapPage`, `ExplanationTab`) to bring the main bundle below 600 kB.
- [ ] **Modularize Monolithic Files:** Break down `ExplanationTab.tsx` (~2,000 lines), `DependencyGraphTab.tsx` (~2,000 lines), and `backend/app/api/routes.py` (~1,446 lines) into cohesive submodules.

### P3: Documentation & Claim Reconciliation
- [ ] **Reconcile `README.md` & `docs/API_SPEC.md`:** Correct claims regarding JWT (replace with session cookies), 3D Three.js (replace with 2D Canvas), upload limits (200MB/500MB), clone timeout (300s), and test command paths.

---

## 7. Recommended Exact Scope for Phase 1

**Phase 1 Goal: 100% Green Test Suite & Infrastructure Reproducibility**
1. Fix the 11 failing backend tests by aligning test fixtures with the project authorization model without weakening `can_access_project` security rules.
2. Verify all 160 backend tests pass alongside the 18 frontend tests and TypeScript checks.
3. Add `bcrypt>=4.0.0` to `backend/pyproject.toml`.
4. Create `docker-compose.yml` and `docker-compose.dev.yml` matching the documented developer workflow.
5. Add `.github/workflows/ci.yml` to guarantee reproducible validation in CI.
