# CodeOracle - Build Specification

## 1. Executive Summary & Goal
**CodeOracle** is an AI-powered legacy codebase analysis and modernization assistant designed for a one-day hackathon. It ingests legacy codebases (via ZIP archive or public GitHub repository link) and produces structured explanations, an interactive dependency graph, automated unit tests (targeting >60% line coverage), and modernized code with breaking-change risk alerts.

## 2. Technical Stack Specification
| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | Python 3.12, FastAPI, Pydantic v2 | High-performance async API server with explicit data schemas |
| **Database** | SQLite + SQLAlchemy (Async/Sync) | Zero-config, reliable metadata and job status storage |
| **Python Parser** | Python `ast` (Standard Library) | Fast, deterministic AST extraction for Python files |
| **JavaScript Parser** | `tree-sitter` / JS AST tooling | Reliable syntax tree parsing for ES6+ JavaScript |
| **Frontend Framework** | React 18, TypeScript, Vite | Modern, typed SPA toolchain with rapid HMR |
| **Styling & UI** | Tailwind CSS, Lucide Icons | Utility-first responsive design and consistent icons |
| **Graph Visualization**| React Flow (`@xyflow/react`) | Interactive, performant node-and-edge graph rendering |
| **LLM Gateway** | Custom Provider Abstraction | Standardized OpenAI-compatible API client (OpenAI, Anyscale, Ollama) |
| **Test Runners** | `pytest` (Python), `Vitest` (JavaScript) | Test verification engines for generated unit tests |
| **Containerization** | Multi-stage Dockerfile | Serves Vite frontend static assets via FastAPI static mount |

## 3. Scope & Constraints
- **Supported Languages**: Python (.py) and JavaScript (.js, .jsx, .mjs, .cjs).
- **Codebase Capacity**: Repositories up to **10,000 relevant lines of code (LOC)**.
- **LLM Key Independence**: Static AST analysis and dependency graph generation work **deterministically without an LLM key**. LLM key enables explanations, deep test synthesis, and refactoring recommendations.
- **Job Execution Model**: Asynchronous job queue running background tasks with granular state tracking.

## 4. Milestone Schedule
1. **Checkpoint 1 (Current)**: Architecture, docs, health API, frontend shell, project scaffolding.
2. **Checkpoint 2**: Ingestion pipeline (ZIP isolation, GitHub clone) and static analysis AST parsing engines.
3. **Checkpoint 3**: LLM provider interface and multi-level code explanation generator.
4. **Checkpoint 4**: Dependency graph node/edge transformer & React Flow interactive rendering.
5. **Checkpoint 5**: Automated unit test synthesizer (pytest/vitest target >60% coverage).
6. **Checkpoint 6**: Refactoring engine with breaking-change warnings and side-by-side diff view.
7. **Checkpoint 7**: Single Docker container packaging, end-to-end verification, and demo prep.
