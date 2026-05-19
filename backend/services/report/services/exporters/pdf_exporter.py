"""
MindFlow Report Service - PDF Exporter
Export reports to PDF format using reportlab.
"""

from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .base import BaseExporter


class PDFExporter(BaseExporter):
    """Export report data to PDF format."""

    @property
    def content_type(self) -> str:
        return "application/pdf"

    @property
    def file_extension(self) -> str:
        return "pdf"

    def export(self) -> BytesIO:
        """Export data to PDF format."""
        byte_buffer = BytesIO()

        # Determine page orientation based on number of columns
        page_size = landscape(A4) if len(self.columns) > 5 else A4

        doc = SimpleDocTemplate(
            byte_buffer,
            pagesize=page_size,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch,
        )

        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            "Title",
            parent=styles["Heading1"],
            fontSize=16,
            spaceAfter=12,
            alignment=1,  # Center
        )
        elements.append(Paragraph(self.report_name, title_style))

        # Generated date
        date_style = ParagraphStyle(
            "Date",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.gray,
            spaceAfter=20,
            alignment=1,  # Center
        )
        elements.append(Paragraph(
            f"Generated: {self.generated_at.strftime('%Y-%m-%d %H:%M:%S')}",
            date_style
        ))

        # Build table data
        header_labels = self.get_column_labels()
        column_names = self.get_column_names()

        table_data = [header_labels]

        for row in self.data:
            row_values = []
            for i, col_name in enumerate(column_names):
                value = row.get(col_name, "")
                col_type = self.columns[i].get("type", "string") if i < len(self.columns) else "string"
                formatted = self.format_value(value, col_type)
                # Truncate long values for PDF
                if len(str(formatted)) > 40:
                    formatted = str(formatted)[:37] + "..."
                row_values.append(formatted)
            table_data.append(row_values)

        if not table_data or len(table_data) <= 1:
            # No data
            elements.append(Paragraph("No data available for this report.", styles["Normal"]))
        else:
            # Calculate column widths
            available_width = page_size[0] - inch  # Account for margins
            num_columns = len(self.columns)
            col_width = available_width / num_columns if num_columns > 0 else available_width

            # Create table
            table = Table(table_data, colWidths=[col_width] * num_columns)

            # Style the table
            table_style = TableStyle([
                # Header styling
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F81BD")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 8),

                # Data styling
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("ALIGN", (0, 1), (-1, -1), "LEFT"),
                ("VALIGN", (0, 1), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
                ("TOPPADDING", (0, 1), (-1, -1), 6),

                # Grid
                ("GRID", (0, 0), (-1, -1), 0.5, colors.gray),

                # Alternating row colors
                *[
                    ("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F2F2F2"))
                    for i in range(2, len(table_data), 2)
                ],
            ])

            # Right-align numeric columns
            for i, col in enumerate(self.columns):
                if col.get("type") in ("integer", "decimal"):
                    table_style.add("ALIGN", (i, 1), (i, -1), "RIGHT")

            table.setStyle(table_style)
            elements.append(table)

        # Add row count footer
        elements.append(Spacer(1, 20))
        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.gray,
        )
        elements.append(Paragraph(f"Total rows: {len(self.data)}", footer_style))

        # Build PDF
        doc.build(elements)
        byte_buffer.seek(0)

        return byte_buffer
