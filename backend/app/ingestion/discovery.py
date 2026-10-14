import hashlib
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Set, Tuple

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
TYPESCRIPT_EXTENSIONS: Set[str] = {".ts", ".tsx", ".mts", ".cts"}
SUPPORTED_EXTENSIONS = PYTHON_EXTENSIONS | JAVASCRIPT_EXTENSIONS | TYPESCRIPT_EXTENSIONS


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
    def __init__(
        self,
        code: str,
        message: str,
        technical_message: str | None = None,
        http_status: int | None = None,
        subcode: str | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.subcode = subcode
        self.technical_message = technical_message
        self.http_status = http_status


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


def count_lines_fast(raw_bytes: bytes) -> int:
    """Fast line counting using native bytecount without full string allocation."""
    if not raw_bytes:
        return 0
    cnt = raw_bytes.count(b"\n")
    if not raw_bytes.endswith(b"\n"):
        cnt += 1
    return cnt


def _process_candidate_file(
    file_path: Path,
    root_path: Path,
    language: str,
    max_file_bytes: int,
) -> DiscoveredFile | None:
    try:
        stat = file_path.stat()
        file_size = stat.st_size
        if file_size > max_file_bytes:
            return None

        raw_bytes = file_path.read_bytes()
        if is_binary_content(raw_bytes):
            return None

        line_count = count_lines_fast(raw_bytes)

        if language == "javascript":
            fname = file_path.name
            name_lower = fname.lower()
            if ".min." in name_lower or name_lower.endswith("-min.js") or name_lower.endswith("-min.cjs") or name_lower.endswith("-min.mjs"):
                return None
            if line_count > 0 and (file_size / line_count) > 500:
                return None
            first_newline = raw_bytes.find(b"\n")
            first_len = first_newline if first_newline != -1 else len(raw_bytes)
            if first_len > 1000:
                return None

        rel_path = file_path.relative_to(root_path).as_posix()
        file_sha256 = hashlib.sha256(raw_bytes).hexdigest()
        entry_hash = hashlib.sha256(f"{rel_path}:{file_sha256}".encode("utf-8")).hexdigest()

        return DiscoveredFile(
            relative_path=rel_path,
            absolute_path=file_path,
            language=language,
            size_bytes=file_size,
            line_count=line_count,
            sha256_hash=file_sha256,
            entry_hash=entry_hash,
        )
    except Exception:
        return None


def discover_source_files(root_dir: Path) -> DiscoveryResult:
    """
    Traverses the directory, filters out ignored directories and non-source files,
    counts lines defensively, enforces the configured line limit, and returns structured result.
    Uses bounded concurrency for reading and hashing large file trees.
    """
    from concurrent.futures import ThreadPoolExecutor

    root_path = root_dir.resolve()
    candidates: List[Tuple[Path, str]] = []

    for dirpath, dirnames, filenames in os.walk(root_path, topdown=True):
        # Prune ignored directory names in-place; also reject symlink directories
        # to prevent traversal into host-accessible targets after a git clone.
        dirnames[:] = [
            d for d in dirnames
            if d.lower() not in IGNORED_DIRS
            and not d.startswith(".")
            and not (Path(dirpath) / d).is_symlink()
        ]

        for fname in sorted(filenames):
            lower_fname = fname.lower()
            if lower_fname in IGNORED_FILE_EXACT or lower_fname.endswith(".map"):
                continue

            file_path = Path(dirpath) / fname

            # Reject symlinks: never follow them
            if file_path.is_symlink():
                continue

            ext = file_path.suffix.lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue

            if ext in PYTHON_EXTENSIONS:
                language = "python"
            elif ext in JAVASCRIPT_EXTENSIONS:
                language = "javascript"
            elif ext in TYPESCRIPT_EXTENSIONS:
                language = "typescript"
            else:
                continue

            candidates.append((file_path, language))

    discovered: List[DiscoveredFile] = []
    total_lines = 0
    detected_languages: Set[str] = set()

    max_workers = min(16, max(os.cpu_count() or 4, 1))
    if len(candidates) > 20:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = executor.map(
                lambda c: _process_candidate_file(c[0], root_path, c[1], settings.MAX_FILE_BYTES),
                candidates,
            )
            for res in results:
                if res is not None:
                    discovered.append(res)
                    total_lines += res.line_count
                    detected_languages.add(res.language)
    else:
        for fpath, lang in candidates:
            res = _process_candidate_file(fpath, root_path, lang, settings.MAX_FILE_BYTES)
            if res is not None:
                discovered.append(res)
                total_lines += res.line_count
                detected_languages.add(res.language)

    # Sort deterministically
    discovered.sort(key=lambda x: x.relative_path)

    # Enforce the configured relevant-source line limit.
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
