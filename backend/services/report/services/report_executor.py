"""
MindFlow Report Service - Report Executor
Executes SQL reports with parameter binding and result processing.
"""

import logging
import time
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Report, ReportExecution

logger = logging.getLogger(__name__)


class ReportExecutor:
    """Executes SQL reports and processes results."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute_report(
        self,
        report: Report,
        parameters: Dict[str, Any],
        tenant_id: UUID,
    ) -> Dict[str, Any]:
        """
        Execute a report query with parameters.

        Returns:
            Dict with 'columns', 'data', 'row_count', 'execution_time_ms'
        """
        start_time = time.time()

        # Validate and prepare parameters
        bound_params = self._prepare_parameters(report, parameters, tenant_id)

        # Execute query
        try:
            result = await self.db.execute(
                text(report.query_template),
                bound_params,
            )

            # Get column names from result
            columns = []
            if result.keys():
                columns = [
                    {
                        "name": key,
                        "type": self._get_column_type(key, report.columns_config),
                    }
                    for key in result.keys()
                ]

            # Fetch all rows
            rows = result.fetchall()
            data = [
                self._row_to_dict(row, result.keys())
                for row in rows
            ]

            execution_time_ms = int((time.time() - start_time) * 1000)

            return {
                "columns": columns,
                "data": data,
                "row_count": len(data),
                "execution_time_ms": execution_time_ms,
            }

        except Exception as e:
            logger.error(f"Report execution failed: {e}")
            raise

    def _prepare_parameters(
        self,
        report: Report,
        parameters: Dict[str, Any],
        tenant_id: UUID,
    ) -> Dict[str, Any]:
        """Validate and prepare parameters for SQL binding."""
        bound_params = {"tenant_id": tenant_id}

        # Get parameter definitions
        param_defs = {p.name: p for p in report.parameters}

        for param_name, param_def in param_defs.items():
            value = parameters.get(param_name, param_def.default_value)

            if param_def.is_required and value is None:
                raise ValueError(f"Required parameter '{param_name}' is missing")

            # Type conversion
            if value is not None:
                value = self._convert_parameter(value, param_def.param_type)

            bound_params[param_name] = value

        return bound_params

    def _convert_parameter(self, value: Any, param_type: str) -> Any:
        """Convert parameter value to appropriate type."""
        if value is None:
            return None

        try:
            if param_type == "UUID":
                return UUID(str(value)) if value else None
            elif param_type == "INTEGER":
                return int(value)
            elif param_type == "DATE":
                if isinstance(value, date):
                    return value
                return datetime.fromisoformat(str(value)).date()
            elif param_type == "BOOLEAN":
                if isinstance(value, bool):
                    return value
                return str(value).lower() in ("true", "1", "yes")
            else:
                return str(value)
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid parameter value: {e}")

    def _get_column_type(
        self,
        column_name: str,
        columns_config: List[Dict[str, Any]],
    ) -> str:
        """Get column type from config."""
        for col in columns_config:
            if col.get("name") == column_name:
                return col.get("type", "string")
        return "string"

    def _row_to_dict(self, row, keys) -> Dict[str, Any]:
        """Convert SQL row to dictionary with proper serialization."""
        result = {}
        for i, key in enumerate(keys):
            value = row[i]
            result[key] = self._serialize_value(value)
        return result

    def _serialize_value(self, value: Any) -> Any:
        """Serialize value for JSON output."""
        if value is None:
            return None
        elif isinstance(value, UUID):
            return str(value)
        elif isinstance(value, datetime):
            return value.isoformat()
        elif isinstance(value, date):
            return value.isoformat()
        elif isinstance(value, (int, float, str, bool)):
            return value
        else:
            return str(value)
