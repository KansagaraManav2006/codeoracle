from typing import List, Optional
from app.analysis.models import (
    ModuleAnalysis,
    ModuleExplanation,
    ProjectAnalysis,
    ProjectExplanation,
    SymbolExplanation,
    SymbolInfo,
)


def generate_symbol_explanation(sym: SymbolInfo) -> SymbolExplanation:
    """Generates a grounded deterministic explanation for a symbol (function, method, class, variable)."""
    kind_title = sym.kind.capitalize()
    async_prefix = "asynchronous " if sym.is_async else ""

    # Summary
    if sym.docstring:
        clean_doc = sym.docstring.split("\n")[0].strip()
        summary = f"{kind_title} `{sym.name}`: {clean_doc}"
    else:
        summary = f"This {async_prefix}{sym.kind} is named `{sym.name}`. Its exact purpose is not documented, so the description is based on its name and code structure."

    # Inputs
    if sym.parameters:
        param_strs = []
        for p in sym.parameters:
            p_desc = p.name
            if p.annotation:
                p_desc += f": {p.annotation}"
            if p.default is not None:
                p_desc += f" = {p.default}"
            param_strs.append(p_desc)
        inputs_summary = f"Inputs: {', '.join(param_strs)}."
    else:
        inputs_summary = "Accepts no parameters."

    # Returns
    if sym.return_annotation:
        returns_summary = f"Returns: {sym.return_annotation}."
    else:
        returns_summary = "The return type is not declared in the code."

    # Side effects & calls
    if sym.direct_calls:
        calls_str = ", ".join(sym.direct_calls[:5])
        side_effects = f"It calls: {calls_str}."
    else:
        side_effects = "No direct function calls were detected."

    return SymbolExplanation(
        summary=summary,
        inputs_summary=inputs_summary,
        returns_summary=returns_summary,
        side_effects=side_effects,
        uncertainty_label="Based on static analysis; the code was not executed.",
    )


def generate_module_explanation(mod: ModuleAnalysis) -> ModuleExplanation:
    """Generates a grounded deterministic explanation for a module."""
    # Responsibility inference
    rel_path = mod.relative_path
    if mod.is_entry_point:
        resp = f"`{rel_path}` is where this part of the program starts."
    elif "test" in rel_path.lower():
        resp = f"`{rel_path}` contains tests or testing helpers."
    elif "util" in rel_path.lower() or "helper" in rel_path.lower():
        resp = f"`{rel_path}` provides reusable helper functions."
    elif "model" in rel_path.lower() or "schema" in rel_path.lower():
        resp = f"`{rel_path}` defines the project's data structures."
    elif "api" in rel_path.lower() or "route" in rel_path.lower() or "controller" in rel_path.lower():
        resp = f"`{rel_path}` handles API requests and routes."
    else:
        names = [s.name for s in [*mod.classes, *mod.functions][:4]]
        if names:
            resp = f"`{rel_path}` contains the main logic for {', '.join(names)}."
        else:
            resp = f"`{rel_path}` contains {mod.language.capitalize()} project logic."

    # Classes & functions summary
    n_classes = len(mod.classes)
    n_functions = len(mod.functions)
    cf_summary = f"It contains {n_classes} classes and {n_functions} functions or methods."

    # Dependencies summary
    n_imports = len(mod.imports)
    n_exports = len(mod.exports)
    dep_summary = f"It uses {n_imports} dependencies and exposes {n_exports} items."

    # Entry point indicator
    entry_indicator = "Yes — the program can start here." if mod.is_entry_point else "No — this file is used by other code."

    # Warnings summary
    if mod.legacy_warnings:
        warn_codes = list({w.code for w in mod.legacy_warnings})
        warn_summary = f"Identified {len(mod.legacy_warnings)} warning(s): {', '.join(warn_codes)}."
    else:
        warn_summary = "No legacy or risk warnings detected."

    return ModuleExplanation(
        responsibility=resp,
        classes_functions_summary=cf_summary,
        dependencies_summary=dep_summary,
        entry_point_indicator=entry_indicator,
        warnings_summary=warn_summary,
    )


def generate_project_explanation(proj: ProjectAnalysis) -> ProjectExplanation:
    """Generates a grounded deterministic project-level explanation synthesis."""
    language_names = {"python": "Python", "javascript": "JavaScript", "typescript": "TypeScript"}
    langs = " and ".join(language_names.get(lang, lang.title()) for lang in proj.languages) or "an unknown language"
    file_word = "file" if proj.total_files == 1 else "files"
    lang_summary = f"This is a {langs} project with {proj.total_files} code {file_word} and {proj.total_lines} lines of code."

    if proj.entry_points:
        entry_summary = f"The program appears to start in {', '.join(proj.entry_points[:3])}."
    else:
        entry_summary = "No clear starting file was found; this may be a library used by another program."

    # Major modules
    sorted_mods = sorted(proj.modules, key=lambda m: m.line_count, reverse=True)
    module_descriptions = []
    for module in sorted_mods[:3]:
        names = [s.name for s in [*module.classes, *module.functions][:3]]
        if names:
            module_descriptions.append(f"{module.relative_path} provides {', '.join(names)}")
        else:
            module_descriptions.append(module.relative_path)
    major_summary = "Important files: " + "; ".join(module_descriptions) + "."

    # Dependencies
    resolved_edges = sum(1 for e in proj.dependency_edges if e.resolved)
    unresolved_edges = len(proj.dependency_edges) - resolved_edges
    dep_summary = f"The files have {resolved_edges} internal connection(s) and use {unresolved_edges} external dependency reference(s)."

    # Architectural observations
    arch_obs = []
    if len(proj.languages) > 1:
        displayed_languages = [language_names.get(lang, lang.title()) for lang in proj.languages]
        arch_obs.append(f"The project combines {', '.join(displayed_languages[:-1])} and {displayed_languages[-1]} code.")
    elif "python" in proj.languages:
        arch_obs.append("The project is organized as Python modules that share functions and data.")
    elif "javascript" in proj.languages:
        arch_obs.append("The project is organized as JavaScript modules that import and export code.")
    elif "typescript" in proj.languages:
        arch_obs.append("The project is organized as typed TypeScript modules that import and export code.")

    # Hotspots
    hotspots = []
    for m in proj.modules:
        if m.complexity.hotspots_count > 0:
            hotspots.append(f"Module '{m.relative_path}' has {m.complexity.hotspots_count} high-complexity function(s).")

    # Legacy risks
    legacy_risks = []
    for m in proj.modules:
        for w in m.legacy_warnings:
            if w.severity in ("risk", "warning"):
                legacy_risks.append(f"'{m.relative_path}' [Line {w.line or 1}]: {w.message}")

    # Parse limitations
    parse_limits = []
    for m in proj.modules:
        if m.parse_status != "complete":
            parse_limits.append(f"Module '{m.relative_path}' parsed with status '{m.parse_status}' ({', '.join(m.parse_errors)}).")

    return ProjectExplanation(
        languages_summary=lang_summary,
        entry_points_summary=entry_summary,
        major_modules_summary=major_summary,
        dependencies_summary=dep_summary,
        architectural_observations=arch_obs,
        complexity_hotspots=hotspots[:5],
        legacy_risks=legacy_risks[:10],
        parse_limitations=parse_limits[:5],
    )
