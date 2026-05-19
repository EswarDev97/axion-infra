"""
MindFlow Report Service - Report Service
Business logic for report management.
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import ResourceNotFoundException

from ..models import Report, ReportParameter, ReportExecution


class ReportService:
    """Service for report management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_reports(
        self,
        tenant_id: UUID,
        category: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Report], int]:
        """List available reports."""
        query = select(Report).where(
            Report.tenant_id == tenant_id,
            Report.is_active == is_active,
        )

        if category:
            query = query.where(Report.category == category)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        result = await self.db.execute(count_query)
        total = result.scalar() or 0

        # Paginate
        query = query.options(selectinload(Report.parameters))
        query = query.order_by(Report.category, Report.name)
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        reports = list(result.scalars().all())

        return reports, total

    async def get_report(
        self,
        report_id: UUID,
        tenant_id: UUID,
    ) -> Report:
        """Get report by ID."""
        query = select(Report).where(
            Report.id == report_id,
            Report.tenant_id == tenant_id,
        ).options(selectinload(Report.parameters))

        result = await self.db.execute(query)
        report = result.scalar_one_or_none()

        if not report:
            raise ResourceNotFoundException("Report", str(report_id))

        return report

    async def get_report_by_code(
        self,
        code: str,
        tenant_id: UUID,
    ) -> Optional[Report]:
        """Get report by code."""
        query = select(Report).where(
            Report.code == code,
            Report.tenant_id == tenant_id,
        ).options(selectinload(Report.parameters))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_execution(
        self,
        tenant_id: UUID,
        report_id: UUID,
        executed_by: UUID,
        parameters: dict,
        format: str,
    ) -> ReportExecution:
        """Create a report execution record."""
        execution = ReportExecution(
            tenant_id=tenant_id,
            report_id=report_id,
            executed_by=executed_by,
            parameters=parameters,
            format=format,
            status="PENDING",
        )

        self.db.add(execution)
        await self.db.commit()

        # Re-fetch to avoid lazy loading issues
        stmt = select(ReportExecution).where(ReportExecution.id == execution.id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def update_execution(
        self,
        execution: ReportExecution,
        status: str,
        row_count: Optional[int] = None,
        execution_time_ms: Optional[int] = None,
        result_file_id: Optional[UUID] = None,
        error_message: Optional[str] = None,
    ) -> ReportExecution:
        """Update execution status and results."""
        execution.status = status

        if row_count is not None:
            execution.row_count = row_count
        if execution_time_ms is not None:
            execution.execution_time_ms = execution_time_ms
        if result_file_id:
            execution.result_file_id = result_file_id
        if error_message:
            execution.error_message = error_message

        if status in ("COMPLETED", "FAILED"):
            execution.completed_at = datetime.utcnow()

        await self.db.commit()

        # Re-fetch to avoid lazy loading issues
        stmt = select(ReportExecution).where(ReportExecution.id == execution.id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_execution(
        self,
        execution_id: UUID,
        tenant_id: UUID,
    ) -> ReportExecution:
        """Get execution by ID."""
        query = select(ReportExecution).where(
            ReportExecution.id == execution_id,
            ReportExecution.tenant_id == tenant_id,
        )

        result = await self.db.execute(query)
        execution = result.scalar_one_or_none()

        if not execution:
            raise ResourceNotFoundException("ReportExecution", str(execution_id))

        return execution

    async def list_executions(
        self,
        tenant_id: UUID,
        report_id: Optional[UUID] = None,
        executed_by: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ReportExecution], int]:
        """List report executions."""
        query = select(ReportExecution).where(
            ReportExecution.tenant_id == tenant_id,
        )

        if report_id:
            query = query.where(ReportExecution.report_id == report_id)
        if executed_by:
            query = query.where(ReportExecution.executed_by == executed_by)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        result = await self.db.execute(count_query)
        total = result.scalar() or 0

        # Paginate
        query = query.order_by(ReportExecution.executed_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        executions = list(result.scalars().all())

        return executions, total

    async def seed_system_reports(self, tenant_id: UUID, created_by: UUID) -> int:
        """Seed the 12 system reports for a tenant."""
        system_reports = self._get_system_report_definitions()
        count = 0

        for report_def in system_reports:
            existing = await self.get_report_by_code(report_def["code"], tenant_id)
            if not existing:
                report = Report(
                    tenant_id=tenant_id,
                    code=report_def["code"],
                    name=report_def["name"],
                    description=report_def["description"],
                    category=report_def["category"],
                    query_template=report_def["query_template"],
                    default_format=report_def.get("default_format", "JSON"),
                    columns_config=report_def.get("columns_config", []),
                    required_permission=report_def.get("required_permission"),
                    is_system=True,
                    is_active=True,
                    cache_ttl_seconds=report_def.get("cache_ttl_seconds", 300),
                    created_by=created_by,
                )
                self.db.add(report)

                # Add parameters
                for param_def in report_def.get("parameters", []):
                    param = ReportParameter(
                        report_id=report.id,
                        **param_def,
                    )
                    self.db.add(param)

                count += 1

        await self.db.commit()
        return count

    def _get_system_report_definitions(self) -> List[dict]:
        """Return the 12 system report definitions per PO-030."""
        return [
            # HR Reports
            {
                "code": "HR_HEADCOUNT",
                "name": "Headcount Report",
                "description": "Employee headcount by department, role, and location",
                "category": "HR",
                "query_template": """
                    SELECT
                        d.name as department,
                        COUNT(e.id) as headcount,
                        COUNT(CASE WHEN e.employment_status = 'ACTIVE' THEN 1 END) as active,
                        COUNT(CASE WHEN e.employment_status = 'ON_LEAVE' THEN 1 END) as on_leave
                    FROM employees e
                    JOIN departments d ON e.department_id = d.id
                    WHERE e.tenant_id = :tenant_id
                        AND (:department_id IS NULL OR e.department_id = :department_id)
                    GROUP BY d.name
                    ORDER BY headcount DESC
                """,
                "columns_config": [
                    {"name": "department", "label": "Department", "type": "string"},
                    {"name": "headcount", "label": "Total Headcount", "type": "integer"},
                    {"name": "active", "label": "Active", "type": "integer"},
                    {"name": "on_leave", "label": "On Leave", "type": "integer"},
                ],
                "required_permission": "report:read:hr",
                "parameters": [
                    {
                        "name": "department_id",
                        "label": "Department",
                        "param_type": "UUID",
                        "is_required": False,
                        "display_order": 1,
                        "placeholder": "All departments",
                    },
                ],
            },
            {
                "code": "HR_TURNOVER",
                "name": "Turnover Report",
                "description": "Employee turnover analysis by period",
                "category": "HR",
                "query_template": """
                    SELECT
                        TO_CHAR(date_trunc('month', e.termination_date), 'YYYY-MM') as month,
                        COUNT(e.id) as terminations,
                        AVG(EXTRACT(days FROM (e.termination_date - e.hire_date))) as avg_tenure_days
                    FROM employees e
                    WHERE e.tenant_id = :tenant_id
                        AND e.termination_date IS NOT NULL
                        AND e.termination_date >= :start_date
                        AND e.termination_date <= :end_date
                    GROUP BY date_trunc('month', e.termination_date)
                    ORDER BY month
                """,
                "columns_config": [
                    {"name": "month", "label": "Month", "type": "string"},
                    {"name": "terminations", "label": "Terminations", "type": "integer"},
                    {"name": "avg_tenure_days", "label": "Avg Tenure (days)", "type": "decimal"},
                ],
                "required_permission": "report:read:hr",
                "parameters": [
                    {
                        "name": "start_date",
                        "label": "Start Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "name": "end_date",
                        "label": "End Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 2,
                    },
                ],
            },
            {
                "code": "HR_LEAVE_SUMMARY",
                "name": "Leave Summary Report",
                "description": "Leave utilization by type and department",
                "category": "HR",
                "query_template": """
                    SELECT
                        lt.name as leave_type,
                        d.name as department,
                        COUNT(lr.id) as request_count,
                        SUM(lr.days_requested) as total_days
                    FROM leave_requests lr
                    JOIN leave_types lt ON lr.leave_type_id = lt.id
                    JOIN employees e ON lr.employee_id = e.id
                    JOIN departments d ON e.department_id = d.id
                    WHERE lr.tenant_id = :tenant_id
                        AND lr.status = 'APPROVED'
                        AND lr.start_date >= :start_date
                        AND lr.start_date <= :end_date
                    GROUP BY lt.name, d.name
                    ORDER BY total_days DESC
                """,
                "columns_config": [
                    {"name": "leave_type", "label": "Leave Type", "type": "string"},
                    {"name": "department", "label": "Department", "type": "string"},
                    {"name": "request_count", "label": "Requests", "type": "integer"},
                    {"name": "total_days", "label": "Total Days", "type": "decimal"},
                ],
                "required_permission": "report:read:hr",
                "parameters": [
                    {
                        "name": "start_date",
                        "label": "Start Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "name": "end_date",
                        "label": "End Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 2,
                    },
                ],
            },
            {
                "code": "HR_ATTENDANCE",
                "name": "Attendance Report",
                "description": "Daily attendance tracking and summary",
                "category": "HR",
                "query_template": """
                    SELECT
                        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') as date,
                        d.name as department,
                        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
                        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
                        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late,
                        ROUND(COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as attendance_rate
                    FROM attendance a
                    JOIN employees e ON a.employee_id = e.id
                    JOIN departments d ON e.department_id = d.id
                    WHERE a.tenant_id = :tenant_id
                        AND a.attendance_date >= :start_date
                        AND a.attendance_date <= :end_date
                        AND (:department_id IS NULL OR e.department_id = :department_id)
                    GROUP BY a.attendance_date, d.name
                    ORDER BY date, department
                """,
                "columns_config": [
                    {"name": "date", "label": "Date", "type": "string"},
                    {"name": "department", "label": "Department", "type": "string"},
                    {"name": "present", "label": "Present", "type": "integer"},
                    {"name": "absent", "label": "Absent", "type": "integer"},
                    {"name": "late", "label": "Late", "type": "integer"},
                    {"name": "attendance_rate", "label": "Attendance %", "type": "decimal"},
                ],
                "required_permission": "report:read:hr",
                "parameters": [
                    {
                        "name": "start_date",
                        "label": "Start Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "name": "end_date",
                        "label": "End Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 2,
                    },
                    {
                        "name": "department_id",
                        "label": "Department",
                        "param_type": "UUID",
                        "is_required": False,
                        "display_order": 3,
                    },
                ],
            },
            # Task Reports
            {
                "code": "TASK_COMPLETION",
                "name": "Task Completion Report",
                "description": "Task completion rates and trends",
                "category": "TASK",
                "query_template": """
                    SELECT
                        TO_CHAR(date_trunc('week', t.actual_completion_date), 'YYYY-WW') as week,
                        COUNT(t.id) as completed_tasks,
                        AVG(EXTRACT(days FROM (t.actual_completion_date - t.created_at))) as avg_completion_days,
                        SUM(t.actual_hours) as total_hours
                    FROM tasks t
                    WHERE t.tenant_id = :tenant_id
                        AND t.actual_completion_date IS NOT NULL
                        AND t.actual_completion_date >= :start_date
                        AND t.actual_completion_date <= :end_date
                        AND t.is_deleted = false
                    GROUP BY date_trunc('week', t.actual_completion_date)
                    ORDER BY week
                """,
                "columns_config": [
                    {"name": "week", "label": "Week", "type": "string"},
                    {"name": "completed_tasks", "label": "Completed Tasks", "type": "integer"},
                    {"name": "avg_completion_days", "label": "Avg Days to Complete", "type": "decimal"},
                    {"name": "total_hours", "label": "Total Hours", "type": "decimal"},
                ],
                "required_permission": "report:read:task",
                "parameters": [
                    {
                        "name": "start_date",
                        "label": "Start Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "name": "end_date",
                        "label": "End Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 2,
                    },
                ],
            },
            {
                "code": "TASK_OVERDUE",
                "name": "Overdue Tasks Report",
                "description": "List of overdue tasks with assignees",
                "category": "TASK",
                "query_template": """
                    SELECT
                        t.id,
                        t.title,
                        t.priority,
                        t.expected_completion_date as due_date,
                        CURRENT_DATE - t.expected_completion_date as days_overdue,
                        ts.name as status,
                        e.first_name || ' ' || e.last_name as assignee
                    FROM tasks t
                    JOIN task_statuses ts ON t.status_id = ts.id
                    LEFT JOIN task_assignees ta ON t.id = ta.task_id
                    LEFT JOIN employees e ON ta.employee_id = e.id
                    WHERE t.tenant_id = :tenant_id
                        AND t.expected_completion_date < CURRENT_DATE
                        AND t.actual_completion_date IS NULL
                        AND t.is_deleted = false
                        AND (:priority IS NULL OR t.priority = :priority)
                    ORDER BY days_overdue DESC
                """,
                "columns_config": [
                    {"name": "id", "label": "Task ID", "type": "uuid"},
                    {"name": "title", "label": "Title", "type": "string"},
                    {"name": "priority", "label": "Priority", "type": "string"},
                    {"name": "due_date", "label": "Due Date", "type": "date"},
                    {"name": "days_overdue", "label": "Days Overdue", "type": "integer"},
                    {"name": "status", "label": "Status", "type": "string"},
                    {"name": "assignee", "label": "Assignee", "type": "string"},
                ],
                "required_permission": "report:read:task",
                "parameters": [
                    {
                        "name": "priority",
                        "label": "Priority",
                        "param_type": "STRING",
                        "is_required": False,
                        "display_order": 1,
                        "allowed_values": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                    },
                ],
            },
            {
                "code": "TASK_ASSIGNMENT",
                "name": "Task Assignment Report",
                "description": "Task distribution across team members",
                "category": "TASK",
                "query_template": """
                    SELECT
                        e.first_name || ' ' || e.last_name as employee,
                        COUNT(t.id) as total_tasks,
                        COUNT(CASE WHEN t.actual_completion_date IS NOT NULL THEN 1 END) as completed,
                        COUNT(CASE WHEN t.expected_completion_date < CURRENT_DATE AND t.actual_completion_date IS NULL THEN 1 END) as overdue,
                        COUNT(CASE WHEN t.actual_completion_date IS NULL AND t.expected_completion_date >= CURRENT_DATE THEN 1 END) as in_progress
                    FROM task_assignees ta
                    JOIN tasks t ON ta.task_id = t.id
                    JOIN employees e ON ta.employee_id = e.id
                    WHERE t.tenant_id = :tenant_id
                        AND t.is_deleted = false
                        AND t.created_at >= :start_date
                        AND t.created_at <= :end_date
                    GROUP BY e.id, e.first_name, e.last_name
                    ORDER BY total_tasks DESC
                """,
                "columns_config": [
                    {"name": "employee", "label": "Employee", "type": "string"},
                    {"name": "total_tasks", "label": "Total Tasks", "type": "integer"},
                    {"name": "completed", "label": "Completed", "type": "integer"},
                    {"name": "overdue", "label": "Overdue", "type": "integer"},
                    {"name": "in_progress", "label": "In Progress", "type": "integer"},
                ],
                "required_permission": "report:read:task",
                "parameters": [
                    {
                        "name": "start_date",
                        "label": "Start Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "name": "end_date",
                        "label": "End Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 2,
                    },
                ],
            },
            # Expense Reports
            {
                "code": "EXPENSE_SPENDING",
                "name": "Expense Spending Report",
                "description": "Monthly expense spending analysis",
                "category": "EXPENSE",
                "query_template": """
                    SELECT
                        TO_CHAR(date_trunc('month', er.expense_date), 'YYYY-MM') as month,
                        COUNT(er.id) as request_count,
                        SUM(er.total_amount) as total_spending,
                        AVG(er.total_amount) as avg_per_request,
                        er.currency
                    FROM expense_requests er
                    WHERE er.tenant_id = :tenant_id
                        AND er.status IN ('MANAGER_APPROVED', 'FINANCE_APPROVED', 'PAID')
                        AND er.expense_date >= :start_date
                        AND er.expense_date <= :end_date
                        AND er.is_deleted = false
                    GROUP BY date_trunc('month', er.expense_date), er.currency
                    ORDER BY month
                """,
                "columns_config": [
                    {"name": "month", "label": "Month", "type": "string"},
                    {"name": "request_count", "label": "Requests", "type": "integer"},
                    {"name": "total_spending", "label": "Total Spending", "type": "decimal"},
                    {"name": "avg_per_request", "label": "Avg per Request", "type": "decimal"},
                    {"name": "currency", "label": "Currency", "type": "string"},
                ],
                "required_permission": "report:read:expense",
                "parameters": [
                    {
                        "name": "start_date",
                        "label": "Start Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "name": "end_date",
                        "label": "End Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 2,
                    },
                ],
            },
            {
                "code": "EXPENSE_CATEGORY",
                "name": "Expense by Category Report",
                "description": "Expense breakdown by category",
                "category": "EXPENSE",
                "query_template": """
                    SELECT
                        ec.name as category,
                        COUNT(ei.id) as item_count,
                        SUM(ei.amount) as total_amount,
                        ROUND(SUM(ei.amount) * 100.0 / NULLIF(SUM(SUM(ei.amount)) OVER(), 0), 2) as percentage
                    FROM expense_items ei
                    JOIN expense_categories ec ON ei.category_id = ec.id
                    JOIN expense_requests er ON ei.expense_request_id = er.id
                    WHERE er.tenant_id = :tenant_id
                        AND er.status IN ('MANAGER_APPROVED', 'FINANCE_APPROVED', 'PAID')
                        AND er.expense_date >= :start_date
                        AND er.expense_date <= :end_date
                        AND er.is_deleted = false
                    GROUP BY ec.name
                    ORDER BY total_amount DESC
                """,
                "columns_config": [
                    {"name": "category", "label": "Category", "type": "string"},
                    {"name": "item_count", "label": "Items", "type": "integer"},
                    {"name": "total_amount", "label": "Total Amount", "type": "decimal"},
                    {"name": "percentage", "label": "% of Total", "type": "decimal"},
                ],
                "required_permission": "report:read:expense",
                "parameters": [
                    {
                        "name": "start_date",
                        "label": "Start Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "name": "end_date",
                        "label": "End Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 2,
                    },
                ],
            },
            {
                "code": "EXPENSE_PENDING",
                "name": "Pending Expenses Report",
                "description": "Expenses awaiting approval",
                "category": "EXPENSE",
                "query_template": """
                    SELECT
                        er.id,
                        er.request_number,
                        er.title,
                        e.first_name || ' ' || e.last_name as submitter,
                        er.total_amount,
                        er.currency,
                        er.status,
                        er.submitted_at,
                        CURRENT_DATE - DATE(er.submitted_at) as days_pending
                    FROM expense_requests er
                    JOIN employees e ON er.employee_id = e.id
                    WHERE er.tenant_id = :tenant_id
                        AND er.status IN ('SUBMITTED', 'MANAGER_APPROVED')
                        AND er.is_deleted = false
                    ORDER BY er.submitted_at
                """,
                "columns_config": [
                    {"name": "id", "label": "ID", "type": "uuid"},
                    {"name": "request_number", "label": "Request #", "type": "string"},
                    {"name": "title", "label": "Title", "type": "string"},
                    {"name": "submitter", "label": "Submitter", "type": "string"},
                    {"name": "total_amount", "label": "Amount", "type": "decimal"},
                    {"name": "currency", "label": "Currency", "type": "string"},
                    {"name": "status", "label": "Status", "type": "string"},
                    {"name": "submitted_at", "label": "Submitted", "type": "datetime"},
                    {"name": "days_pending", "label": "Days Pending", "type": "integer"},
                ],
                "required_permission": "report:read:expense",
                "parameters": [],
            },
            # Training Reports
            {
                "code": "TRAINING_COMPLETION",
                "name": "Training Completion Report",
                "description": "Course completion rates and progress",
                "category": "TRAINING",
                "query_template": """
                    SELECT
                        c.title as course,
                        COUNT(DISTINCT te.employee_id) as enrolled,
                        COUNT(DISTINCT CASE WHEN te.status = 'COMPLETED' THEN te.employee_id END) as completed,
                        ROUND(COUNT(DISTINCT CASE WHEN te.status = 'COMPLETED' THEN te.employee_id END) * 100.0 /
                              NULLIF(COUNT(DISTINCT te.employee_id), 0), 2) as completion_rate,
                        AVG(te.score) as avg_score
                    FROM training_enrollments te
                    JOIN training_courses c ON te.course_id = c.id
                    WHERE te.tenant_id = :tenant_id
                        AND te.enrolled_at >= :start_date
                        AND te.enrolled_at <= :end_date
                        AND (:course_id IS NULL OR te.course_id = :course_id)
                    GROUP BY c.title
                    ORDER BY completion_rate DESC
                """,
                "columns_config": [
                    {"name": "course", "label": "Course", "type": "string"},
                    {"name": "enrolled", "label": "Enrolled", "type": "integer"},
                    {"name": "completed", "label": "Completed", "type": "integer"},
                    {"name": "completion_rate", "label": "Completion %", "type": "decimal"},
                    {"name": "avg_score", "label": "Avg Score", "type": "decimal"},
                ],
                "required_permission": "report:read:training",
                "parameters": [
                    {
                        "name": "start_date",
                        "label": "Start Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "name": "end_date",
                        "label": "End Date",
                        "param_type": "DATE",
                        "is_required": True,
                        "display_order": 2,
                    },
                    {
                        "name": "course_id",
                        "label": "Course",
                        "param_type": "UUID",
                        "is_required": False,
                        "display_order": 3,
                    },
                ],
            },
            {
                "code": "TRAINING_COMPLIANCE",
                "name": "Training Compliance Report",
                "description": "Mandatory training compliance status",
                "category": "TRAINING",
                "query_template": """
                    SELECT
                        c.title as course,
                        c.is_mandatory,
                        d.name as department,
                        COUNT(DISTINCT e.id) as employees,
                        COUNT(DISTINCT CASE WHEN te.status = 'COMPLETED' THEN e.id END) as compliant,
                        ROUND(COUNT(DISTINCT CASE WHEN te.status = 'COMPLETED' THEN e.id END) * 100.0 /
                              NULLIF(COUNT(DISTINCT e.id), 0), 2) as compliance_rate
                    FROM training_courses c
                    CROSS JOIN departments d
                    JOIN employees e ON e.department_id = d.id
                    LEFT JOIN training_enrollments te ON te.course_id = c.id AND te.employee_id = e.id
                    WHERE c.tenant_id = :tenant_id
                        AND c.is_mandatory = true
                        AND c.is_active = true
                        AND e.employment_status = 'ACTIVE'
                    GROUP BY c.title, c.is_mandatory, d.name
                    ORDER BY compliance_rate
                """,
                "columns_config": [
                    {"name": "course", "label": "Course", "type": "string"},
                    {"name": "is_mandatory", "label": "Mandatory", "type": "boolean"},
                    {"name": "department", "label": "Department", "type": "string"},
                    {"name": "employees", "label": "Total Employees", "type": "integer"},
                    {"name": "compliant", "label": "Compliant", "type": "integer"},
                    {"name": "compliance_rate", "label": "Compliance %", "type": "decimal"},
                ],
                "required_permission": "report:read:training",
                "parameters": [],
            },
        ]
