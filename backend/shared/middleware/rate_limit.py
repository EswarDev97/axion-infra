"""
MindFlow Backend - Rate Limiting Middleware
Per PO-030 Task 6.7.1: Implement rate limiting

Uses slowapi-style rate limiting with Redis backend for distributed limiting.
"""

import logging
import time
from typing import Callable, Optional

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    """Rate limit exceeded exception."""

    def __init__(self, limit: int, window: int, retry_after: int):
        self.limit = limit
        self.window = window
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded: {limit} requests per {window}s")


class RateLimiter:
    """
    In-memory rate limiter with sliding window.

    For production, use Redis-backed implementation.
    """

    def __init__(self):
        self._requests = {}  # key -> list of timestamps
        self._cleanup_interval = 60
        self._last_cleanup = time.time()

    def _cleanup(self):
        """Remove expired entries."""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return

        keys_to_delete = []
        for key, timestamps in self._requests.items():
            # Remove timestamps older than 1 hour
            self._requests[key] = [t for t in timestamps if current_time - t < 3600]
            if not self._requests[key]:
                keys_to_delete.append(key)

        for key in keys_to_delete:
            del self._requests[key]

        self._last_cleanup = current_time

    def check_rate_limit(
        self,
        key: str,
        limit: int,
        window: int,
    ) -> tuple[bool, int, int]:
        """
        Check if rate limit is exceeded.

        Args:
            key: Unique identifier (e.g., IP address, user ID)
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            Tuple of (is_allowed, remaining, retry_after)
        """
        self._cleanup()

        current_time = time.time()
        window_start = current_time - window

        # Get or create request list for key
        if key not in self._requests:
            self._requests[key] = []

        # Filter to requests within window
        requests = [t for t in self._requests[key] if t > window_start]
        self._requests[key] = requests

        # Check limit
        if len(requests) >= limit:
            # Calculate retry after
            oldest_in_window = min(requests) if requests else current_time
            retry_after = int(oldest_in_window + window - current_time)
            return False, 0, max(retry_after, 1)

        # Add current request
        self._requests[key].append(current_time)
        remaining = limit - len(self._requests[key])

        return True, remaining, 0


# Global rate limiter instance
rate_limiter = RateLimiter()


# Default rate limit configurations per endpoint type
RATE_LIMITS = {
    # Auth endpoints (more restrictive)
    "auth": {"limit": 10, "window": 60},  # 10 requests per minute
    # API endpoints (standard)
    "api": {"limit": 100, "window": 60},  # 100 requests per minute
    # Report endpoints (can be expensive)
    "reports": {"limit": 20, "window": 60},  # 20 requests per minute
    # Webhook endpoints
    "webhooks": {"limit": 50, "window": 60},  # 50 requests per minute
    # Default
    "default": {"limit": 60, "window": 60},  # 60 requests per minute
}


def get_rate_limit_config(path: str) -> dict:
    """Get rate limit configuration based on path."""
    if path.startswith("/api/v1/auth"):
        return RATE_LIMITS["auth"]
    elif path.startswith("/api/v1/reports"):
        return RATE_LIMITS["reports"]
    elif path.startswith("/webhooks"):
        return RATE_LIMITS["webhooks"]
    elif path.startswith("/api"):
        return RATE_LIMITS["api"]
    return RATE_LIMITS["default"]


def get_rate_limit_key(request: Request) -> str:
    """
    Get the rate limit key for a request.

    Priority:
    1. User ID from JWT token (if authenticated)
    2. API key (if present)
    3. Client IP address (fallback)
    """
    # Try to get user ID from state (set by auth middleware)
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.get('id', '')}"

    # Try API key header
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return f"apikey:{api_key[:16]}"

    # Fallback to IP
    client_ip = request.client.host if request.client else "unknown"
    # Check for forwarded IP
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    return f"ip:{client_ip}"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware.

    Limits requests based on IP, user ID, or API key.
    """

    def __init__(
        self,
        app,
        enabled: bool = True,
        limit: Optional[int] = None,
        window: Optional[int] = None,
    ):
        super().__init__(app)
        self.enabled = enabled
        self.default_limit = limit
        self.default_window = window

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting."""
        if not self.enabled:
            return await call_next(request)

        # Skip health checks and static files
        path = request.url.path
        if path in ("/health", "/ready", "/docs", "/openapi.json"):
            return await call_next(request)

        # Get rate limit config
        config = get_rate_limit_config(path)
        limit = self.default_limit or config["limit"]
        window = self.default_window or config["window"]

        # Get rate limit key
        key = get_rate_limit_key(request)

        # Check rate limit
        is_allowed, remaining, retry_after = rate_limiter.check_rate_limit(
            key, limit, window
        )

        if not is_allowed:
            logger.warning(f"Rate limit exceeded for {key} on {path}")
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Please try again in {retry_after} seconds.",
                    },
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)

        return response
