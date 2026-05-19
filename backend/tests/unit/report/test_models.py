"""
Report Service Model Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- Report model
- ReportParameter model
- ReportExecution model
"""

import pytest
from datetime import datetime
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestReportModel:
    """Tests for Report model."""

    async def test_report_creation(self, db_session, test_tenant, test_user):
        """Test report creation."""
        from services.report.models.report import Report

        report = Report(
            tenant_id=test_tenant.id,
            code="HR_HEADCOUNT",
            name="Headcount by Department",
            description="Shows employee count grouped by department",
            category="HR",
            query_template="""
                SELECT d.name as department, COUNT(e.id) as headcount
                FROM departments d
                LEFT JOIN employees e ON e.department_id = d.id
                WHERE d.tenant_id = :tenant_id
                GROUP BY d.name
                ORDER BY headcount DESC
            """,
            default_format="JSON",
            columns_config=[
                {"field": "department", "header": "Department", "type": "string"},
                {"field": "headcount", "header": "Headcount", "type": "integer"},
            ],
            required_permission="report:hr:view",
            is_system=True,
            is_active=True,
            cache_ttl_seconds=300,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()
        await db_session.refresh(report)

        assert report.id is not None
        assert report.code == "HR_HEADCOUNT"
        assert report.category == "HR"
        assert report.is_system is True
        assert report.is_active is True

    async def test_report_categories(self, db_session, test_tenant, test_user):
        """Test different report categories."""
        from services.report.models.report import Report

        categories = ["HR", "TASK", "EXPENSE", "TRAINING"]

        for i, category in enumerate(categories):
            report = Report(
                tenant_id=test_tenant.id,
                code=f"{category}_REPORT_{i}",
                name=f"{category} Report",
                category=category,
                query_template="SELECT 1",
                created_by=test_user.id,
            )
            db_session.add(report)
            await db_session.commit()
            await db_session.refresh(report)
            assert report.category == category

    async def test_report_output_formats(self, db_session, test_tenant, test_user):
        """Test different output format defaults."""
        from services.report.models.report import Report

        formats = ["JSON", "PDF", "EXCEL", "CSV"]

        for i, fmt in enumerate(formats):
            report = Report(
                tenant_id=test_tenant.id,
                code=f"FORMAT_TEST_{i}",
                name=f"Format Test {fmt}",
                category="HR",
                query_template="SELECT 1",
                default_format=fmt,
                created_by=test_user.id,
            )
            db_session.add(report)
            await db_session.commit()
            await db_session.refresh(report)
            assert report.default_format == fmt

    async def test_report_system_flag(self, db_session, test_tenant, test_user):
        """Test system report flag."""
        from services.report.models.report import Report

        system_report = Report(
            tenant_id=test_tenant.id,
            code="SYSTEM_REPORT",
            name="System Report",
            category="HR",
            query_template="SELECT 1",
            is_system=True,
            created_by=test_user.id,
        )
        db_session.add(system_report)
        await db_session.commit()
        await db_session.refresh(system_report)

        assert system_report.is_system is True

        custom_report = Report(
            tenant_id=test_tenant.id,
            code="CUSTOM_REPORT",
            name="Custom Report",
            category="HR",
            query_template="SELECT 1",
            is_system=False,
            created_by=test_user.id,
        )
        db_session.add(custom_report)
        await db_session.commit()
        await db_session.refresh(custom_report)

        assert custom_report.is_system is False

    async def test_report_columns_config(self, db_session, test_tenant, test_user):
        """Test report column configuration."""
        from services.report.models.report import Report

        columns_config = [
            {"field": "employee_name", "header": "Employee", "type": "string", "width": 200},
            {"field": "department", "header": "Department", "type": "string", "width": 150},
            {"field": "hire_date", "header": "Hire Date", "type": "date", "format": "YYYY-MM-DD"},
            {"field": "salary", "header": "Salary", "type": "number", "format": "#,##0.00"},
        ]

        report = Report(
            tenant_id=test_tenant.id,
            code="COLUMNS_TEST",
            name="Columns Test Report",
            category="HR",
            query_template="SELECT 1",
            columns_config=columns_config,
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()
        await db_session.refresh(report)

        assert len(report.columns_config) == 4
        assert report.columns_config[0]["field"] == "employee_name"

    async def test_report_cache_ttl(self, db_session, test_tenant, test_user):
        """Test report cache TTL configuration."""
        from services.report.models.report import Report

        # Short cache for real-time data
        realtime_report = Report(
            tenant_id=test_tenant.id,
            code="REALTIME_REPORT",
            name="Realtime Report",
            category="TASK",
            query_template="SELECT 1",
            cache_ttl_seconds=60,  # 1 minute
            created_by=test_user.id,
        )
        db_session.add(realtime_report)
        await db_session.commit()

        assert realtime_report.cache_ttl_seconds == 60

        # Long cache for historical data
        historical_report = Report(
            tenant_id=test_tenant.id,
            code="HISTORICAL_REPORT",
            name="Historical Report",
            category="HR",
            query_template="SELECT 1",
            cache_ttl_seconds=3600,  # 1 hour
            created_by=test_user.id,
        )
        db_session.add(historical_report)
        await db_session.commit()

        assert historical_report.cache_ttl_seconds == 3600


class TestReportParameterModel:
    """Tests for ReportParameter model."""

    async def test_parameter_creation(self, db_session, test_tenant, test_user):
        """Test report parameter creation."""
        from services.report.models.report import Report, ReportParameter

        report = Report(
            tenant_id=test_tenant.id,
            code="PARAM_TEST_REPORT",
            name="Parameter Test Report",
            category="HR",
            query_template="SELECT * FROM employees WHERE department_id = :department_id",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        parameter = ReportParameter(
            report_id=report.id,
            name="department_id",
            label="Department",
            param_type="UUID",
            is_required=True,
            placeholder="Select a department",
            help_text="Filter by department",
            display_order=1,
        )
        db_session.add(parameter)
        await db_session.commit()
        await db_session.refresh(parameter)

        assert parameter.id is not None
        assert parameter.name == "department_id"
        assert parameter.param_type == "UUID"
        assert parameter.is_required is True

    async def test_parameter_types(self, db_session, test_tenant, test_user):
        """Test different parameter types."""
        from services.report.models.report import Report, ReportParameter

        report = Report(
            tenant_id=test_tenant.id,
            code="PARAM_TYPES_TEST",
            name="Parameter Types Test",
            category="HR",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        param_types = ["STRING", "INTEGER", "DATE", "UUID", "BOOLEAN"]

        for i, param_type in enumerate(param_types):
            parameter = ReportParameter(
                report_id=report.id,
                name=f"param_{param_type.lower()}",
                label=f"{param_type} Parameter",
                param_type=param_type,
                display_order=i,
            )
            db_session.add(parameter)
            await db_session.commit()
            await db_session.refresh(parameter)
            assert parameter.param_type == param_type

    async def test_parameter_validation(self, db_session, test_tenant, test_user):
        """Test parameter validation configuration."""
        from services.report.models.report import Report, ReportParameter

        report = Report(
            tenant_id=test_tenant.id,
            code="VALIDATION_TEST",
            name="Validation Test",
            category="HR",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        # Date parameter with range validation
        date_param = ReportParameter(
            report_id=report.id,
            name="start_date",
            label="Start Date",
            param_type="DATE",
            is_required=True,
            min_value="2020-01-01",
            max_value="2030-12-31",
            validation_regex=r"^\d{4}-\d{2}-\d{2}$",
        )
        db_session.add(date_param)
        await db_session.commit()

        assert date_param.min_value == "2020-01-01"
        assert date_param.max_value == "2030-12-31"

    async def test_parameter_allowed_values(self, db_session, test_tenant, test_user):
        """Test parameter with allowed values (enum-like)."""
        from services.report.models.report import Report, ReportParameter

        report = Report(
            tenant_id=test_tenant.id,
            code="ENUM_PARAM_TEST",
            name="Enum Parameter Test",
            category="TASK",
            query_template="SELECT * FROM tasks WHERE status = :status",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        status_param = ReportParameter(
            report_id=report.id,
            name="status",
            label="Task Status",
            param_type="STRING",
            is_required=False,
            default_value="ALL",
            allowed_values=["ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
        )
        db_session.add(status_param)
        await db_session.commit()
        await db_session.refresh(status_param)

        assert "PENDING" in status_param.allowed_values
        assert len(status_param.allowed_values) == 5

    async def test_parameter_default_value(self, db_session, test_tenant, test_user):
        """Test parameter with default value."""
        from services.report.models.report import Report, ReportParameter

        report = Report(
            tenant_id=test_tenant.id,
            code="DEFAULT_PARAM_TEST",
            name="Default Parameter Test",
            category="EXPENSE",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        parameter = ReportParameter(
            report_id=report.id,
            name="limit",
            label="Result Limit",
            param_type="INTEGER",
            is_required=False,
            default_value="100",
        )
        db_session.add(parameter)
        await db_session.commit()
        await db_session.refresh(parameter)

        assert parameter.default_value == "100"
        assert parameter.is_required is False

    async def test_parameters_cascade_delete(self, db_session, test_tenant, test_user):
        """Test parameters are deleted when report is deleted."""
        from services.report.models.report import Report, ReportParameter
        from sqlalchemy import select

        report = Report(
            tenant_id=test_tenant.id,
            code="CASCADE_DELETE_TEST",
            name="Cascade Delete Test",
            category="HR",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        for i in range(3):
            param = ReportParameter(
                report_id=report.id,
                name=f"param_{i}",
                label=f"Parameter {i}",
                param_type="STRING",
            )
            db_session.add(param)

        await db_session.commit()

        report_id = report.id

        # Delete report
        await db_session.delete(report)
        await db_session.commit()

        # Verify parameters are also deleted
        stmt = select(ReportParameter).where(ReportParameter.report_id == report_id)
        result = await db_session.execute(stmt)
        params = result.scalars().all()

        assert len(params) == 0


class TestReportExecutionModel:
    """Tests for ReportExecution model."""

    async def test_execution_creation(self, db_session, test_tenant, test_user):
        """Test report execution creation."""
        from services.report.models.report import Report, ReportExecution

        report = Report(
            tenant_id=test_tenant.id,
            code="EXECUTION_TEST",
            name="Execution Test Report",
            category="HR",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        execution = ReportExecution(
            tenant_id=test_tenant.id,
            report_id=report.id,
            executed_by=test_user.id,
            parameters={"department_id": str(uuid4())},
            format="PDF",
            status="PENDING",
        )
        db_session.add(execution)
        await db_session.commit()
        await db_session.refresh(execution)

        assert execution.id is not None
        assert execution.status == "PENDING"
        assert execution.format == "PDF"

    async def test_execution_status_values(self, db_session, test_tenant, test_user):
        """Test execution status values."""
        from services.report.models.report import Report, ReportExecution

        report = Report(
            tenant_id=test_tenant.id,
            code="EXEC_STATUS_TEST",
            name="Execution Status Test",
            category="HR",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        statuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED"]

        for status in statuses:
            execution = ReportExecution(
                tenant_id=test_tenant.id,
                report_id=report.id,
                executed_by=test_user.id,
                format="JSON",
                status=status,
            )
            db_session.add(execution)
            await db_session.commit()
            await db_session.refresh(execution)
            assert execution.status == status

    async def test_execution_completion(self, db_session, test_tenant, test_user):
        """Test execution completion with results."""
        from services.report.models.report import Report, ReportExecution

        report = Report(
            tenant_id=test_tenant.id,
            code="EXEC_COMPLETE_TEST",
            name="Execution Complete Test",
            category="TASK",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        execution = ReportExecution(
            tenant_id=test_tenant.id,
            report_id=report.id,
            executed_by=test_user.id,
            format="JSON",
            status="PENDING",
        )
        db_session.add(execution)
        await db_session.commit()

        # Complete execution
        execution.status = "COMPLETED"
        execution.row_count = 150
        execution.execution_time_ms = 250
        execution.completed_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(execution)

        assert execution.status == "COMPLETED"
        assert execution.row_count == 150
        assert execution.execution_time_ms == 250
        assert execution.completed_at is not None

    async def test_execution_failure(self, db_session, test_tenant, test_user):
        """Test execution failure with error message."""
        from services.report.models.report import Report, ReportExecution

        report = Report(
            tenant_id=test_tenant.id,
            code="EXEC_FAIL_TEST",
            name="Execution Fail Test",
            category="EXPENSE",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        execution = ReportExecution(
            tenant_id=test_tenant.id,
            report_id=report.id,
            executed_by=test_user.id,
            format="EXCEL",
            status="RUNNING",
        )
        db_session.add(execution)
        await db_session.commit()

        # Fail execution
        execution.status = "FAILED"
        execution.error_message = "Database connection timeout"
        execution.completed_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(execution)

        assert execution.status == "FAILED"
        assert execution.error_message == "Database connection timeout"
        assert execution.row_count is None

    async def test_execution_with_parameters(self, db_session, test_tenant, test_user):
        """Test execution with parameters stored."""
        from services.report.models.report import Report, ReportExecution

        report = Report(
            tenant_id=test_tenant.id,
            code="EXEC_PARAMS_TEST",
            name="Execution Params Test",
            category="HR",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        params = {
            "department_id": str(uuid4()),
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "include_inactive": False,
        }

        execution = ReportExecution(
            tenant_id=test_tenant.id,
            report_id=report.id,
            executed_by=test_user.id,
            parameters=params,
            format="CSV",
        )
        db_session.add(execution)
        await db_session.commit()
        await db_session.refresh(execution)

        assert execution.parameters["start_date"] == "2026-01-01"
        assert execution.parameters["include_inactive"] is False

    async def test_execution_with_file_output(self, db_session, test_tenant, test_user):
        """Test execution with file output reference."""
        from services.report.models.report import Report, ReportExecution

        report = Report(
            tenant_id=test_tenant.id,
            code="EXEC_FILE_TEST",
            name="Execution File Test",
            category="TRAINING",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        file_id = uuid4()
        execution = ReportExecution(
            tenant_id=test_tenant.id,
            report_id=report.id,
            executed_by=test_user.id,
            format="PDF",
            status="COMPLETED",
            row_count=50,
            result_file_id=file_id,
            completed_at=datetime.utcnow(),
        )
        db_session.add(execution)
        await db_session.commit()
        await db_session.refresh(execution)

        assert execution.result_file_id == file_id
        assert execution.format == "PDF"

    async def test_execution_formats(self, db_session, test_tenant, test_user):
        """Test different execution output formats."""
        from services.report.models.report import Report, ReportExecution

        report = Report(
            tenant_id=test_tenant.id,
            code="EXEC_FORMATS_TEST",
            name="Execution Formats Test",
            category="HR",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        formats = ["JSON", "PDF", "EXCEL", "CSV"]

        for fmt in formats:
            execution = ReportExecution(
                tenant_id=test_tenant.id,
                report_id=report.id,
                executed_by=test_user.id,
                format=fmt,
            )
            db_session.add(execution)
            await db_session.commit()
            await db_session.refresh(execution)
            assert execution.format == fmt


class TestReportRelationships:
    """Tests for Report model relationships."""

    async def test_report_parameters_relationship(
        self, db_session, test_tenant, test_user
    ):
        """Test report to parameters relationship."""
        from services.report.models.report import Report, ReportParameter

        report = Report(
            tenant_id=test_tenant.id,
            code="REL_PARAMS_TEST",
            name="Relationship Parameters Test",
            category="HR",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        for i in range(3):
            param = ReportParameter(
                report_id=report.id,
                name=f"param_{i}",
                label=f"Parameter {i}",
                param_type="STRING",
                display_order=i,
            )
            db_session.add(param)

        await db_session.commit()
        await db_session.refresh(report)

        assert len(report.parameters) == 3

    async def test_report_executions_relationship(
        self, db_session, test_tenant, test_user
    ):
        """Test report to executions relationship."""
        from services.report.models.report import Report, ReportExecution

        report = Report(
            tenant_id=test_tenant.id,
            code="REL_EXEC_TEST",
            name="Relationship Executions Test",
            category="TASK",
            query_template="SELECT 1",
            created_by=test_user.id,
        )
        db_session.add(report)
        await db_session.commit()

        for i in range(5):
            execution = ReportExecution(
                tenant_id=test_tenant.id,
                report_id=report.id,
                executed_by=test_user.id,
                format="JSON",
                status="COMPLETED",
            )
            db_session.add(execution)

        await db_session.commit()
        await db_session.refresh(report)

        assert len(report.executions) == 5
