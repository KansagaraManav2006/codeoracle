# CodeOracle Benchmark Results

Verified on 2026-08-14 with the deterministic CodeOracle pipeline. Public repository code was statically analyzed but never executed.

## Capacity benchmark

The automated performance test creates a mixed Python and JavaScript project with 100 files and exactly 100,000 relevant source lines. The test requires the full analysis to complete in under 30 seconds.

Run it with:

```bash
cd backend
python -m pytest -q tests/test_analysis.py::test_13_synthetic_100k_line_performance_benchmark -p no:cacheprovider --basetemp=.pytest-benchmark
```

## Real repositories

| Repository | Language | Files | Relevant LOC | Parse result | Graph | Generated tests | Syntax-valid suites | Analysis time* |
|---|---|---:|---:|---|---:|---:|---:|---:|
| [pallets/flask](https://github.com/pallets/flask) | Python | 83 | 18,345 | 83 complete, 0 failed | 83 nodes / 164 edges | 1,529 | 83 / 83 | 0.368 s |
| [expressjs/express](https://github.com/expressjs/express) | JavaScript | 141 | 21,478 | 141 complete, 0 failed | 141 nodes / 141 edges | 251 | 141 / 141 | 0.485 s |

\*Local benchmark timing on the development machine. Render timing varies with cold starts and the selected instance type.

The benchmark exercises source discovery, AST parsing, plain-language explanation generation, dependency graph construction, unit-test generation, syntax validation, and safe refactor proposal generation. Generated tests for public repositories are not executed because uploaded and cloned code is untrusted.

## Public URLs for judge testing

Use either exact URL in the GitHub input:

```text
https://github.com/pallets/flask
https://github.com/expressjs/express
```

Flask is the recommended Python demonstration. Express is the recommended JavaScript demonstration.
