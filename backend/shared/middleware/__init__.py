"""
MindFlow Backend - Middleware
Per PO-030 Task 6.7: Security Hardening
"""

import time
import uuid
import logging
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .rate_limit import RateLimitMiddleware, rate_limiter, RateLimitExceeded
from .sanitization import (
    SanitizationMiddleware,
    sanitize_string,
    sanitize_value,
    sanitize_request_body,
    detect_injection_attempt,
)

# Import shared config and exceptions
try:
    import structlog
    logger = structlog.get_logger()
except ImportError:
    logger = logging.getLogger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add request context (ID, timing, logging).
    Per API_CONTRACT.md - all responses include requestId.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Track timing
        start_time = time.time()

        # Add request ID to response headers
        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)

            # Log request
            if hasattr(logger, 'info'):
                logger.info(
                    "request_completed",
                    request_id=request_id,
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    process_time=process_time
                )

            return response

        except Exception as e:
            process_time = time.time() - start_time
            if hasattr(logger, 'error'):
                logger.error(
                    "request_failed",
                    request_id=request_id,
                    method=request.method,
                    path=request.url.path,
                    error=str(e),
                    process_time=process_time
                )
            raise


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Basic request logging middleware."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        logging.info(
            f"{request.method} {request.url.path} - "
            f"{response.status_code} - {process_time:.3f}s"
        )

        return response


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Setup global exception handlers.
    Per API_CONTRACT.md Section 3.3 and 5.
    """
    # Import here to avoid circular imports
    from shared.config import get_settings
    from shared.exceptions import MindFlowException
    from shared.schemas import ApiResponse, ErrorResponse

    @app.exception_handler(MindFlowException)
    async def mindflow_exception_handler(
        request: Request,
        exc: MindFlowException
    ) -> JSONResponse:
        """Handle MindFlow custom exceptions."""
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        error_response = ErrorResponse(
            code=exc.code,
            message=exc.message,
            details=exc.details
        )

        response = ApiResponse(
            success=False,
            error=error_response,
            request_id=uuid.UUID(request_id)
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=response.model_dump(mode="json", by_alias=True)
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """Handle unexpected exceptions."""
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        settings = get_settings()

        # Log the error
        if hasattr(logger, 'exception'):
            logger.exception(
                "unhandled_exception",
                request_id=request_id,
                error=str(exc)
            )

        # Don't expose internal errors in production
        message = str(exc) if settings.is_development else "An unexpected error occurred"

        error_response = ErrorResponse(
            code="INTERNAL_ERROR",
            message=message
        )

        response = ApiResponse(
            success=False,
            error=error_response,
            request_id=uuid.UUID(request_id)
        )

        return JSONResponse(
            status_code=500,
            content=response.model_dump(mode="json", by_alias=True)
        )


def setup_cors(app: FastAPI) -> None:
    """
    Setup CORS middleware.
    Per SECURITY_ARCHITECTURE.md.
    """
    from shared.config import get_settings
    settings = get_settings()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time"]
    )


def setup_middleware(app: FastAPI) -> None:
    """Setup all middleware for the application."""
    # Order matters! Last added = first executed
    setup_cors(app)
    app.add_middleware(RequestContextMiddleware)
    setup_exception_handlers(app)


__all__ = [
    # Rate limiting
    "RateLimitMiddleware",
    "rate_limiter",
    "RateLimitExceeded",
    # Sanitization
    "SanitizationMiddleware",
    "sanitize_string",
    "sanitize_value",
    "sanitize_request_body",
    "detect_injection_attempt",
    # Request context and logging
    "RequestContextMiddleware",
    "RequestLoggingMiddleware",
    # Setup functions
    "setup_middleware",
    "setup_cors",
    "setup_exception_handlers",
]
