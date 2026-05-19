"""
MindFlow Backend - Middleware
Per API_CONTRACT.md and SECURITY_ARCHITECTURE.md

Provides:
- Request ID generation
- CORS handling
- Exception handling
- Request logging
"""

import time
import uuid
from typing import Callable

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings
from .exceptions import MindFlowException
from .schemas import ApiResponse, ErrorResponse

logger = structlog.get_logger()


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
            logger.error(
                "request_failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                error=str(e),
                process_time=process_time
            )
            raise


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Setup global exception handlers.
    Per API_CONTRACT.md Section 3.3 and 5.
    """

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
