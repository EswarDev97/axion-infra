"""
MindFlow Backend - Shared Model Stubs
Cross-service reference models for foreign key resolution.

These are minimal table stubs that allow services to reference
tables managed by other services without importing full models.
Per DATABASE_SCHEMA.md.

In production, each microservice process only ever imports its own
models plus these stubs, so "tenants"/"users" are declared exactly
once per process. In contexts that import multiple services' models
together (e.g. the shared test suite in tests/conftest.py, which
loads the real services.auth.models.Tenant/User alongside every other
service's stub-importing models package), declaring the stub with
extend_existing=True a second time rebinds the Table's Column objects
in place, silently invalidating the real model's already-configured
mapper/relationship state (SQLAlchemy raises UnmappedColumnError on
the next flush). Guard against that by skipping stub declaration when
the real, fully-featured table is already registered on Base.metadata.
"""

from uuid import UUID

from sqlalchemy import String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _real_model_already_mapped(table_name: str, min_columns: int) -> bool:
    """True if a table with at least min_columns is already on Base.metadata.

    The real Tenant/User models have more columns than the stubs
    (7 and 12 respectively); a bare stub-only table has 2. This lets
    us detect "the real model already claimed this table name" without
    depending on import order between services.
    """
    table = Base.metadata.tables.get(table_name)
    return table is not None and len(table.columns) >= min_columns


if _real_model_already_mapped("tenants", min_columns=3):
    from services.auth.models.tenant import Tenant as TenantStub  # noqa: F401
else:

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


if _real_model_already_mapped("users", min_columns=3):
    from services.auth.models.user import User as UserStub  # noqa: F401
else:

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
