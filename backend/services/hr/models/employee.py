"""
MindFlow HR Service - Employee Model
Per DATABASE_SCHEMA.md Section 3.3.3

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    position_id UUID NOT NULL REFERENCES positions(id),
    department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES employees(id),
    date_of_joining DATE NOT NULL,
    date_of_exit DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    employment_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, employee_code),
    UNIQUE(tenant_id, email)
);
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .department import Department
    from .position import Position
    from .leave_balance import LeaveBalance
    from .leave_request import LeaveRequest
    from .attendance import AttendanceRecord


class Employee(Base):
    """
    Employee entity - PII with soft delete.
    Core HR entity linking users to organizational structure.
    """

    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("tenant_id", "employee_code", name="uq_employees_tenant_code"),
        UniqueConstraint("tenant_id", "email", name="uq_employees_tenant_email"),
    )

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id"),
        nullable=False,
        index=True
    )
    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    # Personal info
    employee_code: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Organization
    position_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("positions.id"),
        nullable=False,
        index=True
    )
    department_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("departments.id"),
        nullable=True,
        index=True
    )
    manager_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.id"),
        nullable=True,
        index=True
    )

    # Employment dates
    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    date_of_exit: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Status (ACTIVE, ON_LEAVE, TERMINATED, SUSPENDED)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")

    # Employment type (FULL_TIME, PART_TIME, CONTRACT, INTERN)
    employment_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="FULL_TIME"
    )

    # Salary
    salary: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    created_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )
    updated_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )

    # Soft delete (PII entity)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    position: Mapped["Position"] = relationship(
        "Position",
        back_populates="employees",
        lazy="selectin"
    )
    department: Mapped[Optional["Department"]] = relationship(
        "Department",
        foreign_keys=[department_id],
        back_populates="employees",
        lazy="selectin"
    )
    manager: Mapped[Optional["Employee"]] = relationship(
        "Employee",
        remote_side=[id],
        back_populates="subordinates",
        lazy="selectin"
    )
    subordinates: Mapped[List["Employee"]] = relationship(
        "Employee",
        back_populates="manager",
        lazy="selectin"
    )
    managed_department: Mapped[Optional["Department"]] = relationship(
        "Department",
        foreign_keys="Department.manager_id",
        back_populates="manager",
        lazy="selectin"
    )
    leave_balances: Mapped[List["LeaveBalance"]] = relationship(
        "LeaveBalance",
        back_populates="employee",
        lazy="selectin"
    )
    leave_requests: Mapped[List["LeaveRequest"]] = relationship(
        "LeaveRequest",
        foreign_keys="LeaveRequest.employee_id",
        back_populates="employee",
        lazy="selectin"
    )
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(
        "AttendanceRecord",
        back_populates="employee",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Employee(id={self.id}, code={self.employee_code}, name={self.first_name} {self.last_name})>"

    @property
    def full_name(self) -> str:
        """Get full name."""
        return f"{self.first_name} {self.last_name}"

    @property
    def is_active_employee(self) -> bool:
        """Check if employee is active."""
        return self.status == "ACTIVE" and not self.is_deleted
