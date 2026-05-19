"""
MindFlow Backend - Database Module
Per TECH_STACK.md: PostgreSQL 16 with SQLAlchemy 2.0+ and asyncpg
Implements Row-Level Security (RLS) for multi-tenancy
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""
    pass


class DatabaseManager:
    """
    Database connection manager with RLS support.
    Per ARCHITECTURE_DESIGN.md and DATABASE_SCHEMA.md
    """

    def __init__(self):
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker[AsyncSession]] = None

    @property
    def engine(self) -> AsyncEngine:
        if self._engine is None:
            raise RuntimeError("Database not initialized. Call init_db() first.")
        return self._engine

    @property
    def session_factory(self) -> async_sessionmaker[AsyncSession]:
        if self._session_factory is None:
            raise RuntimeError("Database not initialized. Call init_db() first.")
        return self._session_factory

    async def init_db(self) -> None:
        """Initialize database engine and session factory."""
        settings = get_settings()

        self._engine = create_async_engine(
            settings.database_url,
            pool_size=settings.database_pool_size,
            max_overflow=settings.database_max_overflow,
            pool_pre_ping=True,
            echo=settings.debug,
        )

        self._session_factory = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

    async def close_db(self) -> None:
        """Close database connections."""
        if self._engine:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None

    @asynccontextmanager
    async def session(
        self,
        tenant_id: Optional[UUID] = None
    ) -> AsyncGenerator[AsyncSession, None]:
        """
        Get database session with optional RLS context.

        Per DATABASE_SCHEMA.md Section 7:
        - Sets app.current_tenant_id for RLS policies
        - All tenant-scoped queries are automatically filtered

        Args:
            tenant_id: Tenant UUID for RLS context (from JWT)
        """
        if self._session_factory is None:
            raise RuntimeError("Database not initialized")

        async with self._session_factory() as session:
            try:
                # Set RLS context if tenant_id provided
                if tenant_id:
                    # Use quoted string literal for SET LOCAL (not parameterized)
                    tenant_str = str(tenant_id).replace("'", "''")  # Escape single quotes
                    await session.execute(
                        text(f"SET LOCAL app.current_tenant_id = '{tenant_str}'")
                    )

                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise


# Global database manager instance
db_manager = DatabaseManager()


async def get_db(
    tenant_id: Optional[UUID] = None
) -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI endpoints to get database session.

    Usage:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with db_manager.session(tenant_id) as session:
        yield session
