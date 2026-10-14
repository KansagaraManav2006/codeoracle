# CodeOracle — Complete System Architecture & Exhaustive Context Guide

> **Document Version:** 2.0.0  
> **Target Audience:** Core Engineers, Architects, System Administrators, and AI Pair Programmers  
> **Repository:** [CodeOracle](file:///f:/CodeOracle)  
> **Last Verified:** October 2026  

---

## Table of Contents
1. [Executive Summary & System Purpose](#1-executive-summary--system-purpose)
2. [End-to-End System Architecture Blueprint](#2-end-to-end-system-architecture-blueprint)
3. [Database Architecture & Persistence Layer](#3-database-architecture--persistence-layer)
4. [Backend Architecture & Engine Subsystems](#4-backend-architecture--engine-subsystems)
5. [Frontend Architecture & Design System](#5-frontend-architecture--design-system)
6. [Exhaustive Page-by-Page & Tab-by-Tab Breakdown](#6-exhaustive-page-by-page--tab-by-tab-breakdown)
   - 6.1 [Landing Page & Ingestion Experience](#61-landing-page--ingestion-experience)
   - 6.2 [Job Ingestion & Analysis Progress Modal](#62-job-ingestion--analysis-progress-modal)
   - 6.3 [Project Overview Tab (`overview`)](#63-project-overview-tab-overview)
   - 6.4 [System Pulse Tab (`pulse`) — Observatory](#64-system-pulse-tab-pulse--observatory)
   - 6.5 [Code Intelligence & Explanation Tab (`explanation`)](#65-code-intelligence--explanation-tab-explanation)
   - 6.6 [Hotspots & Technical Debt Tab (`hotspots`)](#66-hotspots--technical-debt-tab-hotspots)
   - 6.7 [Interactive Architecture & Dependency Graph Tab (`graph`)](#67-interactive-architecture--dependency-graph-tab-graph)
   - 6.8 [Neural Map Canvas Experience (`neural-map`)](#68-neural-map-canvas-experience-neural-map)
   - 6.9 [Generated Tests Tab (`tests`) — Safety Harness](#69-generated-tests-tab-tests--safety-harness)
   - 6.10 [Refactored Code Tab (`refactor`) — Modernization Engine](#610-refactored-code-tab-refactor--modernization-engine)
   - 6.11 [Migration Plan Tab (`migration`) — Wave Roadmap](#611-migration-plan-tab-migration--wave-roadmap)
   - 6.12 [Global Utility Modals & Inter-tab Workflows](#612-global-utility-modals--inter-tab-workflows)
7. [Comprehensive REST API Reference](#7-comprehensive-rest-api-reference)
8. [End-to-End Data & Execution Lifecycles](#8-end-to-end-data--execution-lifecycles)
9. [Configuration, Environment & Deployment](#9-configuration-environment--deployment)
10. [Summary Matrix of All 9 Workspace Tabs](#10-summary-matrix-of-all-9-workspace-tabs)

---

## 1. Executive Summary & System Purpose

**CodeOracle** is an autonomous enterprise platform engineered to de-risk and accelerate legacy codebase comprehension, stabilization, modernization, and migration. Large enterprise systems written in legacy Python, JavaScript, TypeScript, and hybrid multi-tier stacks frequently suffer from lost institutional knowledge, tangled circular dependencies, absent test suites, and high fear of refactoring.

CodeOracle resolves these challenges via a multi-tiered pipeline:
1. **Zero-Setup Ingestion**: Accepts raw `.zip` archives, public/private GitHub repositories, or pre-configured benchmarks into sandboxed workspaces.
2. **Deep Static Analysis & AST Parsing**: Employs Python `ast` and Tree-sitter parsers to extract syntax trees, symbols, cyclomatic complexity, cognitive load, and module-level import graphs.
3. **Repository Health Observatory (System Pulse)**: Synthesizes five dimensional scores (Parsing, Dependencies, Complexity, Protection, Modernization) across five canonical subsystems (Frontend, Backend, ML, Database, Infrastructure).
4. **Safety Harness Generation**: Automatically generates runnable unit tests (`pytest` and `Jest`/`Node:test`) with AST-extracted fixtures and mock configurations, ensuring a safety net before any modification.
5. **Deterministic Refactoring & Modernization**: Applies AST-safe migration rules (e.g., Python 2 `xrange`/`iteritems`/print-to-function, JavaScript `var`-to-`const`/`let`, callback-to-async/await) alongside intelligent LLM explanations.
6. **Shadow Sandbox Verification**: Automatically forks modified files into an isolated sandbox, re-runs static analysis, executes generated test suites, and measures before/after health deltas.
7. **Wave-Based Migration Planning**: Computes topological dependency waves (leaf utilities up to entrypoint orchestrators) and visualizes the blast radius of proposed edits.

---

## 2. End-to-End System Architecture Blueprint

```mermaid
flowchart TB
    subgraph Client ["Frontend: React 18 + TypeScript + Vite + Tailwind CSS"]
        UI_Landing["Landing Page / Demo Loader"]
        UI_ContextBar["ProjectContextBar & URL State Sync"]
        subgraph Tabs ["Workspace Tabs"]
            Tab_Overview["Project Overview (Tab 1)"]
            Tab_Pulse["System Pulse Observatory (Tab 2)"]
            Tab_Explain["AI Code Explanation (Tab 3)"]
            Tab_Hotspots["Hotspots & Risk Matrix (Tab 4)"]
            Tab_Graph["Dependency Graph (Tab 5)"]
            Tab_Neural["Neural Map Canvas (Tab 6)"]
            Tab_Tests["Generated Tests (Tab 7)"]
            Tab_Refactor["Refactored Code (Tab 8)"]
            Tab_Migration["Migration Waves (Tab 9)"]
        end
        Modals["Modals: ChangeImpact, Shortcuts, ReadinessFormula"]
    end

    subgraph Server ["Backend: FastAPI (Python 3.11+)"]
        API_Router["REST API Router (/api/...)"]
        Job_Poller["Job Queue & Status Poller"]
        
        subgraph Subsystems ["Engine Subsystems"]
            Eng_Ingest["Ingestion Engine\n(Zip, GitHub, Workspaces)"]
            Eng_Analysis["Static Analysis Engine\n(AST, Tree-Sitter, Complexity)"]
            Eng_Graph["Dependency & Architecture Engine\n(Topological Sort, Cycles)"]
            Eng_Pulse["System Pulse Engine\n(5 Dimensions, 5 Subsystems)"]
            Eng_Hotspots["Hotspots & Technical Debt Engine\n(God Objects, Churn)"]
            Eng_TestGen["Test Generation & Runner Sandbox\n(pytest, Node test runner)"]
            Eng_Refactor["Refactor Engine & AST Modders\n(Modernization Rules)"]
            Eng_Verify["Shadow Verification Engine\n(Re-analysis, Regression Tests)"]
            Eng_Migration["Migration Wave Engine\n(Blast Radius, Ripple Impact)"]
        end
    end

    subgraph Storage ["Persistence & Filesystem"]
        DB[(SQLAlchemy ORM: SQLite / PostgreSQL)]
        Disk_Workspaces["Local File Workspaces\n(/workspaces/{workspace_id})"]
        Disk_Data["Data Storage & Cached JSON\n(/data/codeoracle.db)"]
    end

    UI_Landing -->|Upload Zip / GitHub URL| API_Router
    API_Router --> Job_Poller
    Job_Poller --> Eng_Ingest
    Eng_Ingest --> Disk_Workspaces
    Eng_Ingest --> Eng_Analysis
    Eng_Analysis --> DB
    Eng_Analysis --> Eng_Graph
    Eng_Graph --> Eng_Pulse
    Eng_Graph --> Eng_Hotspots
    Eng_Analysis --> Eng_TestGen
    Eng_TestGen --> DB
    Eng_TestGen --> Eng_Refactor
    Eng_Refactor --> Eng_Verify
    Eng_Verify --> Eng_Migration
    Eng_Migration --> DB

    Tabs -->|Query API Endpoints| API_Router
    API_Router -->|Fetch Cached Analysis/Tests/Refactors| DB
    API_Router -->|Read Workspace Source Files| Disk_Workspaces
```

---

## 3. Database Architecture & Persistence Layer

The database layer is managed by **SQLAlchemy 2.0** with explicit typing via `Mapped[...]` and `mapped_column[...]`. It is configured in [`backend/app/database.py`](file:///f:/CodeOracle/backend/app/database.py) and defined in [`backend/app/models/db.py`](file:///f:/CodeOracle/backend/app/models/db.py).

### 3.1 Database Engine & Resolution
- **Multi-Engine Compatibility**: Defaults to file-backed **SQLite** (`sqlite:///./data/codeoracle.db`), and transparently supports **PostgreSQL** or **MySQL** when configured via `DATABASE_URL`.
- **Absolute Path Resolution**: The `resolve_database_url()` helper resolves paths relative to the platform data directory (`CODEORACLE_DATA_DIR` or `/app/data` in Docker), preventing SQLite locking across different process current working directories.
- **SQLite Performance PRAGMAs**: On connection, SQLite enables `PRAGMA foreign_keys=ON`, `PRAGMA journal_mode=DELETE`, and `PRAGMA synchronous=NORMAL`.
- **Schema Compatibility Hook**: `ensure_schema_compatibility()` executes additive DDL automatically (e.g. adding `is_trusted` flag to legacy projects).

### 3.2 Relational Entity Schema

```mermaid
erDiagram
    PROJECT ||--o{ JOB : tracks
    PROJECT ||--o{ PROJECT_FILE : contains
    PROJECT ||--o{ PROJECT_ANALYSIS_RECORD : caches
    PROJECT ||--o{ PROJECT_TEST_RECORD : generates
    PROJECT ||--o{ PROJECT_REFACTOR_RECORD : produces

    JOB {
        string id PK
        string state
        string stage
        int progress_percentage
        string source_type
        string source_url
        string project_id FK
        string message
        string error_code
        text error_message
        datetime created_at
        datetime updated_at
    }

    PROJECT {
        string id PK
        string display_name
        string source_type
        string source_url
        json detected_languages
        int total_files
        int total_lines
        string content_hash
        string workspace_id
        int is_trusted
        datetime created_at
    }

    PROJECT_FILE {
        string id PK
        string project_id FK
        string relative_path
        string language
        int size_bytes
        int line_count
        string sha256_hash
    }

    PROJECT_ANALYSIS_RECORD {
        string id PK
        string project_id FK
        string analyzer_version
        string content_hash
        json analysis_data
        datetime created_at
    }

    PROJECT_TEST_RECORD {
        string id PK
        string project_id FK
        string generator_version
        string content_hash
        json test_data
        datetime created_at
    }

    PROJECT_REFACTOR_RECORD {
        string id PK
        string project_id FK
        string engine_version
        string content_hash
        json refactor_data
        datetime created_at
    }
```

#### Detailed Column Catalog
1. **`jobs`**:
   - `id` (String 64, PK): UUID of the background task.
   - `state` (Enum String): State machine (`queued` -> `extracting` -> `analyzing` -> `generating` -> `completed` / `failed`).
   - `stage` (String 64): User-facing text describing active sub-step (e.g., "Parsing ASTs", "Constructing dependency graph").
   - `progress_percentage` (Integer): `0` to `100` progress bar value.
   - `source_type` (String 32): `'zip'`, `'github'`, or `'demo_benchmark'`.
   - `source_url` (String 512, Nullable): GitHub repo URL or uploaded zip source.
   - `project_id` (String 64, Nullable, Index): Associated project upon completion.
   - `message` / `error_code` / `error_message`: Diagnostic failure logs.
2. **`projects`**:
   - `id` (String 64, PK): Unique project identifier (`proj_...` or UUID).
   - `display_name` (String 256): Human-readable repo or archive name.
   - `content_hash` (String 64): SHA256 of all workspace file contents for cache validation.
   - `workspace_id` (String 64): Directory name under `/workspaces/{workspace_id}`.
   - `is_trusted` (Boolean Integer): Flag identifying benchmark suites for safe execution.
3. **`project_files`**:
   - Stores catalog of every analyzed source file with relative path, detected language, byte size, line count, and SHA256 hash.
4. **`project_analyses`**, **`project_tests`**, **`project_refactors`**:
   - Persistent cache tables containing JSON payload structures. Storing these records prevents expensive re-parsing on every tab switch or reload.

---

## 4. Backend Architecture & Engine Subsystems

The backend is built with **FastAPI** ([`backend/app/main.py`](file:///f:/CodeOracle/backend/app/main.py)) and organized into modular engines in [`backend/app/`](file:///f:/CodeOracle/backend/app).

### 4.1 Ingestion Engine (`backend/app/ingestion/`)
- [`zip_ingest.py`](file:///f:/CodeOracle/backend/app/ingestion/zip_ingest.py): Unpacks uploaded zip archives safely. Prevents ZipSlip vulnerabilities by checking canonical paths. Ignores `.git`, `node_modules`, `__pycache__`, `.venv`, and binary blobs.
- [`github_ingest.py`](file:///f:/CodeOracle/backend/app/ingestion/github_ingest.py): Clones public/private repositories using shallow `git clone --depth=1` or downloads repository tarballs directly.
- [`discovery.py`](file:///f:/CodeOracle/backend/app/ingestion/discovery.py): Walks extracted workspaces, detects languages by extension, computes file hashes, and populates the `ProjectFile` database records.

### 4.2 Static Analysis & Graph Engine (`backend/app/analysis/`)
- [`python_analyzer.py`](file:///f:/CodeOracle/backend/app/analysis/python_analyzer.py): Uses Python's native `ast` library. Extracts functions, classes, methods, docstrings, imports (`import x`, `from x import y`), call sites, and calculates Cyclomatic Complexity.
- [`javascript_analyzer.py`](file:///f:/CodeOracle/backend/app/analysis/javascript_analyzer.py): Uses Tree-sitter for JavaScript and TypeScript. Extracts ES module imports, CommonJS `require()`, class declarations, functions, arrow functions, and exported symbols.
- [`dependency_resolver.py`](file:///f:/CodeOracle/backend/app/analysis/dependency_resolver.py): Resolves relative and absolute module paths across the workspace. Builds explicit directed edges: `A -> B` (A imports B).
- [`graph_service.py`](file:///f:/CodeOracle/backend/app/analysis/graph_service.py):
  - Builds Node and Edge graphs for modules and files.
  - Detects **Circular Dependencies** using Tarjan's Strongly Connected Components (SCC) or DFS cycle tracing.
  - Suggests **Cycle Breakers** (e.g. creating shared interfaces or extracting data structures).
  - Classifies modules into architectural roles: `entrypoint`, `service`, `utility`, `data_access`, `presentation`.

### 4.3 System Pulse Engine (`backend/app/pulse/`)
Implements the centralized **Repository Health Observatory** in [`pulse/service.py`](file:///f:/CodeOracle/backend/app/pulse/service.py):
- **5 Canonical Subsystems**: Automatically partitions all repository files into:
  1. `Frontend` (React, Vue, HTML, CSS, TSX, JSX, UI components)
  2. `Backend` (APIs, controllers, domain services, workers)
  3. `Database` (SQL, migrations, Alembic, ORM models, DAOs)
  4. `ML / Data Science` (Pipelines, training, PyTorch, Scikit-learn, datasets)
  5. `Infrastructure` (Docker, Kubernetes, CI/CD, Terraform, configs)
- **5 Dimensional Health Cards**:
  1. *AST Parse Health* (Complete AST vs partial fallback ratio)
  2. *Dependency Structure* (Resolved imports ratio minus circular dependency penalty)
  3. *Complexity Distribution* (Ratio of modules under complexity threshold 15)
  4. *Protection Level* (Test coverage and sandbox validation status)
  5. *Modernization Opportunity* (Legacy syntax candidates inventory)
- **Intelligent Narrative Signals**: Generates dynamic observation cards (e.g. Primary Bottleneck, Circularity Alert, Safety Net Warning).

### 4.4 Hotspots & Risk Engine (`backend/app/hotspots/`)
In [`hotspots/service.py`](file:///f:/CodeOracle/backend/app/hotspots/service.py):
- Calculates a compound **Hotspot Risk Score** (0 to 100) based on:
  - Cyclomatic Complexity ($CC$)
  - Lines of Code ($LOC$)
  - Fan-in and Fan-out (Degree Centrality in import graph)
  - Lack of Cohesion / God Object indicators
- Classifies risk into `Critical`, `High`, `Medium`, and `Low`.
- Computes **Blast Radius**: What percentage of the entire codebase is transitively affected if a hotspot file breaks?

### 4.5 Safety Test Generation Engine (`backend/app/testgen/`)
In [`testgen/service.py`](file:///f:/CodeOracle/backend/app/testgen/service.py), [`python_generator.py`](file:///f:/CodeOracle/backend/app/testgen/python_generator.py), [`javascript_generator.py`](file:///f:/CodeOracle/backend/app/testgen/javascript_generator.py), and [`runner.py`](file:///f:/CodeOracle/backend/app/testgen/runner.py):
- **Testable Module Filter**: Intelligently skips empty `__init__.py`, type-only `.d.ts` files, and pure re-export barrel files.
- **AST Test Construction**: For every function/method, generates inputs, boundary assertions, mocked dependencies, and exception handling tests.
- **Syntax Validation**: Verifies generated test code against the AST parser before saving to ensure 0 syntax errors.
- **Sandbox Execution Runner**: Executes tests in a subprocess runner under resource and timeout constraints, reporting line coverage, passing tests, and failures.

### 4.6 Autonomous Refactor & Verification Engine (`backend/app/refactor/`)
In [`refactor/service.py`](file:///f:/CodeOracle/backend/app/refactor/service.py) and [`verification_service.py`](file:///f:/CodeOracle/backend/app/refactor/verification_service.py):
- **Deterministic Modernization Rules**:
  - `PY2_XRANGE`: `xrange(...)` -> `range(...)`
  - `PY2_ITERITEMS`: `d.iteritems()` -> `d.items()`
  - `PY2_ITERKEYS` / `PY2_ITERVALUES`: `d.iterkeys()` -> `d.keys()`, `d.itervalues()` -> `d.values()`
  - `PY2_EXCEPT_SYNTAX`: `except Exception, e:` -> `except Exception as e:`
  - `PY2_PRINT_STATEMENT`: `print "text"` -> `print("text")`
  - `JS_VAR_TO_CONST_LET`: converts legacy `var` to scoped `const`/`let`
  - `JS_CALLBACK_TO_ASYNC_AWAIT`: refactors nested callback chains
- **Unified Diff Generation**: Uses Python `difflib` to produce standard unified patch strings.
- **Shadow Workspace Verification**: Copies the repository to a temporary workspace, applies the refactored patches, re-runs static analysis and test suites, and calculates before/after metrics to guarantee zero regressions.

### 4.7 Migration Plan Engine (`backend/app/migration/`)
In [`migration/service.py`](file:///f:/CodeOracle/backend/app/migration/service.py):
- **Readiness Formula**: Weighted composite score across 5 categories:
  $$\text{Readiness Score} = 0.20 \times \text{Parse} + 0.20 \times \text{Complexity} + 0.20 \times \text{Coupling} + 0.20 \times \text{Maintainability} + 0.20 \times \text{Testability}$$
- **Topological Wave Planner**: Uses Kahn's algorithm or reverse BFS on the dependency DAG:
  - **Wave 1**: Independent leaf modules, pure data models, and isolated utility helpers (0 inward dependencies).
  - **Wave 2**: Core business logic and service libraries dependent only on Wave 1.
  - **Wave 3+**: API routers, controllers, and top-level CLI orchestrators.
- **Change Impact & Blast Radius**: Calculates direct downstream consumers, transitive downstream consumers, and provides risk ratings for every single file.

---

## 5. Frontend Architecture & Design System

The frontend is a modern single-page application built on **React 18**, **TypeScript**, and **Tailwind CSS**, bundled with **Vite** ([`frontend/src/App.tsx`](file:///f:/CodeOracle/frontend/src/App.tsx)).

### 5.1 Architecture & State Flow
- **Component Hierarchy**: `App` -> `ToastProvider` -> `AppContent` -> (`LandingPage` OR `AppSidebar` + `ProjectContextBar` + `WorkspaceShell` + active tab component).
- **URL Synchronization**: The active tab and selected target file are continuously synchronized with the browser URL query parameters:
  - `/?tab=overview`
  - `/?tab=pulse`
  - `/?tab=explanation&file=app%2Fcore.py`
  - `/?tab=graph`
  - `/?tab=neural-map`
  - `/?tab=tests`
  - `/?tab=refactor`
  - `/?tab=migration`
  - Full browser back/forward support is wired via `popstate` listeners.
- **Custom Hooks**:
  - [`useJobPoller.ts`](file:///f:/CodeOracle/frontend/src/hooks/useJobPoller.ts): Orchestrates zip uploads, GitHub repository submissions, demo loading, and 1000ms polling of background job status until completion.
  - [`useForceSimulation.ts`](file:///f:/CodeOracle/frontend/src/components/NeuralMap/useForceSimulation.ts): Runs D3 force physics simulation in a web-worker or animation frame loop for the Neural Map.

### 5.2 Responsive Layout & Navigation
- **Adaptive Sidebar (`AppSidebar.tsx`)**:
  - Large Desktop ($\ge 1280\text{px}$): Full 240px expanded navigation sidebar with active badges, status dots, and project metadata.
  - Laptop / Tablet ($1024\text{px} - 1279\text{px}$): Automatically transitions into a 72px condensed icon rail.
  - Mobile ($< 1024\text{px}$): Slide-over drawer with backdrop overlay triggered from the context bar hamburger icon.
- **Global Keyboard Shortcuts**:
  - `1` through `9`: Instantly switch between the 9 workspace tabs.
  - `/`: Immediately focuses search / filter inputs in the current view.
  - `c`: Copies active code or explanation content to clipboard.
  - `?`: Toggles the Global Keyboard Shortcuts modal.

---

## 6. Exhaustive Page-by-Page & Tab-by-Tab Breakdown

### 6.1 Landing Page & Ingestion Experience
- **File**: [`frontend/src/components/landing/LandingPage.tsx`](file:///f:/CodeOracle/frontend/src/components/landing/LandingPage.tsx)
- **What it does**: Welcomes first-time visitors and engineers, introduces the core value proposition of CodeOracle, and provides three immediate entry points to ingest any legacy codebase.
- **Visual & Functional Sections**:
  1. **LandingNavbar**: Displays branding, quick navigation links (Features, Architecture, Safety, Roadmap, FAQ), and an "Analyze Codebase" CTA button.
  2. **HeroSection**: Interactive headline, value proposition badges, and two primary action buttons:
     - **"Analyze Repository"**: Opens the interactive ingestion dialog.
     - **"Explore Live Demo Benchmark"**: Instantly spins up a pre-analyzed legacy benchmark codebase without needing to upload anything.
  3. **ProblemSection**: Documents the real-world friction of legacy code: "Fear of breaking changes", "Undocumented architecture", "Missing tests", and "Circular dependency hell".
  4. **WhatIsCodeOracleSection**: High-level explanation of how the AST engine works without sending sensitive intellectual property to third parties.
  5. **MainProductStory**: Step-by-step narrative showing the transformation from tangled legacy spaghetti code to clean, modern, fully-tested architecture.
  6. **CapabilityBento**: Grid displaying CodeOracle's 6 pillars: Deep AST Parsing, 3D Neural Map, Automated Test Generation, Autonomous Refactoring, Safety Verification, and Wave Migration Planning.
  7. **ProtectionSection**: Demonstrates how CodeOracle enforces safety barriers before allowing code changes.
  8. **RiskSection**: Explains how Hotspot detection pinpoints God objects and technical debt.
  9. **ImpactSimulationSection**: Interactive demonstration of blast radius calculation.
  10. **MigrationRoadmapSection**: Visual overview of dependency waves.
  11. **ModernizationSection**: Code comparison showing legacy syntax modernizations.
  12. **AudienceSection**: Tailored value points for Developers, Engineering Leaders, and Enterprise Architects.
  13. **TrustSection & FactStrip**: Quantified performance metrics (100% deterministic parsing, zero hallucinations for syntax transformations).
  14. **FaqSection**: Accordion addressing common security, privacy, and technology questions.
  15. **FinalCtaSection & LandingFooter**: Closing call-to-action and copyright information.

---

### 6.2 Job Ingestion & Analysis Progress Modal
- **File**: [`frontend/src/components/JobProgressView.tsx`](file:///f:/CodeOracle/frontend/src/components/JobProgressView.tsx)
- **What it does**: Provides a visual progress modal while the backend processes a submitted `.zip` file or GitHub repository.
- **How it works**:
  - The frontend polls `GET /api/jobs/{job_id}` every 1000ms.
  - Renders a multi-stage stepper:
    1. *Queued*: Task accepted into backend queue.
    2. *Extracting*: Unzipping archive or cloning git repository.
    3. *Analyzing*: Running Python AST and Tree-sitter parsers, resolving imports, computing complexity.
    4. *Generating*: Building dependency graphs, hotspots, test suites, and refactor candidates.
    5. *Completed*: Dismisses modal and automatically navigates the user to the active project workspace.
  - If a stage fails (e.g. invalid GitHub URL or corrupted zip file), displays the exact `error_code` and `error_message`, offering **"Retry"** and **"Edit URL"** buttons.

---

### 6.3 Project Overview Tab (`overview`)
- **File**: [`frontend/src/components/ProjectOverviewTab.tsx`](file:///f:/CodeOracle/frontend/src/components/ProjectOverviewTab.tsx)
- **What it does**: Serves as the executive summary dashboard for the active repository.
- **Key Sections & Features**:
  1. **Executive Stats Strip**: Displays total source files, total lines of code, detected primary languages (Python, TypeScript, JavaScript) with percentage bars, and repository hash.
  2. **Modernization Readiness KPI**: Quick card summarizing the overall migration readiness score (0-100) with a link to the detailed Migration Plan tab.
  3. **Repository Architecture Card**: Displays detected architecture style (e.g. Multi-tier web app, Microservice, CLI utility) and module distribution.
  4. **Workspace File Tree Explorer**: Interactive hierarchical directory browser allowing the user to inspect any file in the workspace, viewing file size, line counts, and selecting it as the global target file.
  5. **Quick-Action Cards**: Shortcut buttons to jump directly into the System Pulse, Architecture Graph, Test Suite, or Refactoring view.

---

### 6.4 System Pulse Tab (`pulse`) — Observatory
- **File**: [`frontend/src/components/pulse/SystemPulseTab.tsx`](file:///f:/CodeOracle/frontend/src/components/pulse/SystemPulseTab.tsx)
- **Backend Service**: [`backend/app/pulse/service.py`](file:///f:/CodeOracle/backend/app/pulse/service.py)
- **What it does**: Provides an in-depth **Repository Health Observatory** visualizing codebase stability, risk factors, and actionable interventions.
- **Sub-Components**:
  1. **RepositoryHealthHero (`RepositoryHealthHero.tsx`)**:
     - Large health dial displaying the compound score (e.g., `82/100`) and categorical badge (`Stable`, `Stable with pressure points`, `Needs attention`, `High risk`).
     - Analysis Confidence Indicator (`High`, `Medium`, `Low`) based on AST parse completeness.
     - "Why this score" expandable accordion itemizing positive evidence and risk penalties.
  2. **HealthDimensionCards (`HealthDimensionCards.tsx`)**: Five interactive cards covering:
     - *Parsing Health* (AST parse coverage, partial parse files)
     - *Dependency Health* (Internal edge resolution, circularity count)
     - *Complexity Control* (Percentage of files under cyclomatic threshold)
     - *Safety Protection* (Protected files ratio, verified test count)
     - *Modernization State* (Candidate inventory, autofix eligible patterns)
  3. **SubsystemHealthMatrix (`SubsystemHealthMatrix.tsx`)**:
     - Breaks down the codebase across the 5 canonical subsystems: **Frontend**, **Backend**, **ML**, **Database**, **Infrastructure**.
     - Shows file count, average complexity, circularities, and health status for each subsystem.
  4. **PressureZonesSection (`PressureZonesSection.tsx`)**:
     - Lists top high-risk files (God objects, excessive churn, complex branching) that exert the highest architectural pressure.
  5. **IntelligentSignalsSection (`IntelligentSignalsSection.tsx`)**:
     - 3 to 5 narrative diagnostic cards summarizing findings (e.g., "Primary Bottleneck: Dependencies", "Safety Net Absent in Core Service").
  6. **NextActionsSection (`NextActionsSection.tsx`)**:
     - Prioritized, clickable action items (e.g., "Generate tests for `app/core.py`", "Break circular loop in `models` -> `utils`").
  7. **ArchitectureHealthMap (`ArchitectureHealthMap.tsx`)**:
     - Visual map of modules colored by health status (Green: Stable, Yellow: Moderate risk, Red: High debt).

---

### 6.5 Code Intelligence & Explanation Tab (`explanation`)
- **File**: [`frontend/src/components/ExplanationTab.tsx`](file:///f:/CodeOracle/frontend/src/components/ExplanationTab.tsx)
- **What it does**: Provides multi-layered, human-readable explanations of every file, class, and function in the repository.
- **How it works**:
  - Left panel: Searchable file navigation tree.
  - Right panel: Comprehensive explanation dossier including:
    1. *Executive Summary*: High-level purpose of the file in the overall architecture.
    2. *Architectural Role*: Classification (e.g., Entrypoint, Service Layer, Utility).
    3. *Business Logic & Data Flow*: Plain-English translation of complex algorithms and business rules.
    4. *Security & Performance Considerations*: Highlights potential vulnerabilities (e.g., unvalidated inputs, SQL injection risks, synchronous blocking I/O).
    5. *Public Interfaces & API Contracts*: Catalog of exported functions, classes, arguments, and return types.
    6. *Dependency Interactions*: Inward callers and outward dependencies.
  - Interactive Actions:
    - **"Focus in Dependency Graph"**: Jumps to Tab 5 with this file selected.
    - **"Inspect Impact"**: Opens the Change Impact Modal to simulate editing this file.

---

### 6.6 Hotspots & Technical Debt Tab (`hotspots`)
- **File**: [`frontend/src/components/HotspotsTab.tsx`](file:///f:/CodeOracle/frontend/src/components/HotspotsTab.tsx)
- **Backend Service**: [`backend/app/hotspots/service.py`](file:///f:/CodeOracle/backend/app/hotspots/service.py)
- **What it does**: Pinpoints the most dangerous, fragile, and high-maintenance files in the codebase.
- **Key Visualizations**:
  1. **Hotspots Table**: Ranked table showing files sorted by Compound Risk Score.
     - Columns: File Path, Risk Tier (`Critical`, `High`, `Medium`, `Low`), Cyclomatic Complexity, Lines of Code, Inward Callers, and Blast Radius.
  2. **God Object Detector**: Identifies monolithic classes/files with excessive responsibilities, low cohesion, and dozens of internal methods.
  3. **Risk Matrix Quadrant**: Scatter plot visualizing **Complexity vs. Coupling**. Files in the upper-right quadrant represent immediate modernization liabilities.
  4. **Direct Navigation**: Clicking any hotspot opens its code diff in Refactor or reveals its connections in the Dependency Graph.

---

### 6.7 Interactive Architecture & Dependency Graph Tab (`graph`)
- **File**: [`frontend/src/components/DependencyGraphTab.tsx`](file:///f:/CodeOracle/frontend/src/components/DependencyGraphTab.tsx)
- **What it does**: Provides an interactive topological map of module and file dependencies across the entire repository.
- **Capabilities & Controls**:
  - **Granularity Toggle**: Switch between **Module Level** (high-level package structure) and **File Level** (granular import graph).
  - **Circular Dependency Detector**: Highlights circular dependency loops in bright warning colors. Clicking a cycle lists the participating files and provides **Cycle Breaker Suggestions** (e.g., dependency injection, interface extraction).
  - **Graph Controls**: Zoom in/out, pan, center layout, reset camera, and search for specific nodes.
  - **Selected Node Inspector Panel**: When a node is selected, displays its incoming imports, outgoing dependencies, architectural tier, and direct buttons to inspect impact or view explanations.

---

### 6.8 Neural Map Canvas Experience (`neural-map`)
- **File**: [`frontend/src/components/NeuralMap/NeuralMapPage.tsx`](file:///f:/CodeOracle/frontend/src/components/NeuralMap/NeuralMapPage.tsx)
- **Canvas Renderer**: [`ForceGraphCanvas.tsx`](file:///f:/CodeOracle/frontend/src/components/NeuralMap/ForceGraphCanvas.tsx)
- **What it does**: A high-performance 2D/3D physics-based canvas simulation mapping the entire codebase as a neural network of interconnected components.
- **Advanced Features**:
  1. **Canvas Force Simulation**: Smooth 60fps force-directed graph running repulsive node charges, link spring forces, and collision detection.
  2. **Cluster Lenses**:
     - *Subsystem Clustering*: Groups nodes into orbital clusters by subsystem (Frontend, Backend, Database, ML, Infra).
     - *Layer Clustering*: Groups nodes by architectural tier (Presentation, Service, Data).
     - *Risk Lens*: Sizes nodes by Cyclomatic Complexity and colors them by risk tier.
  3. **Path Tracing Modal (`PathTracingModal.tsx`)**:
     - Allows selecting a Source File and Target File. Computes and highlights the shortest transitive dependency path between them.
  4. **Architecture Tour Modal (`ArchitectureTourModal.tsx`)**:
     - Step-by-step guided camera walkthrough taking the engineer on a tour of the repository's Entry Points, Core Services, Database Adapters, and Utility files.
  5. **Command Palette (`CommandPaletteModal.tsx` — `Cmd/Ctrl+K`)**:
     - Instant fuzzy-search overlay to search nodes, isolate clusters, trigger layouts, or jump between views.

---

### 6.9 Generated Tests Tab (`tests`) — Safety Harness
- **File**: [`frontend/src/components/GeneratedTestsTab.tsx`](file:///f:/CodeOracle/frontend/src/components/GeneratedTestsTab.tsx)
- **Backend Service**: [`backend/app/testgen/service.py`](file:///f:/CodeOracle/backend/app/testgen/service.py)
- **What it does**: Generates, validates, displays, and executes comprehensive unit test suites for untested legacy code.
- **Workflow & UI Elements**:
  1. **Protection Summary Bar**: Displays total generated test suites, syntax-validated test files, runtime execution pass/fail stats, and estimated line coverage percentage.
  2. **Test File Selector**: Sidebar listing all generated test files (e.g. `test_auth_service.py`, `test_database.spec.js`) with status badges (`Valid Syntax`, `Runtime Verified`).
  3. **Code Viewer**: Side-by-side or full-width syntax-highlighted editor displaying the complete generated test suite, including fixtures, parameterized tests, and mocked boundary calls.
  4. **"Run Tests in Sandbox" Action**: Triggers backend execution of the test suite inside an isolated sandbox, returning live console stdout/stderr and pass/fail counts.
  5. **Download Suite**: Exports all generated tests as a ready-to-run `.zip` archive or individual files into the user's project structure.

---

### 6.10 Refactored Code Tab (`refactor`) — Modernization Engine
- **File**: [`frontend/src/components/RefactoredCodeTab.tsx`](file:///f:/CodeOracle/frontend/src/components/RefactoredCodeTab.tsx)
- **Backend Service**: [`backend/app/refactor/service.py`](file:///f:/CodeOracle/backend/app/refactor/service.py)
- **What it does**: Autonomous code transformation engine that generates modern, idiomatic code replacements with zero semantic regression.
- **Key Features**:
  1. **Split-Screen Unified Diff Viewer**: Side-by-side comparison of **Original Legacy Code** vs. **Refactored Modern Code** with color-coded line additions, deletions, and inline modifications.
  2. **Modernization Rule Tags**: Tags every change with its applied rule (e.g., `PY2_XRANGE`, `JS_VAR_TO_CONST_LET`, `TYPE_ANNOTATION_INJECTION`).
  3. **Candidate Disposition Panel (`CandidateDispositionPanel.tsx`)**:
     - Categorizes refactor candidates into **Autofix Eligible** (deterministic, safe to apply automatically) and **Manual Review Required** (complex refactoring requiring engineer sign-off).
  4. **Breaking Change Warnings**: Highlights potential runtime discrepancies (e.g., dictionary view behavior changes between Python 2 and 3).
  5. **Shadow Verification Runner**: Executes the test suite against the refactored code to prove the modernization did not break existing behavior.
  6. **Download Refactored Files**: Allows exporting individual refactored files or complete patch diffs.

---

### 6.11 Migration Plan Tab (`migration`) — Wave Roadmap
- **File**: [`frontend/src/components/MigrationPlanTab.tsx`](file:///f:/CodeOracle/frontend/src/components/MigrationPlanTab.tsx)
- **Backend Service**: [`backend/app/migration/service.py`](file:///f:/CodeOracle/backend/app/migration/service.py)
- **What it does**: Provides a structured, risk-ordered, step-by-step roadmap for modernizing or migrating the entire codebase.
- **Key Modules**:
  1. **Readiness Formula Header**: Displays overall Readiness Score (0-100) and confidence tier. Clicking opens the **Readiness Formula Modal** ([`ReadinessFormulaModal.tsx`](file:///f:/CodeOracle/frontend/src/components/migration/ReadinessFormulaModal.tsx)) displaying the exact mathematical weights of the 5 constituent dimensions.
  2. **Topological Migration Waves**:
     - Sequenced list of execution waves:
       - *Wave 1*: Foundational Utilities & Data Models (Leaves).
       - *Wave 2*: Internal Domain Services & Business Logic.
       - *Wave 3*: API Endpoints, Public Interfaces & Controllers.
     - Each wave shows file count, risk level, estimated effort, and dependencies that must be completed prior to initiation.
  3. **Priority Matrix (`PriorityMatrix.tsx`)**:
     - Visual 2x2 grid plotting files by **Migration Impact vs. Execution Effort/Risk** (Quick Wins, Major Projects, Fill-ins, Hard Re-architectures).
  4. **Impact Ripple Graphic (`ImpactRippleGraphic.tsx`)**:
     - Visualizes the downstream ripple effect when migrating a selected module.
  5. **Export Roadmap**: Downloads the full plan as a formatted Markdown or JSON report.

---

### 6.12 Global Utility Modals & Inter-tab Workflows
- **ProjectContextBar (`ProjectContextBar.tsx`)**: Persistent top header displaying the active project, currently selected file, "Inspect Impact" shortcut, and "View Landing Preview" toggle.
- **PipelineStrip (`PipelineStrip.tsx`)**: Visual progress banner indicating where the user is in the overall modernization pipeline: **Ingest -> Analyze -> Modernize Output**.
- **ChangeImpactModal (`ChangeImpactModal.tsx`)**: Global modal invokable from anywhere (`ProjectContextBar`, Hotspots, Graphs, Explanation). Given any file, it runs an on-the-fly transitive closure query to show:
  - Direct dependents (immediate callers)
  - Transitive downstream dependents (entire ripple chain)
  - Risk rating and safety test status of affected consumers
- **ShortcutsModal (`ShortcutsModal.tsx`)**: Keyboard shortcut reference overlay.
- **Toast Notifications (`Toast.tsx`)**: Non-blocking toast alert system for success confirmations, test run completions, and error notifications.

---

## 7. Comprehensive REST API Reference

All backend endpoints are prefixed with `/api` and implemented in [`backend/app/api/routes.py`](file:///f:/CodeOracle/backend/app/api/routes.py).

| HTTP Method | Endpoint Path | Functionality & Purpose |
|:---|:---|:---|
| `GET` | `/api/health` | System health check and database connectivity diagnostic. |
| `POST` | `/api/jobs/upload` | Accepts multipart `.zip` archive upload; creates background ingestion job. |
| `POST` | `/api/jobs/github` | Accepts GitHub repo URL; triggers background shallow clone/tarball ingest. |
| `GET` | `/api/jobs/{job_id}` | Polls status, stage, progress percentage, and error logs for an active job. |
| `GET` | `/api/projects` | Returns list of recently analyzed projects with file counts and timestamps. |
| `GET` | `/api/projects/{id}` | Fetches metadata, detected languages, lines of code, and workspace ID. |
| `GET` | `/api/projects/{id}/summary` | Returns architecture summary, language distribution, and file catalog. |
| `GET` | `/api/projects/{id}/files` | Returns full list of analyzed files with paths, languages, sizes, and lines. |
| `POST` | `/api/projects/{id}/analyze` | Initiates static analysis on an existing project workspace. |
| `GET` | `/api/projects/{id}/analysis` | Returns cached AST analysis records, module catalog, and dependency edges. |
| `GET` | `/api/projects/{id}/explanation` | Returns multi-level code intelligence explanation for a target file. |
| `GET` | `/api/projects/{id}/architecture` | Returns high-level architectural overview and layer breakdown. |
| `GET` | `/api/projects/{id}/analysis/download` | Exports analysis findings and architectural metrics as Markdown text. |
| `GET` | `/api/projects/{id}/graph` | Returns nodes, edges, cycles, and cycle breakers for module/file levels. |
| `GET` | `/api/projects/{id}/graph/download` | Exports graph topology in DOT or JSON format. |
| `GET` | `/api/projects/{id}/system-pulse` | Generates Repository Health Observatory metrics (5 dimensions, 5 subsystems). |
| `GET` | `/api/projects/{id}/hotspots` | Computes technical debt hotspots, God objects, and risk assessments. |
| `GET` | `/api/projects/{id}/impact` | Calculates blast radius and transitive ripple impact for a query file. |
| `POST` | `/api/projects/{id}/tests/generate` | Generates AST-driven unit test suites for all testable modules. |
| `GET` | `/api/projects/{id}/tests` | Retrieves generated test files, syntax validation status, and coverage. |
| `GET` | `/api/projects/{id}/tests/download` | Downloads generated test suite as a `.zip` archive. |
| `POST` | `/api/projects/{id}/refactor` | Executes deterministic AST modernization rules and generates diffs. |
| `GET` | `/api/projects/{id}/refactor` | Returns cached refactored code diffs and rule categorizations. |
| `POST` | `/api/projects/{id}/refactor/verify` | Runs shadow sandbox verification of refactored code against tests. |
| `GET` | `/api/projects/{id}/refactor/verify` | Fetches cached verification comparison metrics. |
| `GET` | `/api/projects/{id}/refactor/download`| Downloads refactored source files or unified `.diff` patches. |
| `GET` | `/api/projects/{id}/migration-plan` | Computes topological migration waves, readiness formula, and blockers. |
| `GET` | `/api/projects/{id}/migration-plan/download` | Exports migration plan roadmap as a Markdown document. |
| `GET` | `/api/projects/{id}/migration-plan/download-json` | Exports migration plan roadmap as structured JSON. |
| `POST` | `/api/demo/benchmarks/{name}` | Clones and analyzes a pre-configured trusted benchmark project. |

---

## 8. End-to-End Data & Execution Lifecycles

### 8.1 Ingestion to Analysis Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Frontend (useJobPoller)
    participant API as FastAPI Router
    participant Worker as Background Task
    participant FS as Workspace Storage
    participant DB as Database (SQLite/PG)

    User->>Frontend: Submits Zip file or GitHub URL
    Frontend->>API: POST /api/jobs/upload (or /jobs/github)
    API->>DB: Insert Job(id, state='queued', progress=0)
    API-->>Frontend: 202 Accepted {job_id}
    
    par Background Ingestion
        Worker->>FS: Extract archive or clone git repo to /workspaces/{ws_id}
        Worker->>DB: Update Job(state='extracting', progress=25)
        Worker->>FS: Walk files & compute SHA256 hashes
        Worker->>DB: Insert Project & ProjectFile records
        Worker->>DB: Update Job(state='analyzing', progress=50)
        Worker->>Worker: Run Python AST & Tree-Sitter Analyzers
        Worker->>Worker: Resolve module imports & construct dependency edges
        Worker->>DB: Insert ProjectAnalysisRecord(analysis_data)
        Worker->>DB: Update Job(state='completed', progress=100)
    and Polling Loop
        loop Every 1000ms
            Frontend->>API: GET /api/jobs/{job_id}
            API->>DB: Query Job status
            API-->>Frontend: Return {state, progress_percentage, stage}
            Frontend->>Frontend: Update JobProgressView UI
        end
    end
    Frontend->>API: GET /api/projects/{project_id}
    Frontend->>Frontend: Mount Workspace and Navigate to Overview Tab
```

### 8.2 Modernization & Shadow Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Engineer
    participant Frontend as RefactoredCodeTab
    participant API as FastAPI Router
    participant RefactorEng as Refactor Engine
    participant Sandbox as Shadow Sandbox Worker
    participant DB as Database

    Engineer->>Frontend: Clicks "Refactor Codebase"
    Frontend->>API: POST /api/projects/{id}/refactor
    API->>RefactorEng: Inspect ProjectAnalysisRecord
    RefactorEng->>RefactorEng: Apply Modernization Rules (xrange, iteritems, var->let)
    RefactorEng->>RefactorEng: Generate Unified Diff Patches
    RefactorEng->>DB: Save ProjectRefactorRecord
    API-->>Frontend: Return RefactoredFiles & Diff Data
    Frontend->>Frontend: Display Side-by-Side Diff Viewer
    
    Engineer->>Frontend: Clicks "Verify Changes in Sandbox"
    Frontend->>API: POST /api/projects/{id}/refactor/verify
    API->>Sandbox: Create temp workspace clone
    Sandbox->>Sandbox: Apply generated diff patches
    Sandbox->>Sandbox: Re-run static analysis on patched workspace
    Sandbox->>Sandbox: Execute generated safety test suite
    Sandbox->>Sandbox: Compare before vs after metrics (Health score delta)
    Sandbox-->>API: Return VerificationResult(tests_passed, regressions=0)
    API-->>Frontend: Return Verification Badge & Delta Report
```

---

## 9. Configuration, Environment & Deployment

### 9.1 Environment Variables
Configured via [`.env`](file:///f:/CodeOracle/.env) and managed by Pydantic in [`backend/app/config.py`](file:///f:/CodeOracle/backend/app/config.py):
- `DATABASE_URL`: Connection string for SQLAlchemy (e.g. `sqlite:///./data/codeoracle.db` or `postgresql://user:pass@host:5432/dbname`).
- `CODEORACLE_DATA_DIR`: Explicit storage path for databases and persistent cache.
- `WORKSPACE_BASE_DIR`: Base path for extracted repository workspaces (defaults to `./workspaces`).
- `MAX_UPLOAD_SIZE_MB`: Maximum permitted `.zip` upload size (default: `100MB`).
- `EXECUTION_TIMEOUT_SECONDS`: Maximum runtime allowed for sandbox test execution (default: `30s`).
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`: Optional LLM API keys for supplementary deep natural language explanations.

### 9.2 Running Locally
1. **Backend**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Access the web application at `http://localhost:5173`.

### 9.3 Containerized & Cloud Deployment
- **Docker**: The root [`Dockerfile`](file:///f:/CodeOracle/Dockerfile) builds a multi-stage production container containing Node.js for frontend asset compilation and Python 3.11 for the FastAPI backend and Tree-sitter parsers.
- **Render / Cloud PaaS**: [`render.yaml`](file:///f:/CodeOracle/render.yaml) is pre-configured for one-click deployment with persistent disk mounts for `/app/data` and `/app/workspaces`.

---

## 10. Summary Matrix of All 9 Workspace Tabs

| # | Tab Key | Display Name | Primary Function | Core Backend Engines |
|:---:|:---|:---|:---|:---|
| **1** | `overview` | **Project Overview** | Repository KPIs, language breakdown, file explorer tree. | `ingestion`, `analysis` |
| **2** | `pulse` | **System Pulse** | 5-dimension health scores, 5-subsystem matrix, intelligent signals. | `pulse`, `migration` |
| **3** | `explanation` | **Explanation** | File-by-file architectural role, business logic, and security analysis. | `analysis/explanations` |
| **4** | `hotspots` | **Hotspots** | God objects, high cyclomatic complexity, risk matrix. | `hotspots`, `analysis` |
| **5** | `graph` | **Dependency Graph** | Interactive node/edge topology, circular dependency cycles & breakers. | `analysis/graph_service` |
| **6** | `neural-map` | **Neural Map** | 2D/3D Canvas force simulation, cluster lenses, path tracing, tour. | `NeuralMap`, D3 physics |
| **7** | `tests` | **Generated Tests** | AST test suite generator, syntax validator, sandbox test runner. | `testgen` (`runner`, `validator`) |
| **8** | `refactor` | **Refactored Code** | Side-by-side diff viewer, modernization rules, shadow verification. | `refactor` (`verification`) |
| **9** | `migration` | **Migration Plan** | Topological wave roadmap, readiness formula, priority matrix. | `migration`, `graph_service` |
