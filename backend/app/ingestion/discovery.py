import hashlib
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Set

from app.config import settings

IGNORED_DIRS: Set[str] = {
    ".git",
    "node_modules",
    "vendor",
    "dist",
    "build",
    "coverage",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".venv",
    "venv",
    "target",
}

IGNORED_FILE_EXACT: Set[str] = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "pipfile.lock",
    "poetry.lock",
    "cargo.lock",
}

PYTHON_EXTENSIONS: Set[str] = {".py"}
JAVASCRIPT_EXTENSIONS: Set[str] = {".js", ".jsx", ".mjs", ".cjs"}
SUPPORTED_EXTENSIONS = PYTHON_EXTENSIONS | JAVASCRIPT_EXTENSIONS


@dataclass
class DiscoveredFile:
    relative_path: str
    absolute_path: Path
    language: str
    size_bytes: int
    line_count: int
    sha256_hash: str
    entry_hash: str


@dataclass
class DiscoveryResult:
    files: List[DiscoveredFile] = field(default_factory=list)
    total_files: int = 0
    total_lines: int = 0
    detected_languages: List[str] = field(default_factory=list)
    content_hash: str = ""


class IngestionError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def is_binary_content(content_bytes: bytes) -> bool:
    """Detect if file content is binary by checking for null bytes in initial chunk."""
    chunk = content_bytes[:1024]
    return b"\x00" in chunk


def is_minified_javascript(file_name: str, first_line: str, avg_line_length: float) -> bool:
    """Identify minified JavaScript files by filename pattern or line length heuristics."""
    name_lower = file_name.lower()
    if ".min." in name_lower or name_lower.endswith("-min.js") or name_lower.endswith("-min.cjs") or name_lower.endswith("-min.mjs"):
        return True
    if avg_line_length > 500 or len(first_line) > 1000:
        return True
    return False


def discover_source_files(root_dir: Path) -> DiscoveryResult:
    """
    Traverses the directory, filters out ignored directories and non-source files,
    counts lines defensively, enforces 10,000 line limit, and returns structured result.
    """
    root_path = root_dir.resolve()
    discovered: List[DiscoveredFile] = []
    total_lines = 0
    detected_languages: Set[str] = set()

    for dirpath, dirnames, filenames in os.walk(root_path, topdown=True):
        # Prune ignored directory names in-place
        dirnames[:] = [d for d in dirnames if d.lower() not in IGNORED_DIRS and not d.startswith(".")]

        for fname in sorted(filenames):
            lower_fname = fname.lower()
            if lower_fname in IGNORED_FILE_EXACT or lower_fname.endswith(".map"):
                continue

            file_path = Path(dirpath) / fname
            ext = file_path.suffix.lower()

            if ext not in SUPPORTED_EXTENSIONS:
                continue

            if ext in PYTHON_EXTENSIONS:
                language = "python"
            elif ext in JAVASCRIPT_EXTENSIONS:
                language = "javascript"
            else:
                continue

            try:
                stat = file_path.stat()
                file_size = stat.st_size

                if file_size > settings.MAX_FILE_BYTES:
                    continue

                raw_bytes = file_path.read_bytes()
                if is_binary_content(raw_bytes):
                    continue

                content_str = raw_bytes.decode("utf-8", errors="replace")
                lines = content_str.splitlines()
                line_count = len(lines)

                if language == "javascript" and lines:
                    avg_len = sum(len(l) for l in lines) / max(len(lines), 1)
                    if is_minified_javascript(fname, lines[0], avg_len):
                        continue

                rel_path = file_path.relative_to(root_path).as_posix()
                file_sha256 = hashlib.sha256(raw_bytes).hexdigest()
                
                # Deterministic entry hash including both relative path and file content hash
                entry_hash = hashlib.sha256(f"{rel_path}:{file_sha256}".encode("utf-8")).hexdigest()

                discovered.append(
                    DiscoveredFile(
                        relative_path=rel_path,
                        absolute_path=file_path,
                        language=language,
                        size_bytes=file_size,
                        line_count=line_count,
                        sha256_hash=file_sha256,
                        entry_hash=entry_hash,
                    )
                )

                total_lines += line_count
                detected_languages.add(language)

            except Exception:
                continue

    # Enforce maximum 10,000 relevant lines limit
    if total_lines > settings.MAX_RELEVANT_LINES:
        raise IngestionError(
            code="EXCEEDED_LINE_LIMIT",
            message=f"Repository exceeds maximum allowed relevant source limit of {settings.MAX_RELEVANT_LINES} lines (found {total_lines} lines).",
        )

    if not discovered:
        raise IngestionError(
            code="NO_SOURCE_FILES",
            message="No supported Python or JavaScript source files found in repository.",
        )

    # Calculate global project content hash using sorted (rel_path:file_hash) entry hashes
    sorted_entry_hashes = [f.entry_hash for f in sorted(discovered, key=lambda x: x.relative_path)]
    project_content_hash = hashlib.sha256("".join(sorted_entry_hashes).encode("utf-8")).hexdigest()

    return DiscoveryResult(
        files=discovered,
        total_files=len(discovered),
        total_lines=total_lines,
        detected_languages=sorted(list(detected_languages)),
        content_hash=project_content_hash,
    )
