# CodeOracle Performance Budgets, Concurrency, and Job Durability

This document establishes the empirical performance benchmarks, operational limits, queue architecture, and defensible performance budgets for the CodeOracle static analysis engine and background job pipeline.

All measurements reflect real, empirical execution times collected on representative codebases using the reproducible profiling harness (`backend/scripts/profile_engine.py`).

---

## 1. Measured Performance Results

### Measured Latency Breakdown Across Repository Scales

| Pipeline Stage | 100 Files (~2,500 LOC) | 1,000 Files (~25,000 LOC) | 5,000 Files (~125,000 LOC) | Oversized (>10,000 entries) |
|---|:---:|:---:|:---:|:---:|
| **Discovery** | 99.8 ms | 674.3 ms | 4,187.4 ms | N/A (rejected pre-extract) |
| **Reading & Hashing** | 5.3 ms | 61.9 ms | 233.1 ms | N/A |
| **AST Parsing** | 50.9 ms | 486.8 ms | 2,439.1 ms | N/A |
| **Dependency Resolution** | 3.4 ms | 256.3 ms | 6,361.7 ms | N/A |
| **Graph Construction** | 5.1 ms | 157.2 ms | 3,773.6 ms | N/A |
| **Persistence (SQLite/Postgres)** | 3.4 ms | 30.2 ms | 149.5 ms | N/A |
| **Risk Scoring (Hotspots + Pulse)**| 70.1 ms | 1,035.6 ms | 12,795.0 ms | N/A |
| **API Serialization** | 1.6 ms | 18.3 ms | 92.9 ms | N/A |
| **Payload Size** | 170.4 KB | 1.71 MB | 8.62 MB | N/A |
| **Frontend Layout Simulation** | 1.1 ms | 12.9 ms | 101.0 ms | N/A |
| **Fast Boundary Rejection** | N/A | N/A | N/A | **203.3 ms** (`EXCESSIVE_ENTRIES`) |
| **Total Pipeline Latency** | **239.6 ms** | **2,720.5 ms** (2.7s) | **30,032.4 ms** (30.0s) | **203.3 ms** |

---

## 2. Key Optimizations Implemented (Phase 5)

1. **Iterative Depth-Bounded Cycle Detection:**
   - Previous unbounded recursion in `find_directed_cycles` triggered `RecursionError` on chains $\ge 1,000$ nodes.
   - Refactored to an iterative DFS with a depth bound (`max_depth=30`) and count bound (`max_cycles=500`). Completely eliminates recursion crashes and prevents exponential backtracking.
2. **Fast Native Byte Counting & Parallel Discovery:**
   - Eliminated full UTF-8 decoding and line allocation during file traversal. Replaced with native bytecounting (`raw_bytes.count(b"\n")`).
   - Added bounded thread pool concurrency (`ThreadPoolExecutor(max_workers=16)`) for parallel disk I/O and SHA-256 calculation. Discovery time dropped from 13.7s to 674ms on 1,000 files (20x improvement).
3. **Elimination of Repeated Parsing and DB Serialization:**
   - System Pulse (`build_system_pulse`) previously re-queried and deserialized 1.7MB JSON records 3 times. Refactored `build_migration_plan` and `compute_project_hotspots` to accept pre-validated `ProjectAnalysis`, eliminating redundant I/O.
4. **Bounded Transitive Blast-Radius BFS:**
   - Transitive dependent BFS in `compute_project_hotspots` was bounded to 100 reachable nodes. In dependency graphs with deep linear chains, this reduced quadratic traversals from 12.5 million deque operations to linear time, cutting 5,000-file risk scoring from 34s to 12s.

---

## 3. Realistic Performance Budgets

Based on the measured empirical evidence, CodeOracle enforces the following service-level performance budgets:

| Workload Tier | Repository Size | Total Latency Budget | Memory Budget | Notes |
|---|---|:---:|:---:|---|
| **Tier 1 (Small)** | $\le 200$ files, $\le 10,000$ LOC | **$\le 1.0$ s** | $\le 100$ MB | Synchronous feel; cache hits $\le 50$ ms |
| **Tier 2 (Medium)** | 200 – 1,000 files, $\le 50,000$ LOC | **$\le 5.0$ s** | $\le 250$ MB | Bounded worker execution; payload $\le 2$ MB |
| **Tier 3 (Large)** | 1,000 – 5,000 files, $\le 100,000$ LOC | **$\le 45.0$ s** | $\le 750$ MB | Progress polling updates; payload $\le 10$ MB |
| **Tier 4 (Oversized)**| $> 10,000$ entries OR $> 100,000$ LOC | **$\le 1.0$ s rejection** | $\le 50$ MB | Fast rejection before extraction/parsing |

---

## 4. Durable Job Queue & Worker Architecture

To satisfy job durability, crash recovery, and concurrency limits without external message brokers (such as Redis or Celery), CodeOracle uses a database-backed durable queue design.

### Architecture Overview

```
[ Client Request ]
       │
       ▼
[ FastAPI Route ] ──(enforce_user_concurrency_limit)──> [ 429 if > 2 jobs ]
       │
       ├─ (Cache check: content_hash + analyzer_version) ──> [ Instant Cache Hit ]
       ├─ (Idempotency: active job exists) ──> [ Return In-Flight Job ]
       ▼
[ Job Record Created: QUEUED ]
       │
       ▼
[ Atomic Claim: QUEUED -> ANALYZING/EXTRACTING ]
       │
       ├─ Stage 1: Ingestion / Extraction
       ├─ Stage 2: Parallel Discovery & Hashing
       ├─ Stage 3: Parallel AST Parsing (Thread-Pool)
       ├─ Stage 4: Cross-File Graph Resolution
       ├─ Stage 5: Persistence & Serialization
       ▼
[ Job State: COMPLETED ]
```

### Durability & Recovery Semantics

1. **Idempotency:**
   - If an active job (`QUEUED`, `EXTRACTING`, `ANALYZING`, `GENERATING`) is already running for a `project_id`, repeated requests return the existing job.
   - If a project's `content_hash` and `analyzer_version` match an existing completed analysis record, the endpoint returns immediately without re-analyzing.
2. **Explicit Timeouts & Cancellation:**
   - Endpoint `POST /api/jobs/{job_id}/cancel` allows users or admins to cancel queued or in-flight jobs.
   - Background workers check `is_job_cancelled(db, job_id)` before and after each stage to stop execution immediately.
   - Jobs exceeding `settings.JOB_TIMEOUT_SECONDS` (300s) are marked `FAILED` with `JOB_TIMEOUT`.
3. **Stale-Job & Restart Recovery:**
   - On application startup (`lifespan` in `backend/app/main.py`), `recover_interrupted_jobs(db)` marks mid-flight jobs as `FAILED` with `INTERRUPTED` error code.
   - Periodic routine `recover_stale_jobs(db, stale_timeout_seconds=600)` identifies jobs whose heartbeat has not updated for $> 10$ minutes.
4. **Retry Policy:**
   - Transient crashes are retried up to `settings.JOB_MAX_RETRIES` (2 retries).
   - Permanent validation failures (e.g., `OVERSIZED_ZIP`, `EXCESSIVE_ENTRIES`, `NO_SOURCE_FILES`, `REPO_NOT_FOUND`) are identified via `is_permanent_failure()` and **never retried**.
5. **Per-User Concurrency & Resource Limits:**
   - `MAX_CONCURRENT_JOBS_PER_USER = 2` prevents a single user from starving the queue.
   - `MAX_CONCURRENT_WORKERS = 4` bounds concurrent background CPU and database thread usage.
6. **Queue Health & Readiness:**
   - Endpoint `GET /api/jobs/queue/health` provides real-time readiness status, active worker counts, queue backlog, and configuration limits.

---

## 5. Reproducible Verification Commands

All profiling and durability guarantees can be reproduced locally with these commands:

```bash
# 1. Run the Phase 5 empirical profiling harness across scales:
python backend/scripts/profile_engine.py

# 2. Run the Phase 5 performance, concurrency, and durability test suite:
python -m pytest backend/tests/test_performance_and_jobs.py -v

# 3. Run the full backend test suite:
python -m pytest backend/tests

# 4. Run frontend tests and production build:
cd frontend
npm test -- --run
npm run build
```
