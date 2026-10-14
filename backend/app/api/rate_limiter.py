import threading
import time
from collections import defaultdict, deque
from typing import Callable, Optional
from fastapi import HTTPException, Request, status

from app.api.auth import get_current_user_optional, get_token_from_request
from app.database import SessionLocal
from app.models.db import User


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter tracking requests per key (IP or user ID).
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._records = defaultdict(deque)

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:
        """
        Check if request under key is allowed.
        Returns: (is_allowed, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            queue = self._records[key]

            # Evict timestamps older than the window
            while queue and queue[0] < window_start:
                queue.popleft()

            current_count = len(queue)
            if current_count >= max_requests:
                earliest = queue[0]
                retry_after = max(1, int(earliest + window_seconds - now))
                return False, 0, retry_after

            queue.append(now)
            remaining = max(0, max_requests - current_count - 1)
            return True, remaining, 0

    def reset(self) -> None:
        """Clear all rate limiting state (useful in tests)."""
        with self._lock:
            self._records.clear()


limiter = SlidingWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP, inspecting X-Forwarded-For if available."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in comma-separated list is the client IP
        ip = forwarded.split(",")[0].strip()
        if ip:
            return ip
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def rate_limit(action: str, max_requests: int = 15, window_seconds: int = 60) -> Callable:
    """
    FastAPI dependency factory enforcing rate limits by IP and/or User ID.
    Raises HTTPException(429) with Retry-After header on limit breach.
    """

    async def dependency(request: Request) -> None:
        # Check IP limit
        client_ip = get_client_ip(request)
        ip_key = f"rl:ip:{action}:{client_ip}"
        allowed_ip, remaining_ip, retry_after_ip = limiter.check_rate_limit(
            ip_key, max_requests, window_seconds
        )

        if not allowed_ip:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {action}. Please wait {retry_after_ip} seconds before retrying.",
                headers={"Retry-After": str(retry_after_ip)},
            )

        # Check authenticated user limit if session exists
        token = get_token_from_request(request)
        if token:
            db = SessionLocal()
            try:
                user = get_current_user_optional(request, db)
                if user:
                    user_key = f"rl:user:{action}:{user.id}"
                    allowed_user, remaining_user, retry_after_user = limiter.check_rate_limit(
                        user_key, max_requests, window_seconds
                    )
                    if not allowed_user:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail=f"User rate limit exceeded for {action}. Please wait {retry_after_user} seconds.",
                            headers={"Retry-After": str(retry_after_user)},
                        )
            finally:
                db.close()

    return dependency
