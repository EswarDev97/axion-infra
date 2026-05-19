"""
MindFlow Backend - Shared Model Stubs
Cross-service reference models for foreign key resolution.

These are minimal table stubs that allow services to reference
tables managed by other services without importing full models.
Per DATABASE_SCHEMA.md.
"""

from uuid import UUID

from sqlalchemy import String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class TenantStub(Base):
    """
    Minimal tenant stub for cross-service foreign key resolution.
    Full model managed by auth-service.
    """

    __tablename__ = "tenants"
    __table_args__ = {"extend_existing": True}

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class UserStub(Base):
    """
    Minimal user stub for cross-service foreign key resolution.
    Full model managed by auth-service.
    """

    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
