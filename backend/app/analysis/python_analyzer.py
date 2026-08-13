import ast
import io
import logging
import tokenize
from pathlib import Path
from typing import Any, List, Optional, Set, Tuple

from app.analysis.complexity import calculate_python_ast_complexity, summarize_module_complexity
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

DEPRECATED_PYTHON_MODULES = {
    "imp", "optparse", "cgi", "asyncore", "smtpd", "nntplib",
    "telnetlib", "pipes", "audioop", "formatter", "spwd", "aifc", "sunau"
}


class PythonASTVisitor(ast.NodeVisitor):
    def __init__(self, module_id: str, code_lines: List[str]):
        self.module_id = module_id
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

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            mod_name = alias.name
            sym_name = alias.asname or alias.name
            self.imports.append(
                ImportInfo(
                    module_name=mod_name,
                    imported_symbols=[sym_name],
                    is_relative=False,
                    source_line=node.lineno,
                )
            )
            base_mod = mod_name.split(".")[0]
            if base_mod in DEPRECATED_PYTHON_MODULES:
                self.legacy_warnings.append(
                    WarningInfo(
                        code="DEPRECATED_MODULE",
                        message=f"Use of deprecated Python module '{base_mod}'.",
                        line=node.lineno,
                        severity="warning",
                    )
                )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        mod_name = node.module or ""
        is_rel = node.level > 0
        symbols = []

        for alias in node.names:
            if alias.name == "*":
                symbols.append("*")
                self.legacy_warnings.append(
                    WarningInfo(
                        code="WILDCARD_IMPORT",
                        message=f"Wildcard import 'from {mod_name} import *' hampers static analysis.",
                        line=node.lineno,
                        severity="warning",
                    )
                )
            else:
                symbols.append(alias.asname or alias.name)

        prefix = "." * node.level if is_rel else ""
        full_mod = f"{prefix}{mod_name}"

        self.imports.append(
            ImportInfo(
                module_name=full_mod,
                imported_symbols=symbols,
                is_relative=is_rel,
                source_line=node.lineno,
            )
        )

        base_mod = mod_name.split(".")[0] if mod_name else ""
        if base_mod in DEPRECATED_PYTHON_MODULES:
            self.legacy_warnings.append(
                WarningInfo(
                    code="DEPRECATED_MODULE",
                    message=f"Use of deprecated Python module '{base_mod}'.",
                    line=node.lineno,
                    severity="warning",
                )
            )

        self.generic_visit(node)

    def visit_If(self, node: ast.If):
        if isinstance(node.test, ast.Compare):
            left = node.test.left
            if isinstance(left, ast.Name) and left.id == "__name__":
                for comparator in node.test.comparators:
                    if isinstance(comparator, ast.Constant) and comparator.value == "__main__":
                        self.is_entry_point = True
                    elif isinstance(comparator, ast.Str) and comparator.s == "__main__":
                        self.is_entry_point = True
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef):
        class_warnings = []
        bases = []

        for base in node.bases:
            if isinstance(base, ast.Name):
                bases.append(base.id)
            elif isinstance(base, ast.Attribute):
                bases.append(f"{self._get_attribute_name(base)}")

        docstring = ast.get_docstring(node)
        decorators = [self._get_decorator_name(d) for d in node.decorator_list]
        start_line = node.lineno
        end_line = getattr(node, "end_lineno", start_line)

        methods = []
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                method_symbol = self._parse_function_symbol(item, qualified_prefix=node.name, is_method=True)
                methods.append(method_symbol)
                self.symbol_complexities.append(method_symbol.complexity)

        sym_id = generate_symbol_id(self.module_id, "class", node.name, start_line)

        class_symbol = SymbolInfo(
            symbol_id=sym_id,
            kind="class",
            name=node.name,
            qualified_name=node.name,
            decorators=decorators,
            docstring=docstring,
            start_line=start_line,
            end_line=end_line,
            complexity=1,
            legacy_warnings=class_warnings,
        )

        self.classes.append(class_symbol)
        self.exports.append(ExportInfo(name=node.name, kind="class", source_line=start_line))

        for item in node.body:
            if not isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.visit(item)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        fn_symbol = self._parse_function_symbol(node, qualified_prefix="", is_method=False)
        self.functions.append(fn_symbol)
        self.symbol_complexities.append(fn_symbol.complexity)
        self.exports.append(ExportInfo(name=node.name, kind="function", source_line=node.lineno))

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        fn_symbol = self._parse_function_symbol(node, qualified_prefix="", is_method=False)
        self.functions.append(fn_symbol)
        self.symbol_complexities.append(fn_symbol.complexity)
        self.exports.append(ExportInfo(name=node.name, kind="function", source_line=node.lineno))

    def visit_Assign(self, node: ast.Assign):
        if self._is_module_level(node):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    var_id = generate_symbol_id(self.module_id, "variable", target.id, node.lineno)
                    self.variables.append(
                        SymbolInfo(
                            symbol_id=var_id,
                            kind="variable",
                            name=target.id,
                            qualified_name=target.id,
                            start_line=node.lineno,
                            end_line=getattr(node, "end_lineno", node.lineno),
                        )
                    )
                    self.exports.append(ExportInfo(name=target.id, kind="variable", source_line=node.lineno))

            # Module level call check in assignment
            if isinstance(node.value, ast.Call):
                call_name = self._get_call_name(node.value.func)
                if call_name in ("eval", "exec"):
                    self.legacy_warnings.append(
                        WarningInfo(
                            code="EVAL_EXEC_USAGE",
                            message=f"Use of '{call_name}()' presents severe security risks.",
                            line=node.lineno,
                            severity="risk",
                        )
                    )
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        call_name = self._get_call_name(node.func)
        if call_name:
            self.calls.append(
                CallInfo(
                    caller_qualified_name="",
                    target_name=call_name,
                    source_line=node.lineno,
                )
            )

            if call_name in ("eval", "exec"):
                self.legacy_warnings.append(
                    WarningInfo(
                        code="EVAL_EXEC_USAGE",
                        message=f"Use of '{call_name}()' presents severe security and static-analysis risks.",
                        line=node.lineno,
                        severity="risk",
                    )
                )
            elif call_name in ("xrange", "raw_input"):
                self.legacy_warnings.append(
                    WarningInfo(
                        code="LEGACY_PYTHON2_CONSTRUCT",
                        message=f"Use of Python 2 built-in '{call_name}'. Replace with Python 3 equivalent.",
                        line=node.lineno,
                        severity="warning",
                    )
                )

        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler):
        if node.type is None:
            self.legacy_warnings.append(
                WarningInfo(
                    code="BARE_EXCEPT",
                    message="Bare 'except:' handler catches SystemExit and KeyboardInterrupt. Use 'except Exception:'.",
                    line=node.lineno,
                    severity="warning",
                )
            )
        self.generic_visit(node)

    def _parse_function_symbol(self, node: Any, qualified_prefix: str, is_method: bool) -> SymbolInfo:
        qname = f"{qualified_prefix}.{node.name}" if qualified_prefix else node.name
        kind = "method" if is_method else ("function")
        is_async = isinstance(node, ast.AsyncFunctionDef)
        docstring = ast.get_docstring(node)
        decorators = [self._get_decorator_name(d) for d in node.decorator_list]
        start_line = node.lineno
        end_line = getattr(node, "end_lineno", start_line)

        params = []
        fn_warnings = []

        args = node.args
        defaults_offset = len(args.args) - len(args.defaults)

        for i, arg in enumerate(args.args):
            default_val = None
            if i >= defaults_offset:
                def_node = args.defaults[i - defaults_offset]
                default_val = self._ast_to_source(def_node)
                if isinstance(def_node, (ast.List, ast.Dict, ast.Set)):
                    fn_warnings.append(
                        WarningInfo(
                            code="MUTABLE_DEFAULT_ARG",
                            message=f"Parameter '{arg.arg}' has mutable default argument '{default_val}'.",
                            line=node.lineno,
                            severity="warning",
                        )
                    )

            annot_str = self._ast_to_source(arg.annotation) if arg.annotation else None
            params.append(ParameterInfo(name=arg.arg, default=default_val, annotation=annot_str))

        if args.vararg:
            params.append(ParameterInfo(name=f"*{args.vararg.arg}"))
        if args.kwarg:
            params.append(ParameterInfo(name=f"**{args.kwarg.arg}"))

        ret_annot = self._ast_to_source(node.returns) if node.returns else None

        comp_score = calculate_python_ast_complexity(node)
        if comp_score > 10:
            fn_warnings.append(
                WarningInfo(
                    code="HIGH_COMPLEXITY",
                    message=f"Function '{qname}' has high cyclomatic complexity ({comp_score}).",
                    line=node.lineno,
                    severity="warning",
                )
            )

        direct_calls = []
        for inner_node in ast.walk(node):
            if isinstance(inner_node, ast.Call):
                cname = self._get_call_name(inner_node.func)
                if cname:
                    if cname not in direct_calls:
                        direct_calls.append(cname)
                    if cname in ("eval", "exec"):
                        fn_warnings.append(
                            WarningInfo(
                                code="EVAL_EXEC_USAGE",
                                message=f"Use of '{cname}()' presents severe security risks.",
                                line=inner_node.lineno,
                                severity="risk",
                            )
                        )
                    elif cname in ("xrange", "raw_input"):
                        fn_warnings.append(
                            WarningInfo(
                                code="LEGACY_PYTHON2_CONSTRUCT",
                                message=f"Use of Python 2 built-in '{cname}'.",
                                line=inner_node.lineno,
                                severity="warning",
                            )
                        )

            elif isinstance(inner_node, ast.ExceptHandler):
                if inner_node.type is None:
                    fn_warnings.append(
                        WarningInfo(
                            code="BARE_EXCEPT",
                            message="Bare 'except:' handler catches SystemExit. Use 'except Exception:'.",
                            line=inner_node.lineno,
                            severity="warning",
                        )
                    )

        sym_id = generate_symbol_id(self.module_id, kind, qname, start_line)

        return SymbolInfo(
            symbol_id=sym_id,
            kind=kind,
            name=node.name,
            qualified_name=qname,
            parameters=params,
            return_annotation=ret_annot,
            decorators=decorators,
            is_async=is_async,
            docstring=docstring,
            start_line=start_line,
            end_line=end_line,
            direct_calls=direct_calls,
            complexity=comp_score,
            legacy_warnings=fn_warnings,
        )

    def _get_call_name(self, node: ast.AST) -> Optional[str]:
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            val_name = self._get_call_name(node.value)
            return f"{val_name}.{node.attr}" if val_name else node.attr
        return None

    def _get_attribute_name(self, node: ast.Attribute) -> str:
        if isinstance(node.value, ast.Name):
            return f"{node.value.id}.{node.attr}"
        elif isinstance(node.value, ast.Attribute):
            return f"{self._get_attribute_name(node.value)}.{node.attr}"
        return node.attr

    def _get_decorator_name(self, node: ast.AST) -> str:
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Call):
            return self._get_decorator_name(node.func)
        elif isinstance(node, ast.Attribute):
            return self._get_attribute_name(node)
        return "decorator"

    def _ast_to_source(self, node: Optional[ast.AST]) -> Optional[str]:
        if node is None:
            return None
        try:
            return ast.unparse(node)
        except Exception:
            if isinstance(node, ast.Name):
                return node.id
            if isinstance(node, ast.Constant):
                return repr(node.value)
            return "expr"

    def _is_module_level(self, node: ast.AST) -> bool:
        return getattr(node, "col_offset", 0) == 0


def fallback_python_tokenize_analysis(
    file_content: str, module_id: str
) -> Tuple[List[ImportInfo], List[SymbolInfo], List[SymbolInfo], List[WarningInfo]]:
    """
    Lexical token scanner fallback when Python `ast.parse` fails with SyntaxError.
    Extracts likely imports, classes, functions, and legacy Python 2 indicators safely.
    """
    imports: List[ImportInfo] = []
    classes: List[SymbolInfo] = []
    functions: List[SymbolInfo] = []
    legacy_warnings: List[WarningInfo] = []

    try:
        readline = io.StringIO(file_content).readline
        tokens = list(tokenize.generate_tokens(readline))

        i = 0
        n_tokens = len(tokens)

        while i < n_tokens:
            tok = tokens[i]
            tok_str = tok.string
            lineno = tok.start[0]

            if tok_str == "import":
                if i + 1 < n_tokens and tokens[i + 1].type == tokenize.NAME:
                    mod_name = tokens[i + 1].string
                    imports.append(ImportInfo(module_name=mod_name, imported_symbols=[mod_name], source_line=lineno))
            elif tok_str == "from":
                if i + 1 < n_tokens and tokens[i + 1].type == tokenize.NAME:
                    mod_name = tokens[i + 1].string
                    imports.append(ImportInfo(module_name=mod_name, is_relative=False, source_line=lineno))

            elif tok_str == "class":
                if i + 1 < n_tokens and tokens[i + 1].type == tokenize.NAME:
                    cname = tokens[i + 1].string
                    sym_id = generate_symbol_id(module_id, "class", cname, lineno)
                    classes.append(
                        SymbolInfo(
                            symbol_id=sym_id,
                            kind="class",
                            name=cname,
                            qualified_name=cname,
                            start_line=lineno,
                            end_line=lineno,
                        )
                    )

            elif tok_str == "def":
                if i + 1 < n_tokens and tokens[i + 1].type == tokenize.NAME:
                    fname = tokens[i + 1].string
                    sym_id = generate_symbol_id(module_id, "function", fname, lineno)
                    functions.append(
                        SymbolInfo(
                            symbol_id=sym_id,
                            kind="function",
                            name=fname,
                            qualified_name=fname,
                            start_line=lineno,
                            end_line=lineno,
                        )
                    )

            elif tok_str == "print" and (i + 1 < n_tokens and tokens[i + 1].type == tokenize.STRING):
                legacy_warnings.append(
                    WarningInfo(
                        code="LEGACY_PYTHON2_PRINT",
                        message="Python 2 print statement without parentheses.",
                        line=lineno,
                        severity="warning",
                    )
                )
            elif tok_str in ("xrange", "raw_input", "iteritems", "iterkeys", "itervalues"):
                legacy_warnings.append(
                    WarningInfo(
                        code="LEGACY_PYTHON2_CONSTRUCT",
                        message=f"Use of Python 2 construct '{tok_str}'.",
                        line=lineno,
                        severity="warning",
                    )
                )

            i += 1

    except Exception as e:
        logger.warning("Lexical fallback tokenizer encountered error on module %s: %s", module_id, str(e))

    return imports, classes, functions, legacy_warnings


def analyze_python_source(project_id: str, relative_path: str, absolute_path: Path) -> ModuleAnalysis:
    """
    Primary entry point for analyzing a Python source file.
    Attempts strict AST parsing first; falls back to tokenizing on syntax error.
    """
    module_id = generate_module_id(project_id, relative_path)

    try:
        raw_text = absolute_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return ModuleAnalysis(
            module_id=module_id,
            relative_path=relative_path,
            language="python",
            line_count=0,
            parse_status="failed",
            parse_errors=[f"Failed to read file: {str(e)}"],
        )

    code_lines = raw_text.splitlines()
    line_count = len(code_lines)

    try:
        parsed_ast = ast.parse(raw_text, filename=relative_path)
        visitor = PythonASTVisitor(module_id, code_lines)
        visitor.visit(parsed_ast)

        comp_summary = summarize_module_complexity(visitor.symbol_complexities)

        # Aggregate all warnings (module-level + symbol-level)
        all_warnings = list(visitor.legacy_warnings)
        for c in visitor.classes:
            all_warnings.extend(c.legacy_warnings)
        for f in visitor.functions:
            all_warnings.extend(f.legacy_warnings)

        dedup_warnings = list({(w.code, w.line, w.message): w for w in all_warnings}.values())

        return ModuleAnalysis(
            module_id=module_id,
            relative_path=relative_path,
            language="python",
            line_count=line_count,
            parse_status="complete",
            imports=visitor.imports,
            exports=visitor.exports,
            classes=visitor.classes,
            functions=visitor.functions,
            variables=visitor.variables,
            calls=visitor.calls,
            is_entry_point=visitor.is_entry_point,
            complexity=comp_summary,
            legacy_warnings=dedup_warnings,
            start_line=1,
            end_line=max(line_count, 1),
        )

    except SyntaxError as se:
        logger.warning("SyntaxError in %s at line %s: %s. Using lexical fallback.", relative_path, se.lineno, se.msg)
        safe_msg = "Python parser could not fully parse this file."

        fallback_imports, fallback_classes, fallback_functions, fallback_warnings = fallback_python_tokenize_analysis(
            raw_text, module_id
        )

        all_warnings = [
            WarningInfo(code="SYNTAX_ERROR", message=safe_msg, line=se.lineno, severity="risk")
        ] + fallback_warnings

        comp_summary = summarize_module_complexity([f.complexity for f in fallback_functions])

        return ModuleAnalysis(
            module_id=module_id,
            relative_path=relative_path,
            language="python",
            line_count=line_count,
            parse_status="partial",
            parse_errors=[safe_msg],
            imports=fallback_imports,
            classes=fallback_classes,
            functions=fallback_functions,
            complexity=comp_summary,
            legacy_warnings=all_warnings,
            start_line=1,
            end_line=max(line_count, 1),
        )
