# CodeOracle Testing & Verification

CodeOracle has undergone comprehensive end-to-end testing, covering core logic, asynchronous operations, frontend state management, and production behavior.

## Backend Test Suite (Pytest)
The FastAPI backend features 160 isolated tests using `pytest` and `httpx` for API testing. The tests execute in a clean PostgreSQL environment ensuring robust data handling.

### Coverage Areas
- **Authentication**: Email/password registration, secure JWT session cookies, and login lifecycle.
- **Authorization**: Strict isolation between guest users (demo only) and authenticated users (custom projects).
- **GitHub Ingestion**: Successful fetching, parsing, and failure handling of public repositories.
- **ZIP Ingestion**: Handling of valid and invalid ZIP archives, memory parsing, and AST generation.
- **Code Analysis**: Accurate mapping of variables, functions, and inter-module dependencies.
- **Polling Lifecycle**: Verification of the asynchronous job system, ensuring state transitions from `pending` -> `processing` -> `completed` (BUG-002: polling was verified to terminate after the job reaches a terminal state).
- **Workspace Data**: Retrieval of Neural Map topology, Risk Hotspots, and System Pulse metrics.
- **Generated Tests & Refactor**: Integrity of the mock data generated based on AST structures.
- **PostgreSQL Persistence**: Ensuring SQLAlchemy models correctly store and retrieve complex relationships.
- **Error Handling**: Comprehensive 400, 401, 404, and 500 error management and API formatting.

## Frontend Validation
- **Responsive UI**: Ensuring the landing page, authentication screens, and workspace render correctly on desktop and mobile viewports.
- **Accessibility**: ARIA labels, semantic HTML, and proper focus states (especially in authentication forms and the repository composer).
- **State Machine**: Testing the `useJobPoller` hook for accurate handling of asynchronous state transitions and error fallbacks.
- **Neural Map**: Production verification of the Three.js dynamic import. Note: A previous dynamic-import failure was resolved through correct production cache handling for immutable Vite chunks.

## Production E2E Verification
The current production instance has been manually verified against the following critical paths:
1. **Demo Ingestion**: Loading bundled benchmarks flawlessly.
2. **Authentication Flow**: Creating accounts, signing in, and verifying secure session cookies over HTTPS.
3. **Downloads**: Exporting JSON metadata and Mermaid architecture diagrams successfully.
4. **Health Checks**: Confirming the `/api/health` endpoint reports optimal database connectivity and schema readiness.
5. **Browser Console & Network**: Clean execution without 404/500 errors during heavy data polling.
