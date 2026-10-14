import contextvars
import json
import logging
import re
import time
from typing import Any, Dict, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import uuid

# Context variables for request tracing across async tasks
request_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("request_id", default=None)
job_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("job_id", default=None)
project_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("project_id", default=None)

# Patterns for sensitive keys that must be redacted
SENSITIVE_KEY_PATTERN = re.compile(
    r"(password|secret|token|cookie|auth|api[-_]?key|session|bearer|authorization)",
    re.IGNORECASE,
)

# Patterns for raw code or archive payloads that must never be logged
CODE_CONTENT_PATTERN = re.compile(
    r"(class\s+\w+|def\s+\w+|import\s+\w+|function\s+\w+|const\s+\w+\s*=|PK\x03\x04)",
)


class SanitizingFilter(logging.Filter):
    """
    Ensures secrets, session tokens, passwords, source code, and uploaded binary archives
    are never emitted into log outputs.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Sanitize message
        if isinstance(record.msg, str):
            record.msg = self.sanitize_string(record.msg)
        elif isinstance(record.msg, dict):
            record.msg = self.sanitize_dict(record.msg)

        if record.args:
            if isinstance(record.args, dict):
                record.args = self.sanitize_dict(record.args)
            elif isinstance(record.args, (list, tuple)):
                record.args = tuple(
                    self.sanitize_string(str(arg)) if isinstance(arg, str) else arg
                    for arg in record.args
                )

        return True

    @classmethod
    def sanitize_string(cls, text: str) -> str:
        if not text:
            return text

        # Redact bearer tokens
        text = re.sub(r"(Bearer\s+)[A-Za-z0-9\-._~+/]+=*", r"\1[REDACTED]", text, flags=re.IGNORECASE)
        # Redact key-value pairs like secret=..., token=..., password=...
        text = re.sub(
            r"(?i)(password|secret|token|cookie|api[-_]?key|session|key)=['\"]?[^'\";,\s&]+['\"]?",
            r"\1=[REDACTED]",
            text,
        )

        # Never log raw code snippets if accidentally passed
        if len(text) > 400 and CODE_CONTENT_PATTERN.search(text):
            return "[REDACTED_SOURCE_CODE_BLOB]"

        return text

    @classmethod
    def sanitize_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        sanitized = {}
        for k, v in data.items():
            if SENSITIVE_KEY_PATTERN.search(str(k)):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, dict):
                sanitized[k] = cls.sanitize_dict(v)
            elif isinstance(v, str):
                sanitized[k] = cls.sanitize_string(v)
            else:
                sanitized[k] = v
        return sanitized


class StructuredJsonFormatter(logging.Formatter):
    """
    Emits log records as structured single-line JSON objects for production ingestion.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", None) or request_id_ctx.get(),
            "job_id": getattr(record, "job_id", None) or job_id_ctx.get(),
            "project_id": getattr(record, "project_id", None) or project_id_ctx.get(),
        }

        # Include structured extra fields if present
        for attr in ("duration_ms", "outcome", "status_code", "error_category", "method", "path", "ip"):
            val = getattr(record, attr, None)
            if val is not None:
                log_obj[attr] = val

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj, ensure_ascii=False)


def categorize_error(status_code: int, exc: Optional[Exception] = None) -> str:
    """Categorizes HTTP status or exception into standardized sanitized error taxonomy."""
    if exc:
        exc_name = type(exc).__name__.lower()
        if "timeout" in exc_name:
            return "timeout_error"
        if "integrity" in exc_name or "operational" in exc_name or "database" in exc_name:
            return "database_error"
        if "validation" in exc_name:
            return "validation_error"
        if "permission" in exc_name or "forbidden" in exc_name:
            return "authorization_error"

    if status_code == 400:
        return "bad_request"
    if status_code == 401:
        return "unauthorized"
    if status_code == 403:
        return "forbidden"
    if status_code == 404:
        return "not_found"
    if status_code == 409:
        return "conflict"
    if status_code == 422:
        return "validation_error"
    if status_code == 429:
        return "rate_limited"
    if status_code == 503:
        return "service_unavailable"
    if status_code >= 500:
        return "internal_server_error"
    return "none"


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware that attaches request IDs, tracks request duration,
    sanitizes errors, updates metrics, and logs structured lifecycle events.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Extract or generate Request ID
        req_id = request.headers.get("X-Request-ID")
        if not req_id or len(req_id) > 64:
            req_id = f"req_{uuid.uuid4().hex[:16]}"

        request_id_ctx.set(req_id)
        request.state.request_id = req_id

        # Extract project_id or job_id from path if present
        path = request.url.path
        if "/projects/" in path:
            parts = path.split("/projects/")[1].split("/")
            if parts and parts[0]:
                project_id_ctx.set(parts[0])
                request.state.project_id = parts[0]
        if "/jobs/" in path:
            parts = path.split("/jobs/")[1].split("/")
            if parts and parts[0] and parts[0] not in ("queue", "stats"):
                job_id_ctx.set(parts[0])
                request.state.job_id = parts[0]

        start_time = time.perf_counter()
        logger = logging.getLogger("app.access")

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            status_code = response.status_code

            outcome = "success"
            if 400 <= status_code < 500:
                outcome = "client_error"
            elif status_code >= 500:
                outcome = "server_error"

            err_category = categorize_error(status_code)

            # Record metrics hook if metrics module is active
            try:
                from app.monitoring.metrics import record_request_metric
                record_request_metric(
                    method=request.method,
                    path=path,
                    status_code=status_code,
                    duration_ms=duration_ms,
                    error_category=err_category if outcome != "success" else None,
                )
            except Exception:
                pass

            # Inject request ID in response header
            response.headers["X-Request-ID"] = req_id

            # Avoid spamming access logs for rapid polling health endpoints unless failed
            if path in ("/api/health", "/api/health/liveness", "/api/liveness") and status_code < 400:
                return response

            logger.info(
                "%s %s -> %d (%s, %.1fms)",
                request.method,
                path,
                status_code,
                outcome,
                duration_ms,
                extra={
                    "request_id": req_id,
                    "job_id": job_id_ctx.get(),
                    "project_id": project_id_ctx.get(),
                    "duration_ms": duration_ms,
                    "outcome": outcome,
                    "status_code": status_code,
                    "error_category": err_category,
                    "method": request.method,
                    "path": path,
                },
            )
            return response

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            err_category = categorize_error(500, exc)

            try:
                from app.monitoring.metrics import record_request_metric
                record_request_metric(
                    method=request.method,
                    path=path,
                    status_code=500,
                    duration_ms=duration_ms,
                    error_category=err_category,
                )
            except Exception:
                pass

            logger.error(
                "Unhandled error processing %s %s (%.1fms): %s",
                request.method,
                path,
                duration_ms,
                err_category,
                extra={
                    "request_id": req_id,
                    "job_id": job_id_ctx.get(),
                    "project_id": project_id_ctx.get(),
                    "duration_ms": duration_ms,
                    "outcome": "server_error",
                    "status_code": 500,
                    "error_category": err_category,
                    "method": request.method,
                    "path": path,
                },
                exc_info=True,
            )
            raise exc
        finally:
            request_id_ctx.set(None)
            job_id_ctx.set(None)
            project_id_ctx.set(None)


def setup_logging(is_production: bool = False, log_level: str = "INFO") -> None:
    """Configures root logger with privacy filters and structured JSON format in production."""
    root_logger = logging.getLogger()
    level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(level)

    # Clear existing handlers
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.addFilter(SanitizingFilter())

    if is_production:
        console_handler.setFormatter(StructuredJsonFormatter())
    else:
        dev_fmt = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%H:%M:%S",
        )
        console_handler.setFormatter(dev_fmt)

    root_logger.addHandler(console_handler)
