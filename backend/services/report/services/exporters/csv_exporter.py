"""
MindFlow Report Service - CSV Exporter
Export reports to CSV format.
"""

import csv
from io import BytesIO, StringIO
from typing import Any, Dict, List

from .base import BaseExporter


class CSVExporter(BaseExporter):
    """Export report data to CSV format."""

    @property
    def content_type(self) -> str:
        return "text/csv"

    @property
    def file_extension(self) -> str:
        return "csv"

    def export(self) -> BytesIO:
        """Export data to CSV format."""
        string_buffer = StringIO()
        writer = csv.writer(string_buffer)

        # Write header row
        writer.writerow(self.get_column_labels())

        # Write data rows
        column_names = self.get_column_names()
        for row in self.data:
            row_values = []
            for i, col_name in enumerate(column_names):
                value = row.get(col_name, "")
                col_type = self.columns[i].get("type", "string") if i < len(self.columns) else "string"
                row_values.append(self.format_value(value, col_type))
            writer.writerow(row_values)

        # Convert to bytes
        byte_buffer = BytesIO()
        byte_buffer.write(string_buffer.getvalue().encode("utf-8-sig"))  # BOM for Excel compatibility
        byte_buffer.seek(0)

        return byte_buffer
