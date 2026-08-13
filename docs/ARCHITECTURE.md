# CodeOracle - System Architecture Specification

## 1. System Context & Overview

CodeOracle is an automated codebase inspection, documentation, test generation, and refactoring platform. The architecture emphasizes high modularity, strict separation of concerns, and security isolation for untrusted user uploads.

```
                 +-------------------------------------------------+
                 |            React + TypeScript + Vite            |
                 |      (UI Shell, React Flow, Diff Viewer)        |
                 +------------------------+------------------------+
                                          | REST API (HTTP / JSON)
                                          v
                 +-------------------------------------------------+
                 |                FastAPI Gateway                  |
                 |    (Health, Job Dispatcher, Result Routers)    |
                 +----+-------------------+-------------------+----+
                      |                   |                   |
                      v                   v                   v
           +------------------+  +------------------+  +------------------+
           | Ingestion Engine |  | Database (SQLite)|  | Job Queue Worker |
           | (ZIP / GitHub)   |  | (Jobs/Metadata)  |  | (Async Tasks)    |
           +--------+---------+  +------------------+  +--------+---------+
                    |                                           |
                    v                                           v
           +------------------+                        +------------------+
           | Secure Sandbox   |                        | Analysis Engine  |
           | Workspaces Dir   |                        | (Python ast / JS)|
           +------------------+                        +--------+---------+
                                                                |
                                             +------------------+------------------+
                                             |                                     |
                                             v                                     v
                                  +--------------------+                +--------------------+
                                  | LLM Provider Layer |                | Test & Refactoring |
                                  | (OpenAI-Compatible)|                | Engine             |
                                  +--------------------+                +--------------------+
```

## 2. Core Architectural Layers

### 2.1 Ingestion Layer (`app.ingestion`)
- **Zip Extractor (`app.ingestion.zip_ingest`)**:
  - Streamed chunk validation to prevent in-memory payload exhaustion.
  - Multi-tier Zip Slip path containment check: `Path(dest).is_relative_to(target_dir)`.
  - Rejects `../`, absolute paths, drive letters (`C:`), UNC paths, null bytes, symlinks (`S_IFLNK`), and encrypted entries.
  - Enforces thresholds: max 25MB compressed, 100MB uncompressed, 1,000 file entries, 100x compression ratio.
- **GitHub Ingestor (`app.ingestion.github_ingest`)**:
  - Non-interactive `git clone --depth 1` subprocess with argument array security (`["git", "clone", ...]`).
  - Sets `GIT_TERMINAL_PROMPT=0` to prevent interactive hangs.
  - Validates HTTPS URLs against `https://github.com/owner/repo` patterns. Rejects credentials, query strings, fragments, and non-github hostnames.
  - Enforces strict 30-second timeout.
- **Source Discovery Engine (`app.ingestion.discovery`)**:
  - Filters out ignored directories (`.git`, `node_modules`, `vendor`, `dist`, `build`, `coverage`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.venv`, `venv`, `target`).
  - Filters out minified JS (`*.min.js`), lockfiles, source maps (`*.map`), and binary files.
  - Counts text lines defensively (UTF-8 with `errors='replace'`).
  - Enforces maximum 10,000 relevant source lines limit.
  - Generates SHA-256 hashes per file and global project content hash.

### 2.2 Database Layer (`app.models.db`)
- SQLite database `codeoracle.db` managed via SQLAlchemy.
- Tables:
  - `jobs`: ID, state (`queued`, `extracting`, `analyzing`, `generating`, `completed`, `failed`), stage, progress_percentage, source_type, source_url, project_id, message, error_code, error_message, created_at, updated_at.
  - `projects`: ID, display_name, source_type, source_url, detected_languages, total_files, total_lines, content_hash, workspace_id, created_at.
  - `project_files`: ID, project_id, relative_path, language, size_bytes, line_count, sha256_hash.

### 2.3 Single Container Deployment Strategy
- Multi-stage Dockerfile:
  1. Build React SPA with Node 22 (`npm run build` -> `/frontend/dist`).
  2. Install Python 3.12 runtime and backend dependencies.
  3. Copy built frontend static assets into `/app/static`.
  4. FastAPI serves API routes under `/api/*`, static assets under `/assets`, and SPA fallback routing for client-side deep links.
