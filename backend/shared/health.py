"""
MindFlow Backend - Health Check Module
Per PO-030 Task 6.9: Health checks and graceful shutdown

Provides Kubernetes-style health probes:
- /health - Basic health check (for load balancers)
- /ready - Readiness probe (checks dependencies)
- /live - Liveness probe (checks if service is running)
"""

import asyncio
import logging
import signal
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional

from fastapi import APIRouter, FastAPI, Response
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    """Health status values."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class DependencyStatus(BaseModel):
    """Status of a single dependency."""
    name: str
    status: HealthStatus
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    last_check: datetime = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: HealthStatus
    service: str
    version: str
    uptime_seconds: float
    timestamp: datetime
    dependencies: List[DependencyStatus] = []


class ReadyResponse(BaseModel):
    """Readiness check response."""
    ready: bool
    service: str
    checks: Dict[str, bool] = {}
    message: Optional[str] = None


class LiveResponse(BaseModel):
    """Liveness check response."""
    alive: bool
    service: str
    timestamp: datetime


@dataclass
class HealthCheck:
    """
    Health check manager for a service.

    Manages dependency checks and provides FastAPI routes for health probes.
    """

    service_name: str
    version: str = "0.1.0"
    start_time: float = field(default_factory=time.time)
    is_shutting_down: bool = field(default=False)
    _dependency_checks: Dict[str, Callable[[], Coroutine[Any, Any, bool]]] = field(
        default_factory=dict
    )
    _shutdown_handlers: List[Callable[[], Coroutine[Any, Any, None]]] = field(
        default_factory=list
    )
    _startup_complete: bool = field(default=False)

    def register_dependency(
        self,
        name: str,
        check_func: Callable[[], Coroutine[Any, Any, bool]]
    ) -> None:
        """
        Register a dependency health check.

        Args:
            name: Name of the dependency (e.g., "database", "redis")
            check_func: Async function that returns True if healthy
        """
        self._dependency_checks[name] = check_func

    def register_shutdown_handler(
        self,
        handler: Callable[[], Coroutine[Any, Any, None]]
    ) -> None:
        """
        Register a shutdown handler to be called during graceful shutdown.

        Args:
            handler: Async function to call during shutdown
        """
        self._shutdown_handlers.append(handler)

    def mark_startup_complete(self) -> None:
        """Mark service startup as complete."""
        self._startup_complete = True
        logger.info(f"{self.service_name} startup complete")

    async def check_dependencies(self) -> Dict[str, DependencyStatus]:
        """
        Check all registered dependencies.

        Returns:
            Dictionary mapping dependency names to their status
        """
        results = {}

        for name, check_func in self._dependency_checks.items():
            start = time.time()
            try:
                is_healthy = await asyncio.wait_for(check_func(), timeout=5.0)
                latency = (time.time() - start) * 1000

                results[name] = DependencyStatus(
                    name=name,
                    status=HealthStatus.HEALTHY if is_healthy else HealthStatus.UNHEALTHY,
                    latency_ms=round(latency, 2),
                    last_check=datetime.utcnow()
                )
            except asyncio.TimeoutError:
                results[name] = DependencyStatus(
                    name=name,
                    status=HealthStatus.UNHEALTHY,
                    message="Health check timed out",
                    last_check=datetime.utcnow()
                )
            except Exception as e:
                results[name] = DependencyStatus(
                    name=name,
                    status=HealthStatus.UNHEALTHY,
                    message=str(e),
                    last_check=datetime.utcnow()
                )

        return results

    async def get_health(self) -> HealthResponse:
        """Get comprehensive health status."""
        dep_statuses = await self.check_dependencies()

        # Determine overall status
        all_healthy = all(
            d.status == HealthStatus.HEALTHY for d in dep_statuses.values()
        )
        any_unhealthy = any(
            d.status == HealthStatus.UNHEALTHY for d in dep_statuses.values()
        )

        if self.is_shutting_down:
            overall_status = HealthStatus.UNHEALTHY
        elif any_unhealthy:
            overall_status = HealthStatus.UNHEALTHY
        elif not all_healthy:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY

        return HealthResponse(
            status=overall_status,
            service=self.service_name,
            version=self.version,
            uptime_seconds=round(time.time() - self.start_time, 2),
            timestamp=datetime.utcnow(),
            dependencies=list(dep_statuses.values())
        )

    def is_ready(self) -> ReadyResponse:
        """Check if service is ready to accept traffic."""
        checks = {
            "startup_complete": self._startup_complete,
            "not_shutting_down": not self.is_shutting_down,
        }

        ready = all(checks.values())
        message = None

        if not self._startup_complete:
            message = "Service startup not complete"
        elif self.is_shutting_down:
            message = "Service is shutting down"

        return ReadyResponse(
            ready=ready,
            service=self.service_name,
            checks=checks,
            message=message
        )

    def is_alive(self) -> LiveResponse:
        """Check if service is alive (for liveness probe)."""
        return LiveResponse(
            alive=True,
            service=self.service_name,
            timestamp=datetime.utcnow()
        )

    async def graceful_shutdown(self, timeout: float = 30.0) -> None:
        """
        Perform graceful shutdown.

        Args:
            timeout: Maximum time to wait for shutdown handlers
        """
        logger.info(f"{self.service_name} initiating graceful shutdown")
        self.is_shutting_down = True

        # Run all shutdown handlers
        for handler in self._shutdown_handlers:
            try:
                await asyncio.wait_for(handler(), timeout=timeout)
            except asyncio.TimeoutError:
                logger.warning(f"Shutdown handler timed out after {timeout}s")
            except Exception as e:
                logger.error(f"Error in shutdown handler: {e}")

        logger.info(f"{self.service_name} shutdown complete")

    def get_router(self) -> APIRouter:
        """
        Get FastAPI router with health check endpoints.

        Returns:
            APIRouter with /health, /ready, and /live endpoints
        """
        router = APIRouter(tags=["health"])

        @router.get("/health", response_model=HealthResponse)
        async def health_check(response: Response):
            """
            Comprehensive health check.
            Returns service health status including all dependencies.
            """
            health = await self.get_health()

            if health.status == HealthStatus.UNHEALTHY:
                response.status_code = 503
            elif health.status == HealthStatus.DEGRADED:
                response.status_code = 200  # Still accept traffic

            return health

        @router.get("/ready", response_model=ReadyResponse)
        async def readiness_check(response: Response):
            """
            Readiness probe for Kubernetes.
            Returns whether service is ready to accept traffic.
            """
            ready = self.is_ready()

            if not ready.ready:
                response.status_code = 503

            return ready

        @router.get("/live", response_model=LiveResponse)
        async def liveness_check():
            """
            Liveness probe for Kubernetes.
            Returns whether service process is alive.
            """
            return self.is_alive()

        return router


def create_database_check(db_manager) -> Callable[[], Coroutine[Any, Any, bool]]:
    """
    Create a database health check function.

    Args:
        db_manager: DatabaseManager instance

    Returns:
        Async function that checks database connectivity
    """
    async def check_database() -> bool:
        try:
            from sqlalchemy import text
            async with db_manager.session() as session:
                await session.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

    return check_database


def create_redis_check(redis_url: str) -> Callable[[], Coroutine[Any, Any, bool]]:
    """
    Create a Redis health check function.

    Args:
        redis_url: Redis connection URL

    Returns:
        Async function that checks Redis connectivity
    """
    async def check_redis() -> bool:
        try:
            import redis.asyncio as redis
            client = redis.from_url(redis_url)
            await client.ping()
            await client.close()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False

    return check_redis


@asynccontextmanager
async def lifespan_with_health(
    app: FastAPI,
    health_check: HealthCheck,
    startup_func: Optional[Callable[[], Coroutine[Any, Any, None]]] = None,
    shutdown_func: Optional[Callable[[], Coroutine[Any, Any, None]]] = None,
):
    """
    FastAPI lifespan context manager with health check integration.

    Args:
        app: FastAPI application
        health_check: HealthCheck instance
        startup_func: Optional additional startup function
        shutdown_func: Optional additional shutdown function

    Usage:
        health = HealthCheck(service_name="my-service")

        @asynccontextmanager
        async def lifespan(app: FastAPI):
            async with lifespan_with_health(
                app, health,
                startup_func=my_startup,
                shutdown_func=my_shutdown
            ):
                yield
    """
    # Setup signal handlers for graceful shutdown
    loop = asyncio.get_event_loop()

    def signal_handler():
        logger.info("Received shutdown signal")
        asyncio.create_task(health_check.graceful_shutdown())

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass

    # Startup
    if startup_func:
        await startup_func()

    health_check.mark_startup_complete()

    yield

    # Shutdown
    await health_check.graceful_shutdown()

    if shutdown_func:
        await shutdown_func()
