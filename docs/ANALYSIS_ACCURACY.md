# CodeOracle Static Analysis Accuracy & Language Ground Truth

**Analyzer Version:** `1.1.0`  
**Scoring Version:** `1.2.0`  
**Verification Engine Version:** `1.0.0`  
**Status:** Verified via deterministic benchmark test suite (`backend/tests/test_analysis_accuracy.py`)

---

## 1. Executive Summary & Defensibility Contract

CodeOracle provides evidence-based static code intelligence. Unlike tools that inflate coverage or treat unexecuted syntax as verified code, CodeOracle enforces a strict **Defensibility Contract**:

1. **No Metric Inflation:** Unanalyzable constructs are never coerced into passing scores.
2. **Truthful Parse Reporting:** If a parser encounters syntax errors or language constructs beyond its grammar, it reports `parse_status = "partial"` or `"failed"` and degrades confidence rather than silently reporting full AST coverage.
3. **Execution Honesty:** Syntactically valid generated tests or proposed refactors are never labeled as runtime-verified until executed and validated in an isolated sandbox.
4. **Transparent Boundaries:** Unresolved local imports are tracked and surfaced as graph risks rather than silently discarded.

---

## 2. Exact Language Support Matrix

| Language / Dialect | File Extensions | Parser Engine | AST Parse Status | Tree-sitter Grammar | Fallback Engine |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Python** | `.py` | Python 3.12+ `ast` | Full (Complete) | N/A | Lexical `tokenize` + regex scanner |
| **JavaScript ESM** | `.js`, `.mjs`, `.jsx` | Tree-sitter 0.21.3 | Full (Complete) | `tree-sitter-javascript` 0.21.0 | Resilient node extraction |
| **JavaScript CommonJS** | `.js`, `.cjs` | Tree-sitter 0.21.3 | Full (Complete) | `tree-sitter-javascript` 0.21.0 | Resilient node extraction |
| **TypeScript** | `.ts`, `.mts`, `.cts` | Tree-sitter 0.21.3 | Partial / Graceful | `tree-sitter-javascript` 0.21.0 | Type recovery & token scanner |
| **TSX (React + TS)** | `.tsx` | Tree-sitter 0.21.3 | Partial / Graceful | `tree-sitter-javascript` 0.21.0 | JSX + type recovery scanner |

---

## 3. Language Construct Breakdown

### 3.1 Python (`.py`)
- **Parser Used:** Standard Library `ast` module (Python 3.12+ grammar).
- **Fully Supported Constructs:**
  - Function definitions (`def`, `async def`), methods, constructors (`__init__`), decorators.
  - Class hierarchies, single and multiple inheritance, abstract base classes.
  - Parameter extraction: positional, keyword-only, default values, type annotations.
  - Module imports: `import x`, `import x as y`, `from x import y`, relative imports (`.`, `..`, `...`).
  - Type-only import boundary: detects `if TYPE_CHECKING:` and `if typing.TYPE_CHECKING:` blocks, tagging enclosed edges as `is_type_only = True`.
  - Function and method call graphs: `call_expression` matching caller qualified names to targets.
  - Deprecated library detection: identifies standard modules removed in Python 3.11/3.13 (`imp`, `optparse`, `cgi`, `asyncore`, `smtpd`, etc.).
  - Legacy pattern detection: `print` statements, `except Exception, e:`, `xrange()`, `raw_input()`, `.iteritems()`, wildcard imports (`from x import *`).
  - Cyclomatic complexity: precise branch point accumulation across `If`, `While`, `For`, `AsyncFor`, `ExceptHandler`, `With`, `AsyncWith`, and boolean operators `And`/`Or`.
- **Partial / Fallback Behavior:**
  - When `ast.parse` throws `SyntaxError` (e.g. legacy Python 2 files with broken syntax or syntax anomalies), execution falls back to `fallback_python_tokenize_analysis`.
  - The lexical tokenizer extracts `import` and `from ... import` statements, top-level `def` and `class` declarations, and assigns `parse_status = "partial"`.
  - If tokenization encounters an unclosed multi-line delimiter, an emergency regex scanner recovers top-level imports so dependency resolution remains connected.
- **Unsupported Constructs:**
  - Dynamic code evaluation (`eval()`, `exec()`, `importlib.import_module(var)`).
  - Runtime monkey-patching and dynamic attribute manipulation (`setattr(sys.modules[...])`).

### 3.2 JavaScript ESM (`.js`, `.mjs`, `.jsx`)
- **Parser Used:** Tree-sitter (0.21.3) with `tree-sitter-javascript` grammar (0.21.0).
- **Fully Supported Constructs:**
  - ES Module import statements: default imports, named imports, aliased imports (`as`), namespace imports (`* as`).
  - Type-only import statements: `import type { T } from 'y'` tagged as `is_type_only = True`.
  - Re-exports: `export { x } from './y'`, `export * from './y'`.
  - Export declarations: `export const/let/var`, `export function`, `export class`, `export default`.
  - Lexical declarations: `const`, `let`, `var` (flags `var` as modernization candidate `VAR_USAGE`).
  - Class declarations, static methods, class properties, getters/setters, constructor methods.
  - Arrow functions and function expressions assigned to variables.
  - JSX elements, fragments (`<>...</>`), nested component invocation.
  - Modern syntax: optional chaining (`?.`), nullish coalescing (`??`), spread operators (`...`).
  - Security and legacy warnings: `eval()`, `document.write()`, `with()` statements.
- **Partial / Fallback Behavior:**
  - Tree-sitter native error recovery creates `ERROR` nodes on syntax anomalies while successfully continuing parse of surrounding valid AST nodes.
  - If `root_node.has_error` is True, `parse_status` is explicitly set to `"partial"`, recording diagnostic error messages while retaining all cleanly parsed symbols.
- **Unsupported Constructs:**
  - Template literal dynamic paths (e.g. `import(\`./modules/${name}\`)`).

### 3.3 JavaScript CommonJS (`.js`, `.cjs`)
- **Parser Used:** Tree-sitter (0.21.3) with `tree-sitter-javascript` grammar.
- **Fully Supported Constructs:**
  - CommonJS import statements: `const x = require('./x')`, `const { a, b } = require('./x')`.
  - Nested `require()` statements inside subroutines (tagged as `kind = "require"`).
  - CommonJS export declarations: `module.exports = ...`, `module.exports.fn = ...`, `exports.fn = ...`.
- **Partial / Fallback Behavior:**
  - Identical Tree-sitter error recovery nodes; partial status flagged if syntax errors exist.
- **Unsupported Constructs:**
  - Dynamically computed require parameters: `require(path.join(__dirname, varName))`.

### 3.4 TypeScript (`.ts`, `.mts`, `.cts`)
- **Parser Used:** Tree-sitter (0.21.3) using JavaScript grammar engine.
- **Fully Supported Constructs:**
  - All valid ECMAScript/JavaScript constructs within TypeScript files.
  - Type-only imports (`import type { User } from './types'`) recognized via import clause scanner.
  - Function declarations, classes, and variable declarations where type annotations do not disrupt outer delimiter balance.
- **Partial / Fallback Behavior:**
  - Pure TypeScript keywords (`interface`, `type Foo = ...`, `enum`, `<T>` generic parameter lists, `: Type` return type annotations) cause Tree-sitter JS grammar to generate `ERROR` or `labeled_statement` recovery nodes.
  - CodeOracle's resilient fallback visitor extracts function names, exports, and imports from these recovery nodes.
  - CodeOracle truthfully records `parse_status = "partial"`, `parse_errors = ["Tree-sitter reported parse syntax errors in file."]`, and degrades parser confidence from `high` to `medium`.
- **Unsupported Constructs:**
  - TypeScript interface inheritance hierarchies (`interface A extends B`).
  - Enums compiled to runtime IIFE objects.
  - Ambient declarations (`declare module '...'`).

### 3.5 TSX (`.tsx`)
- **Parser Used:** Tree-sitter (0.21.3) using JavaScript grammar engine.
- **Fully Supported Constructs:**
  - Standard React component declarations (`export function App() { return <div ... /> }`).
  - JSX tags, self-closing elements, attributes, child elements.
  - Hook usage (`useState`, `useEffect`, `useCallback`) mapped as function calls.
- **Partial / Fallback Behavior:**
  - Generic parameters with JSX ambiguity (`<T,>(val: T) => ...`) or TypeScript props type annotations trigger Tree-sitter JS error recovery nodes.
  - Extracted with `parse_status = "partial"`, preserving component names and import graphs.
- **Unsupported Constructs:**
  - Type-level JSX prop validation.

---

## 4. Benchmark Corpus Specification

The deterministic benchmark corpus resides in `backend/tests/fixtures/benchmark_corpus/`:

| Fixture Path | Primary Dialect | File Count | Expected Modules | Key Tested Characteristic |
| :--- | :--- | :--- | :--- | :--- |
| `python_clean/` | Python 3 | 3 | `utils.py`, `service.py`, `main.py` | Full AST, clean dependency resolution, blast radius, fan-in/fan-out |
| `python_cycles/` | Python 3 | 3 | `node_a.py`, `node_b.py`, `node_c.py` | Directed cycle detection: `node_a -> node_b -> node_c -> node_a` |
| `python_syntax_error/`| Python 3 | 1 | `syntax_broken.py` | Unclosed delimiter, fallback tokenization, partial status |
| `js_esm/` | JS ESM | 3 | `math_utils.js`, `calculator.js`, `index.js` | Full Tree-sitter parse, ES named exports, entry point detection |
| `js_commonjs/` | JS CJS | 2 | `logger.js`, `server.js` | `require()`, `module.exports`, CJS dependency resolution |
| `ts_types/` | TypeScript | 2 | `types.ts`, `user_service.ts` | `import type`, partial parse status, class extraction |
| `tsx_react/` | TSX | 2 | `Button.tsx`, `App.tsx` | JSX component parsing, DOM tree structure, entry point detection |
| `boundary_cases/single_file/` | Python 3 | 1 | `isolated.py` | 0 dependencies, 0 cycles, blast radius 0, bounded score stability |

---

## 5. Measured Attributes & Verification Invariants

All measurements are programmatically asserted in `backend/tests/test_analysis_accuracy.py`:

### 5.1 Parse Success & Integrity
- Clean files assert `parse_status == "complete"` and `len(parse_errors) == 0`.
- Malformed or partial files assert `parse_status == "partial"` with explicit diagnostic messages.

### 5.2 Dependency & Import Resolution
- Resolves relative imports (`.utils`, `./math_utils.js`, `./logger`).
- Distinguishes runtime imports from type-only imports (`is_type_only = True`).
- Known external packages (`react`, `fastapi`, `math`, `os`) are classified as external targets without polluting local project dependency trees.

### 5.3 Entry-point Detection
- **Structural Filenames:** `main.py`, `app.py`, `index.js`, `server.js` recognized automatically.
- **Semantic Classification (`_classify_semantic_entry_point`):**
  - Web runtime entry points classified as `app_runtime`.
  - Frontend client roots classified as `frontend_bootstrap`.
  - Workers, CLIs, and scripts categorized with high confidence and supporting evidence.

### 5.4 Elementary Cycle Detection
- Directed elementary cycles are detected using Johnson-inspired deterministic DFS: `find_directed_cycles(node_ids, edge_pairs)`.
- Verified in `python_cycles`: exactly 1 elementary cycle `['mod_...node_a', 'mod_...node_b', 'mod_...node_c', 'mod_...node_a']`.
- Verified in acyclic fixtures (`python_clean`, `js_esm`): cycle count is strictly `0`.

### 5.5 Graph Conservation Invariants
For any internal directed project dependency graph $G = (V, E_{\text{internal}})$:
$$\sum_{v \in V} \text{fan\_in}(v) = \sum_{v \in V} \text{fan\_out}(v) = |E_{\text{internal}}|$$
This invariant is strictly checked by assertion during graph construction.

### 5.6 Transitive Blast Radius
- Blast radius for a module $M$ is defined as the total number of distinct upstream modules reachable in the reverse dependency graph (transitive callers).
- In `python_clean`:
  - `utils.py`: $\text{fan\_in} = 1$, $\text{blast\_radius} = 2$ (`service.py` and `main.py`).
  - `service.py`: $\text{fan\_in} = 1$, $\text{blast\_radius} = 1$ (`main.py`).
  - `main.py`: $\text{fan\_in} = 0$, $\text{blast\_radius} = 0$.

### 5.7 Cyclomatic Complexity Values
- Calculated as $M = 1 + D$, where $D$ is the count of decision points.
- In `python_clean/utils.py`:
  - `add(a, b)`: $1$ decision point ($0$ branches) $\rightarrow M = 1$.
  - `format_currency(amount)`: $1$ base + $1$ branch (`if amount < 0`) $\rightarrow M = 2$.

### 5.8 Test & Refactor Syntax Validity
- Every generated Python test is validated with `ast.parse` before delivery.
- Every proposed Python refactor is verified with `_syntax_check(language, modern_code)` to ensure compiler syntax validity.

---

## 6. Rigorous State Separation Contract

CodeOracle enforces four strictly separate lifecycle states:

```
[ Generated ] ──► [ Syntax-Valid ] ──► [ Runtime-Executed ] ──► [ Behaviorally Verified ]
```

1. **`Generated`:** The artifact (test suite or refactor diff) has been synthesized statically. No syntax or runtime claims are made.
2. **`Syntax-Valid`:** The artifact compiles under static parser validation (`ast.parse` or Tree-sitter check). It does not guarantee execution success.
3. **`Runtime-Executed`:** The artifact was run inside an isolated subprocess or container runner. Execution status (`passed`, `failed`, `timed_out`) and code coverage percentages are measured.
4. **`Behaviorally Verified`:** The refactored code has run against the characterization baseline test suite, and all tests pass with zero regression in coverage or functionality.

---

## 7. Automated Reproduction

To reproduce all static analysis benchmark tests:
```powershell
backend/.venv/Scripts/pytest.exe backend/tests/test_analysis_accuracy.py -v
```
Expected output: **15 passed in <1.0s**.
