import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def parse_pytest_coverage_json(
    coverage_json_path: Path,
    target_relative_files: List[str]
) -> Tuple[Optional[float], Dict[str, Optional[float]], Dict[str, List[int]], Dict[str, List[int]]]:
    """Parses machine-readable JSON coverage produced by pytest-cov / coverage.py.
    
    Returns:
        (overall_coverage_pct, per_file_coverage, covered_lines_by_file, uncovered_lines_by_file)
    """
    if not coverage_json_path.exists():
        return None, {}, {}, {}

    try:
        data = json.loads(coverage_json_path.read_text(encoding="utf-8"))
        files_data = data.get("files", {})

        total_executable_statements = 0
        total_covered_statements = 0

        per_file_cov: Dict[str, Optional[float]] = {}
        covered_lines_map: Dict[str, List[int]] = {}
        uncovered_lines_map: Dict[str, List[int]] = {}

        for file_key, file_info in files_data.items():
            # Normalize file path to relative path
            normalized_file_key = file_key.replace("\\", "/").lstrip("./")
            
            # Find matching target relative path
            matched_rel_path = None
            for target_rel in target_relative_files:
                normalized_target = target_rel.replace("\\", "/").lstrip("./")
                if normalized_file_key == normalized_target or normalized_file_key.endswith(f"/{normalized_target}"):
                    matched_rel_path = target_rel
                    break

            if not matched_rel_path:
                # Exclude tests themselves or non-target files
                continue

            summary = file_info.get("summary", {})
            num_statements = summary.get("num_statements", 0)
            covered_statements = summary.get("covered_lines", 0)
            missing_statements = summary.get("missing_lines", 0)

            executed_lines = file_info.get("executed_lines", [])
            missing_lines = file_info.get("missing_lines", [])

            if num_statements > 0:
                file_pct = round((covered_statements / num_statements) * 100.0, 1)
            else:
                file_pct = 100.0

            per_file_cov[matched_rel_path] = file_pct
            covered_lines_map[matched_rel_path] = executed_lines
            uncovered_lines_map[matched_rel_path] = missing_lines

            total_executable_statements += num_statements
            total_covered_statements += covered_statements

        if total_executable_statements > 0:
            overall_pct = round((total_covered_statements / total_executable_statements) * 100.0, 1)
        else:
            overall_pct = 0.0 if target_relative_files else None

        return overall_pct, per_file_cov, covered_lines_map, uncovered_lines_map

    except Exception:
        return None, {}, {}, {}
