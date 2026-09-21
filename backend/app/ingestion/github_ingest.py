import logging
import os
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from app.config import settings
from app.ingestion.discovery import IngestionError

logger = logging.getLogger(__name__)

GITHUB_URL_REGEX = re.compile(
    r"^https://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.+-]+?)(?:\.git)?$"
)


def validate_github_url(url_str: str) -> str:
    """
    Validates and normalizes public GitHub HTTPS URLs.
    Rejects credentials, non-HTTPS schemes, non-github hosts, query strings, and fragments.
    """
    if not url_str or not isinstance(url_str, str):
        raise IngestionError(code="INVALID_GITHUB_URL", message="GitHub URL must be a non-empty string.")

    url_str = url_str.strip()

    if "?" in url_str or "#" in url_str:
        raise IngestionError(code="INVALID_GITHUB_URL", message="GitHub URL must not contain query strings or fragments.")

    parsed = urlparse(url_str)

    if parsed.scheme != "https":
        raise IngestionError(code="INVALID_GITHUB_URL", message="Only HTTPS scheme is supported for GitHub repository URLs.")

    if parsed.username or parsed.password:
        raise IngestionError(code="INVALID_GITHUB_URL", message="Embedded credentials in GitHub URL are prohibited.")

    if parsed.hostname != "github.com":
        raise IngestionError(code="INVALID_GITHUB_URL", message="Only github.com repository URLs are supported.")

    match = GITHUB_URL_REGEX.match(url_str)
    if not match:
        raise IngestionError(
            code="INVALID_GITHUB_URL",
            message="Invalid GitHub URL format. Expected: https://github.com/owner/repository",
        )

    owner, repo = match.groups()
    # Keep the original repo name for cloning (GitHub accepts trailing dots)
    clean_url = f"https://github.com/{owner}/{repo}.git"
    return clean_url


def extract_repo_display_name(clean_url: str) -> str:
    """Extracts repository display name, stripping .git suffix and trailing dots/hyphens."""
    url_no_git = clean_url[:-4] if clean_url.endswith(".git") else clean_url
    raw_name = url_no_git.split("/")[-1]
    # Normalize: strip trailing dots/hyphens that appear in some GitHub repo names
    return raw_name.rstrip(".-") or raw_name


def get_dir_size_bytes(dir_path: Path) -> int:
    """Recursively computes total byte size of directory."""
    total = 0
    for root, _, files in os.walk(dir_path):
        for f in files:
            try:
                total += (Path(root) / f).stat().st_size
            except Exception:
                pass
    return total


def sanitize_git_stderr(stderr: str, target_dir: Path) -> str:
    """Sanitizes git stderr so filesystem paths, tokens, credentials, and URL userinfo cannot appear in logs."""
    if not stderr:
        return ""
    sanitized = stderr.replace(str(target_dir), "[TARGET_DIR]")
    try:
        sanitized = sanitized.replace(str(target_dir.resolve()), "[TARGET_DIR]")
    except Exception:
        pass
    sanitized = re.sub(r"https?://[^:\s]+:[^@\s]+@", "https://[REDACTED_CREDENTIALS]@", sanitized)
    sanitized = re.sub(r"(token|secret|password|bearer|auth)[=:]\s*[\w\.\-]+", r"\1=[REDACTED]", sanitized, flags=re.IGNORECASE)
    return sanitized[:500]


def clone_github_repository(clean_url: str, target_dir: Path) -> None:
    """
    Executes git clone in a shallow, blobless, non-interactive subprocess with parameter array security.

    Uses --no-progress and --quiet to suppress the verbose 'Updating files: X%' progress lines
    that git writes to stderr. On Windows, these lines can fill the OS pipe buffer and cause
    subprocess.run() to stall/deadlock when stderr=PIPE is used in a background thread.
    """
    target_dir.mkdir(parents=True, exist_ok=True)

    env = dict(os.environ)
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_OPTIONAL_LOCKS"] = "0"  # Prevent lock contention in concurrent clones
    env["LANG"] = "C"

    cmd = [
        "git",
        "clone",
        "--depth",
        "1",
        "--filter=blob:none",
        "--single-branch",
        "--no-progress",  # Suppress 'Updating files: X%' lines from stderr
        "--quiet",        # Suppress 'Cloning into ...' header line
        clean_url,
        str(target_dir),
    ]

    try:
        result = subprocess.run(
            cmd,
            env=env,
            stdout=subprocess.DEVNULL,  # Discard stdout (clone has no useful stdout output)
            stderr=subprocess.PIPE,     # Capture only the small quiet-mode error lines
            text=True,
            timeout=settings.CLONE_TIMEOUT_SECONDS,
        )

        if result.returncode != 0:
            # Log sanitized stderr for diagnostics without exposing raw stderr or local paths
            safe_stderr = sanitize_git_stderr(result.stderr, target_dir)
            logger.error("Git clone failed for %s. Stderr: %s", clean_url, safe_stderr)

            # Remove partial clone directory on failure
            if target_dir.exists():
                shutil.rmtree(target_dir, ignore_errors=True)

            stderr_lower = (result.stderr or "").lower()
            if (
                "authentication failed" in stderr_lower
                or "repository not found" in stderr_lower
                or "not found" in stderr_lower
                or "does not exist" in stderr_lower
            ):
                raise IngestionError(
                    code="GITHUB_CLONE_FAILED",
                    message="Failed to access repository. Please verify the repository is public and the URL is correct.",
                )
            raise IngestionError(
                code="GITHUB_CLONE_FAILED",
                message="Git clone operation failed while fetching repository.",
            )

        # Check maximum cloned workspace byte size
        cloned_size = get_dir_size_bytes(target_dir)
        if cloned_size > settings.MAX_CLONE_SIZE_BYTES:
            if target_dir.exists():
                shutil.rmtree(target_dir, ignore_errors=True)
            raise IngestionError(
                code="CLONE_SIZE_EXCEEDED",
                message=f"Cloned repository size exceeds limit of {settings.MAX_CLONE_SIZE_BYTES // (1024 * 1024)}MB.",
            )

        # Reject repositories that contain symlinks.
        # A crafted repo can use symlinks to read host-accessible files outside the workspace.
        for dirpath, dirnames, filenames in os.walk(target_dir):
            for name in dirnames + filenames:
                candidate = Path(dirpath) / name
                if candidate.is_symlink():
                    if target_dir.exists():
                        shutil.rmtree(target_dir, ignore_errors=True)
                    raise IngestionError(
                        code="SYMLINK_NOT_ALLOWED",
                        message="Cloned repository contains symlinks, which are not allowed for security reasons.",
                    )

    except subprocess.TimeoutExpired:
        if target_dir.exists():
            shutil.rmtree(target_dir, ignore_errors=True)
        raise IngestionError(
            code="CLONE_TIMEOUT",
            message=f"Git clone operation timed out after {settings.CLONE_TIMEOUT_SECONDS} seconds.",
        )
    except FileNotFoundError:
        if target_dir.exists():
            shutil.rmtree(target_dir, ignore_errors=True)
        raise IngestionError(
            code="GIT_NOT_INSTALLED",
            message="System requirement missing: git binary is not installed or available in PATH.",
        )
