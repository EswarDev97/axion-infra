"""
MindFlow Report Service - Report Models
Per PO-030 Task 6.5
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from shared.database import Base


class Report(Base):
    """
    Report definition model.

    Stores the 12 SQL reports defined in PO-030:
    - HR Reports: Headcount, Turnover, Leave, Attendance
    - Task Reports: Completion, Overdue, Assignment
    - Expense Reports: Spending, Category, Pending
    - Training Reports: Completion, Compliance
    """

    __tablename__ = "reports"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)

    # Report identification
    code = Column(String(50), nullable=False, index=True)  # e.g., "HR_HEADCOUNT"
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # HR, TASK, EXPENSE, TRAINING

    # SQL query
    query_template = Column(Text, nullable=False)

    # Output configuration
    default_format = Column(String(20), default="JSON")  # JSON, PDF, EXCEL, CSV
    columns_config = Column(JSONB, default=list)  # Column definitions

    # Access control
    required_permission = Column(String(100), nullable=True)
    is_system = Column(Boolean, default=False)  # System reports cannot be deleted
    is_active = Column(Boolean, default=True)

    # Caching
    cache_ttl_seconds = Column(Integer, default=300)  # 5 minutes default

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(PGUUID(as_uuid=True), nullable=True)
    updated_by = Column(PGUUID(as_uuid=True), nullable=True)

    # Relationships
    parameters = relationship("ReportParameter", back_populates="report", cascade="all, delete-orphan")
    executions = relationship("ReportExecution", back_populates="report")

    def __repr__(self):
        return f"<Report {self.code}: {self.name}>"


class ReportParameter(Base):
    """Report parameter definition."""

    __tablename__ = "report_parameters"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    report_id = Column(PGUUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)

    # Parameter definition
    name = Column(String(100), nullable=False)  # Parameter name in SQL
    label = Column(String(255), nullable=False)  # Display label
    param_type = Column(String(50), nullable=False)  # STRING, INTEGER, DATE, UUID, BOOLEAN
    is_required = Column(Boolean, default=True)
    default_value = Column(String(255), nullable=True)

    # Validation
    validation_regex = Column(String(500), nullable=True)
    min_value = Column(String(100), nullable=True)
    max_value = Column(String(100), nullable=True)
    allowed_values = Column(JSONB, nullable=True)  # For enum-like parameters

    # UI hints
    display_order = Column(Integer, default=0)
    placeholder = Column(String(255), nullable=True)
    help_text = Column(Text, nullable=True)

    # Relationship
    report = relationship("Report", back_populates="parameters")

    def __repr__(self):
        return f"<ReportParameter {self.name} ({self.param_type})>"


class ReportExecution(Base):
    """Report execution history and results."""

    __tablename__ = "report_executions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    report_id = Column(PGUUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)

    # Execution details
    executed_by = Column(PGUUID(as_uuid=True), nullable=False)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    parameters = Column(JSONB, default=dict)  # Parameters used
    format = Column(String(20), nullable=False)  # JSON, PDF, EXCEL, CSV

    # Status
    status = Column(
        String(20),
        default="PENDING",
        nullable=False,
    )  # PENDING, RUNNING, COMPLETED, FAILED

    # Results
    row_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    result_file_id = Column(PGUUID(as_uuid=True), nullable=True)  # For PDF/Excel exports
    error_message = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    report = relationship("Report", back_populates="executions")

    def __repr__(self):
        return f"<ReportExecution {self.report_id} by {self.executed_by} at {self.executed_at}>"
