# CodeOracle - Portfolio Project Summary

## Project Summary
CodeOracle is a full-stack, automated code analysis platform that turns unfamiliar Python or JavaScript codebases into interactive, reviewable modernization plans. By ingesting ZIP files or public GitHub repositories, the system parses the Abstract Syntax Tree (AST) to extract structural metadata, dependencies, and complexity metrics. It features a robust asynchronous job polling architecture, strict user isolation via JWT session authentication, and interactive 3D visualizations built with React Three Fiber. The application is containerized with Docker, backed by PostgreSQL, and deployed to production via Render.

## Technical Highlights
- **Full-Stack Architecture**: Built with React 18, TypeScript, Vite, Python 3.12, FastAPI, and PostgreSQL.
- **AST Parsing Engine**: Custom Python services that parse and evaluate source code to map dependencies and calculate risk metrics.
- **Asynchronous Job Processing**: Implements a highly resilient client-side polling state machine to handle long-running ingestion and analysis tasks without blocking the UI.
- **Secure Authentication**: Split-screen Email/Password registration (bcrypt) and Google OAuth2 integration utilizing secure, HTTP-only, SameSite cookies.
- **3D Visualization**: Leverages Three.js and React Three Fiber to render an interactive, directional Neural Map of repository dependencies.
- **Production DevOps**: Multi-stage Docker builds orchestrating a unified container deployment, featuring strict static asset caching strategies and health endpoints.
- **Testing Integrity**: Achieved 100% backend test isolation across 160 Pytest scenarios covering complex DB transactions and API workflows.

## Architecture
A decoupled SPA model where a React/Vite frontend communicates via REST with a FastAPI backend. Heavy processing (GitHub downloading, ZIP extraction, AST parsing) runs asynchronously. The backend persists deeply nested metadata to PostgreSQL. A background job system manages state transitions while the frontend safely polls until completion, subsequently rendering the data in various interactive modules.

## Engineering Challenges
- **PostgreSQL Production Configuration**: Ensuring the SQLAlchemy engine seamlessly utilized the robust `psycopg2` driver in production while maintaining local SQLite compatibility for rapid prototyping.
- **Asynchronous Job Polling**: Managing browser timeouts and UI state during intensive code analysis. Synchronous requests would timeout; the solution involved a background execution model and a robust frontend `useJobPoller` hook.
- **Vite Chunk Caching**: Deployments caused 404 errors for dynamically imported components (like the 3D Neural Map) when users had stale `index.html` files. 
- **Database Ownership Isolation**: Enforcing strict boundaries between anonymous guest demo access and authenticated user projects to ensure absolute data privacy.

## Engineering Solutions
- Refactored the database configuration to strictly enforce `postgresql+psycopg2://` formatting in production, resolving driver crashes.
- Implemented a decoupled Job system where the UI polls a lightweight endpoint `GET /api/jobs/{id}`, automatically dismissing the loading screen only when terminal states are reached.
- Solved the caching issue by configuring the FastAPI static file server to explicitly set `Cache-Control: no-cache` for the `index.html` entry point, while aggressively caching the immutable, hashed Vite JS/CSS chunks.
- Introduced strict ORM relationship boundaries and API validation checks to block unauthorized mutations or cross-user visibility.

## Production Validation
CodeOracle has completed exhaustive E2E release verification. The production environment (Render) successfully serves secure authentication, performs accurate background ingestion, handles robust PostgreSQL persistence, and delivers static assets with correct caching headers. The application is fully stable and portfolio-ready.
