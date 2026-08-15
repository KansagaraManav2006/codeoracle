import logging
import re
from pathlib import Path
from typing import Any, List, Optional, Set, Tuple

import tree_sitter
import tree_sitter_javascript
import tree_sitter_typescript

from app.analysis.complexity import calculate_javascript_treesitter_complexity, summarize_module_complexity
from app.analysis.models import (
    CallInfo,
    ExportInfo,
    ImportInfo,
    ModuleAnalysis,
    ParameterInfo,
    SymbolInfo,
    WarningInfo,
    generate_module_id,
    generate_symbol_id,
)

logger = logging.getLogger(__name__)

# Initialize tree-sitter JavaScript parser
JS_LANGUAGE = tree_sitter.Language(tree_sitter_javascript.language())
TS_LANGUAGE = tree_sitter.Language(tree_sitter_typescript.language_typescript())
TSX_LANGUAGE = tree_sitter.Language(tree_sitter_typescript.language_tsx())


def _get_ts_parser(language: str = "javascript", is_tsx: bool = False) -> tree_sitter.Parser:
    grammar = TSX_LANGUAGE if is_tsx else TS_LANGUAGE if language == "typescript" else JS_LANGUAGE
    return tree_sitter.Parser(grammar)


ENTRY_POINT_FILENAMES = {
    "index.js", "index.jsx", "index.ts", "index.tsx", "index.mjs", "index.cjs",
    "main.js", "main.jsx", "server.js", "app.js", "cli.js"
}


class JavaScriptTreeSitterVisitor:
    def __init__(self, module_id: str, code_bytes: bytes, code_lines: List[str]):
        self.module_id = module_id
        self.code_bytes = code_bytes
        self.code_lines = code_lines
        self.imports: List[ImportInfo] = []
        self.exports: List[ExportInfo] = []
        self.classes: List[SymbolInfo] = []
        self.functions: List[SymbolInfo] = []
        self.variables: List[SymbolInfo] = []
        self.calls: List[CallInfo] = []
        self.legacy_warnings: List[WarningInfo] = []
        self.is_entry_point = False
        self.symbol_complexities: List[int] = []

    def process(self, root_node: Any) -> None:
        self._traverse_top_level(root_node)

    def _get_text(self, node: Any) -> str:
        if node is None:
            return ""
        return node.text.decode("utf-8", errors="replace")

    def _traverse_top_level(self, root_node: Any) -> None:
        for child in root_node.children:
            lineno = child.start_point[0] + 1
            ntype = child.type

            # 1. ES Module Import
            if ntype == "import_statement":
                self._handle_import_statement(child, lineno)

            # 2. ES Module Export
            elif ntype == "export_statement":
                self._handle_export_statement(child, lineno)

            # 3. Variable / Lexical Declaration (const, let, var)
            elif ntype in ("lexical_declaration", "variable_declaration"):
                is_var = child.type == "variable_declaration" or child.text.startswith(b"var ")
                if is_var:
                    self.legacy_warnings.append(
                        WarningInfo(
                            code="VAR_USAGE",
                            message="Use of 'var' keyword. Prefer block-scoped 'const' or 'let'.",
                            line=lineno,
                            severity="warning",
                        )
                    )

                self._handle_variable_declaration(child, lineno)

            # 4. Function Declaration
            elif ntype == "function_declaration":
                fn_symbol = self._parse_function_node(child, qualified_prefix="", lineno=lineno)
                self.functions.append(fn_symbol)
                self.symbol_complexities.append(fn_symbol.complexity)
                self.exports.append(ExportInfo(name=fn_symbol.name, kind="function", source_line=lineno))

            # 5. Class Declaration
            elif ntype == "class_declaration":
                self._handle_class_declaration(child, lineno)

            # 6. Expression Statements (Require, CommonJS exports, function calls)
            elif ntype == "expression_statement":
                self._handle_expression_statement(child, lineno)

            # Scan recursively for calls and warnings inside
            self._scan_node_risks_and_calls(child)

    def _handle_import_statement(self, node: Any, lineno: int) -> None:
        source_mod = ""
        imported_syms = []

        for child in node.children:
            if child.type == "string":
                source_mod = self._get_text(child).strip("'\"")
            elif child.type == "import_clause":
                imported_syms.append(self._get_text(child))

        is_rel = source_mod.startswith(".")
        self.imports.append(
            ImportInfo(
                module_name=source_mod,
                imported_symbols=imported_syms,
                is_relative=is_rel,
                source_line=lineno,
            )
        )

    def _handle_export_statement(self, node: Any, lineno: int) -> None:
        text = self._get_text(node)
        is_default = "default" in text

        for child in node.children:
            if child.type in ("function_declaration", "generator_function_declaration"):
                fn_symbol = self._parse_function_node(child, qualified_prefix="", lineno=lineno)
                self.functions.append(fn_symbol)
                self.symbol_complexities.append(fn_symbol.complexity)
                self.exports.append(
                    ExportInfo(
                        name=fn_symbol.name or "default",
                        kind="default" if is_default else "function",
                        source_line=lineno,
                    )
                )

            elif child.type == "class_declaration":
                self._handle_class_declaration(child, lineno, is_export=True)

            elif child.type in ("lexical_declaration", "variable_declaration"):
                self._handle_variable_declaration(child, lineno, is_export=True)

            elif child.type == "identifier":
                sym_name = self._get_text(child)
                self.exports.append(
                    ExportInfo(
                        name=sym_name,
                        kind="default" if is_default else "variable",
                        source_line=lineno,
                    )
                )

    def _handle_variable_declaration(self, node: Any, lineno: int, is_export: bool = False) -> None:
        for child in node.children:
            if child.type == "variable_declarator":
                name_node = child.child_by_field_name("name")
                val_node = child.child_by_field_name("value")

                if name_node:
                    var_name = self._get_text(name_node)

                    # Check if variable is assigned require('...')
                    if val_node and val_node.type == "call_expression":
                        fn_node = val_node.child_by_field_name("function")
                        if fn_node and self._get_text(fn_node) == "require":
                            args_node = val_node.child_by_field_name("arguments")
                            if args_node and args_node.children:
                                req_path = self._get_text(args_node.children[1]).strip("'\"")
                                is_rel = req_path.startswith(".")
                                self.imports.append(
                                    ImportInfo(
                                        module_name=req_path,
                                        imported_symbols=[var_name],
                                        is_relative=is_rel,
                                        source_line=lineno,
                                        import_kind="require",
                                    )
                                )
                                self.legacy_warnings.append(
                                    WarningInfo(
                                        code="COMMONJS_USAGE",
                                        message=f"Use of CommonJS require('{req_path}'). Prefer ES module import syntax.",
                                        line=lineno,
                                        severity="info",
                                    )
                                )

                    # Check if variable is function expression or arrow function
                    if val_node and val_node.type in ("arrow_function", "function_expression"):
                        fn_symbol = self._parse_function_node(
                            val_node, qualified_prefix="", lineno=lineno, override_name=var_name
                        )
                        self.functions.append(fn_symbol)
                        self.symbol_complexities.append(fn_symbol.complexity)
                        if is_export:
                            self.exports.append(ExportInfo(name=var_name, kind="function", source_line=lineno))
                    else:
                        var_id = generate_symbol_id(self.module_id, "variable", var_name, lineno)
                        self.variables.append(
                            SymbolInfo(
                                symbol_id=var_id,
                                kind="variable",
                                name=var_name,
                                qualified_name=var_name,
                                start_line=lineno,
                                end_line=child.end_point[0] + 1,
                            )
                        )
                        if is_export:
                            self.exports.append(ExportInfo(name=var_name, kind="variable", source_line=lineno))

    def _handle_class_declaration(self, node: Any, lineno: int, is_export: bool = False) -> None:
        name_node = node.child_by_field_name("name")
        class_name = self._get_text(name_node) if name_node else "AnonymousClass"

        start_line = node.start_point[0] + 1
        end_line = node.end_point[0] + 1

        body_node = node.child_by_field_name("body")
        if body_node:
            for child in body_node.children:
                if child.type == "method_definition":
                    m_name_node = child.child_by_field_name("name")
                    m_name = self._get_text(m_name_node) if m_name_node else "method"
                    m_kind = "constructor" if m_name == "constructor" else "method"

                    method_symbol = self._parse_function_node(
                        child,
                        qualified_prefix=class_name,
                        lineno=child.start_point[0] + 1,
                        override_name=m_name,
                        override_kind=m_kind,
                    )
                    self.symbol_complexities.append(method_symbol.complexity)

        sym_id = generate_symbol_id(self.module_id, "class", class_name, start_line)

        class_symbol = SymbolInfo(
            symbol_id=sym_id,
            kind="class",
            name=class_name,
            qualified_name=class_name,
            start_line=start_line,
            end_line=end_line,
            complexity=1,
        )

        self.classes.append(class_symbol)
        self.exports.append(ExportInfo(name=class_name, kind="class", source_line=start_line))

    def _handle_expression_statement(self, node: Any, lineno: int) -> None:
        text = self._get_text(node)

        # Detect CommonJS module.exports = ... or exports.foo = ...
        if "module.exports" in text or text.startswith("exports."):
            self.legacy_warnings.append(
                WarningInfo(
                    code="COMMONJS_EXPORTS",
                    message="Use of CommonJS module.exports assignment. Prefer ES module export syntax.",
                    line=lineno,
                    severity="info",
                )
            )
            # Extract export name if exports.foo = bar
            match = re.search(r"exports\.([a-zA-Z0-9_$]+)\s*=", text)
            if match:
                self.exports.append(ExportInfo(name=match.group(1), kind="variable", source_line=lineno))
            elif "module.exports" in text:
                self.exports.append(ExportInfo(name="default", kind="default", source_line=lineno))

        # Detect Express/HTTP entry point calls: app.listen(...) or server.listen(...)
        if ".listen(" in text or "http.createServer(" in text:
            self.is_entry_point = True

    def _parse_function_node(
        self,
        node: Any,
        qualified_prefix: str,
        lineno: int,
        override_name: Optional[str] = None,
        override_kind: Optional[str] = None,
    ) -> SymbolInfo:
        name_node = node.child_by_field_name("name")
        fname = override_name or (self._get_text(name_node) if name_node else "anonymous")

        qname = f"{qualified_prefix}.{fname}" if qualified_prefix else fname
        kind = override_kind or ("method" if qualified_prefix else "function")
        is_async = node.text.startswith(b"async ") or b" async " in node.text[:50]

        start_line = node.start_point[0] + 1
        end_line = node.end_point[0] + 1

        # Extract parameters
        params = []
        params_node = node.child_by_field_name("parameters")
        if params_node:
            for pchild in params_node.children:
                if pchild.type in ("identifier", "required_parameter", "optional_parameter", "assignment_pattern"):
                    pname = self._get_text(pchild)
                    if "=" in pname:
                        parts = pname.split("=")
                        params.append(ParameterInfo(name=parts[0].strip(), default=parts[1].strip()))
                    else:
                        params.append(ParameterInfo(name=pname))

        fn_warnings: List[WarningInfo] = []
        param_names = [p.name.lower() for p in params]
        if any(cb_term in param_names for cb_term in ("cb", "callback", "next", "done")):
            fn_warnings.append(
                WarningInfo(
                    code="CALLBACK_HEAVY",
                    message=f"Function '{qname}' uses callback pattern instead of Async/Await or Promises.",
                    line=lineno,
                    severity="warning",
                )
            )

        # Recursively scan function body for calls, eval, and loose equality
        self._scan_node_risks_and_calls(node, fn_warnings)

        comp_score = calculate_javascript_treesitter_complexity(node)
        if comp_score > 10:
            fn_warnings.append(
                WarningInfo(
                    code="HIGH_COMPLEXITY",
                    message=f"Function '{qname}' has high cyclomatic complexity ({comp_score}).",
                    line=lineno,
                    severity="warning",
                )
            )

        sym_id = generate_symbol_id(self.module_id, kind, qname, start_line)

        return SymbolInfo(
            symbol_id=sym_id,
            kind=kind,
            name=fname,
            qualified_name=qname,
            parameters=params,
            is_async=is_async,
            start_line=start_line,
            end_line=end_line,
            complexity=comp_score,
            legacy_warnings=fn_warnings,
        )

    def _scan_node_risks_and_calls(self, node: Any, target_fn_warnings: Optional[List[WarningInfo]] = None) -> None:
        """Recursively scans node subtree for call expressions and risk indicators."""
        if node is None:
            return

        ntype = node.type
        lineno = node.start_point[0] + 1

        if ntype == "call_expression":
            fn_child = node.child_by_field_name("function")
            if fn_child:
                cname = self._get_text(fn_child)
                self.calls.append(CallInfo(caller_qualified_name="", target_name=cname, source_line=lineno))

                if cname == "eval":
                    w = WarningInfo(
                        code="EVAL_EXEC_USAGE",
                        message="Use of 'eval()' presents severe security and static-analysis risks.",
                        line=lineno,
                        severity="risk",
                    )
                    self.legacy_warnings.append(w)
                    if target_fn_warnings is not None:
                        target_fn_warnings.append(w)
                elif cname == "Function":
                    w = WarningInfo(
                        code="EVAL_EXEC_USAGE",
                        message="Use of 'new Function()' presents security and static-analysis risks.",
                        line=lineno,
                        severity="risk",
                    )
                    self.legacy_warnings.append(w)
                    if target_fn_warnings is not None:
                        target_fn_warnings.append(w)

        elif ntype == "binary_expression":
            text = self._get_text(node)
            if " == " in text or " != " in text:
                if " === " not in text and " !== " not in text:
                    w = WarningInfo(
                        code="LOOSE_EQUALITY",
                        message="Loose equality operator ('==' or '!=') used. Prefer strict ('===' or '!==').",
                        line=lineno,
                        severity="warning",
                    )
                    self.legacy_warnings.append(w)
                    if target_fn_warnings is not None:
                        target_fn_warnings.append(w)

        for child in node.children:
            self._scan_node_risks_and_calls(child, target_fn_warnings)


def analyze_javascript_source(
    project_id: str,
    relative_path: str,
    absolute_path: Path,
    language: str = "javascript",
) -> ModuleAnalysis:
    """
    Primary entry point for analyzing JavaScript and TypeScript source files.
    Selects the TypeScript or TSX grammar for typed source extensions.
    """
    if language not in {"javascript", "typescript"}:
        raise ValueError(f"Unsupported ECMAScript language: {language}")

    module_id = generate_module_id(project_id, relative_path)

    try:
        raw_text = absolute_path.read_text(encoding="utf-8", errors="replace")
        code_bytes = absolute_path.read_bytes()
    except Exception as e:
        return ModuleAnalysis(
            module_id=module_id,
            relative_path=relative_path,
            language=language,
            line_count=0,
            parse_status="failed",
            parse_errors=[f"Failed to read file: {str(e)}"],
        )

    code_lines = raw_text.splitlines()
    line_count = len(code_lines)

    # Check if filename indicates entry point
    fname = Path(relative_path).name.lower()
    is_filename_entry = fname in ENTRY_POINT_FILENAMES

    try:
        parser = _get_ts_parser(language, Path(relative_path).suffix.lower() == ".tsx")
        tree = parser.parse(code_bytes)
        root_node = tree.root_node

        has_parse_error = root_node.has_error

        visitor = JavaScriptTreeSitterVisitor(module_id, code_bytes, code_lines)
        visitor.process(root_node)

        comp_summary = summarize_module_complexity(visitor.symbol_complexities)

        # Aggregate all warnings (module-level + symbol-level)
        all_warnings = list(visitor.legacy_warnings)
        for c in visitor.classes:
            all_warnings.extend(c.legacy_warnings)
        for f in visitor.functions:
            all_warnings.extend(f.legacy_warnings)

        dedup_warnings = list({(w.code, w.line, w.message): w for w in all_warnings}.values())

        parse_status = "partial" if has_parse_error else "complete"
        parse_errors = ["Tree-sitter reported parse syntax errors in file."] if has_parse_error else []

        return ModuleAnalysis(
            module_id=module_id,
            relative_path=relative_path,
            language=language,
            line_count=line_count,
            parse_status=parse_status,
            parse_errors=parse_errors,
            imports=visitor.imports,
            exports=visitor.exports,
            classes=visitor.classes,
            functions=visitor.functions,
            variables=visitor.variables,
            calls=visitor.calls,
            is_entry_point=visitor.is_entry_point or is_filename_entry,
            complexity=comp_summary,
            legacy_warnings=dedup_warnings,
            start_line=1,
            end_line=max(line_count, 1),
        )

    except Exception as e:
        language_label = "TypeScript" if language == "typescript" else "JavaScript"
        logger.warning("Tree-sitter %s parser failed on %s: %s", language_label, relative_path, str(e))
        safe_err = f"{language_label} parse error: {str(e)}"
        return ModuleAnalysis(
            module_id=module_id,
            relative_path=relative_path,
            language=language,
            line_count=line_count,
            parse_status="failed",
            parse_errors=[safe_err],
            is_entry_point=is_filename_entry,
            complexity=summarize_module_complexity([]),
            start_line=1,
            end_line=max(line_count, 1),
        )
