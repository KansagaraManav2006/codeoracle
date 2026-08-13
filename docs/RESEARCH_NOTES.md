# Research Notes - CodeOracle Checkpoint 3

## Official Reference Documentation Used

### 1. Python Standard Library `ast` Module
- **URL**: https://docs.python.org/3/library/ast.html
- **Key Concepts**:
  - `ast.parse(source_code, filename, mode='exec')` for building Abstract Syntax Trees.
  - Node visitor subclass `ast.NodeVisitor` for extracting imports, classes, functions, calls, assignments, and control-flow branch nodes.
  - Line range tracking via `node.lineno` and `node.end_lineno`.
  - Cyclomatic complexity branch nodes: `If`, `For`, `While`, `ExceptHandler`, `BoolOp`, `ListComp`, `SetComp`, `DictComp`, `GeneratorExp`, `Match`, `match_case`.

### 2. Python Standard Library `tokenize` Module
- **URL**: https://docs.python.org/3/library/tokenize.html
- **Key Concepts**:
  - `tokenize.tokenize(readline)` for lexical analysis fallback on malformed Python files.
  - Token types: `NAME`, `STRING`, `COMMENT`, `OP`, `NEWLINE`.
  - Used to recover likely class and function declarations (`def`, `class`), import statements (`import`, `from`), and legacy syntax constructs (`print`, `xrange`, `raw_input`) when `ast.parse` fails with `SyntaxError`.

### 3. tree-sitter & tree-sitter-javascript
- **URL**: https://tree-sitter.github.io/tree-sitter/using-parsers/2-execution.html
- **Key Concepts**:
  - `tree_sitter.Language(tree_sitter_javascript.language())` initialization.
  - `tree_sitter.Parser(language)` parsing byte streams (`parser.parse(bytes)`).
  - AST node traversal via `.root_node`, `.children`, `.named_children`, `.type`, `.start_point`, `.end_point`, `.text`.
  - JS construct extraction: `import_statement`, `export_statement`, `call_expression` (`require`), `function_declaration`, `function_expression`, `arrow_function`, `class_declaration`, `method_definition`.
  - Complexity branch nodes: `if_statement`, `ternary_expression`, `for_statement`, `for_in_statement`, `while_statement`, `do_statement`, `catch_clause`, `switch_case`, `binary_expression` (`&&`, `||`, `??`).

### 4. Python Standard Library `concurrent.futures`
- **URL**: https://docs.python.org/3/library/concurrent.futures.html
- **Key Concepts**:
  - `ThreadPoolExecutor` for parallelizing file-level AST parsing across repository files.
  - Thread-pool worker limits (`max_workers = min(8, os.cpu_count() or 4)`) ensuring bounded concurrency and responsive multi-file processing.

### 5. FastAPI Response Models & OpenAPI Schemas
- **URL**: https://fastapi.tiangolo.com/tutorial/response-model/
- **Key Concepts**:
  - `response_model=ProjectAnalysisResponse` for strict schema validation.
  - Pydantic v2 `BaseModel` field serialization and default factory handling.
