"""
MindFlow Report Service - Base Exporter
Abstract base class for report exporters.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List


class BaseExporter(ABC):
    """Abstract base class for report exporters."""

    def __init__(
        self,
        report_name: str,
        columns: List[Dict[str, Any]],
        data: List[Dict[str, Any]],
    ):
        self.report_name = report_name
        self.columns = columns
        self.data = data
        self.generated_at = datetime.utcnow()

    @abstractmethod
    def export(self) -> BytesIO:
        """Export data to format and return as BytesIO stream."""
        pass

    @property
    @abstractmethod
    def content_type(self) -> str:
        """Return the MIME type for this export format."""
        pass

    @property
    @abstractmethod
    def file_extension(self) -> str:
        """Return the file extension for this export format."""
        pass

    def get_column_labels(self) -> List[str]:
        """Get column labels for header row."""
        return [col.get("label", col.get("name", "")) for col in self.columns]

    def get_column_names(self) -> List[str]:
        """Get column names (keys in data)."""
        return [col.get("name", "") for col in self.columns]

    def format_value(self, value: Any, column_type: str) -> str:
        """Format a value for display."""
        if value is None:
            return ""
        if column_type == "decimal":
            return f"{float(value):.2f}"
        if column_type == "integer":
            return str(int(value))
        if column_type == "boolean":
            return "Yes" if value else "No"
        return str(value)
