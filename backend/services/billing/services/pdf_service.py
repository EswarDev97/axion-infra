"""
MindFlow Billing Service - PDF Generation
Professional PDF output for Quotes and Invoices matching Axion template.
Uses 'Rs.' for INR instead of Unicode ₹ to avoid font issues in ReportLab.
"""

from datetime import datetime
from decimal import Decimal
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, HRFlowable,
)

from ..models import Quote, Invoice

# Use text-safe currency symbols (ReportLab default fonts lack ₹)
CURRENCY_SYMBOLS = {
    "INR": "Rs.",
    "USD": "$",
}

# Company details (from) — configurable per tenant in future
COMPANY_NAME = "Axion Technical Services PVT LTD"
COMPANY_ADDRESS = "Tamil Nadu, India"
COMPANY_GSTIN = "GSTIN 33AAOCA3717H1ZR"
COMPANY_EMAIL = "eswar.nagaraja@axionpcs.in"


def _currency_fmt(amount, currency: str) -> str:
    """Format amount with safe currency symbol."""
    sym = CURRENCY_SYMBOLS.get(currency, currency)
    try:
        val = float(amount) if amount is not None else 0.0
    except (TypeError, ValueError):
        val = 0.0
    return f"{sym} {val:,.2f}"


def _number_to_words(amount: float, currency: str) -> str:
    """Convert amount to words for Indian/US currency."""
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
            "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
            "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty",
            "Sixty", "Seventy", "Eighty", "Ninety"]

    def _two_digits(n: int) -> str:
        if n < 20:
            return ones[n]
        return (tens[n // 10] + (" " + ones[n % 10] if n % 10 else "")).strip()

    def _three_digits(n: int) -> str:
        if n >= 100:
            return ones[n // 100] + " Hundred" + (" and " + _two_digits(n % 100) if n % 100 else "")
        return _two_digits(n)

    def _int_to_words(n: int) -> str:
        if n == 0:
            return "Zero"
        parts = []
        if n >= 10_000_000:
            parts.append(_two_digits(n // 10_000_000) + " Crore")
            n %= 10_000_000
        if n >= 100_000:
            parts.append(_two_digits(n // 100_000) + " Lakh")
            n %= 100_000
        if n >= 1_000:
            parts.append(_two_digits(n // 1_000) + " Thousand")
            n %= 1_000
        if n > 0:
            parts.append(_three_digits(n))
        return " ".join(parts)

    whole = int(amount)
    frac = round((amount - whole) * 100)

    major = "Rupees" if currency == "INR" else "United States Dollar"
    minor = "Paise" if currency == "INR" else "Cents"

    result = f"{major} {_int_to_words(whole)}"
    if frac > 0:
        result += f" and {_int_to_words(frac)} {minor}"
    return result


class BillingPDFService:
    """Generate professional PDF documents for quotes and invoices."""

    def generate_quote_pdf(self, quote: Quote) -> BytesIO:
        return self._generate_pdf(
            doc_type="QUOTE",
            doc_number=quote.quote_number,
            title=quote.title,
            description=quote.description,
            currency=quote.currency,
            items=quote.items,
            subtotal=quote.subtotal,
            tax_percentage=quote.tax_percentage,
            tax_amount=quote.tax_amount,
            total_amount=quote.total_amount,
            bill_to_name=quote.bill_to_name,
            bill_to_address=quote.bill_to_address,
            bill_to_email=quote.bill_to_email,
            bill_to_phone=quote.bill_to_phone,
            notes=quote.notes,
            terms=quote.terms,
            date_label="Valid Until",
            date_value=str(quote.valid_until) if quote.valid_until else None,
            issued_date=quote.issued_at or quote.created_at,
        )

    def generate_invoice_pdf(self, invoice: Invoice, quote_number: str = None) -> BytesIO:
        return self._generate_pdf(
            doc_type="INVOICE",
            doc_number=invoice.invoice_number,
            title=invoice.title,
            description=invoice.description,
            currency=invoice.currency,
            items=invoice.items,
            ref_quote_number=quote_number,
            ref_quote_date=str(invoice.quote_date) if invoice.quote_date else None,
            ref_po_number=invoice.po_number,
            ref_po_date=str(invoice.po_date) if invoice.po_date else None,
            subtotal=invoice.subtotal,
            tax_percentage=invoice.tax_percentage,
            tax_amount=invoice.tax_amount,
            total_amount=invoice.total_amount,
            bill_to_name=invoice.bill_to_name,
            bill_to_address=invoice.bill_to_address,
            bill_to_email=invoice.bill_to_email,
            bill_to_phone=invoice.bill_to_phone,
            notes=invoice.notes,
            terms=invoice.terms,
            date_label="Due Date",
            date_value=str(invoice.due_date) if invoice.due_date else None,
            issued_date=invoice.issued_at or invoice.created_at,
        )

    def _generate_pdf(
        self,
        doc_type: str,
        doc_number: str,
        title: str,
        description: Optional[str],
        currency: str,
        items: list,
        subtotal,
        tax_percentage,
        tax_amount,
        total_amount,
        bill_to_name: Optional[str],
        bill_to_address: Optional[str],
        bill_to_email: Optional[str],
        bill_to_phone: Optional[str],
        notes: Optional[str],
        terms: Optional[str],
        date_label: str,
        date_value: Optional[str],
        issued_date=None,
        ref_quote_number: Optional[str] = None,
        ref_quote_date: Optional[str] = None,
        ref_po_number: Optional[str] = None,
        ref_po_date: Optional[str] = None,
    ) -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=30,
        )

        elements = []
        styles = getSampleStyleSheet()
        w = A4[0] - 60  # usable width

        # ── STYLES ──
        company_name_style = ParagraphStyle("CompanyName", parent=styles["Normal"],
                                            fontSize=14, fontName="Helvetica-Bold", spaceAfter=2)
        company_detail_style = ParagraphStyle("CompanyDetail", parent=styles["Normal"],
                                              fontSize=8, textColor=colors.HexColor("#333333"), leading=11)
        doc_type_style = ParagraphStyle("DocType", parent=styles["Heading1"],
                                        fontSize=22, fontName="Helvetica-Bold", alignment=2, spaceAfter=0)
        section_header_style = ParagraphStyle("SectionHeader", parent=styles["Normal"],
                                              fontSize=9, fontName="Helvetica-Bold",
                                              textColor=colors.white, leading=12)
        normal_style = ParagraphStyle("NormalCell", parent=styles["Normal"],
                                      fontSize=9, leading=11)
        bold_style = ParagraphStyle("BoldCell", parent=styles["Normal"],
                                    fontSize=9, fontName="Helvetica-Bold", leading=11)
        small_style = ParagraphStyle("SmallCell", parent=styles["Normal"],
                                     fontSize=8, textColor=colors.HexColor("#555555"), leading=10)

        # ══════════════════════════════════════════════════════════════
        # HEADER: Company info (left) + Doc type (right)
        # ══════════════════════════════════════════════════════════════
        company_info = f"""<b>{COMPANY_NAME}</b><br/>
{COMPANY_ADDRESS}<br/>
{COMPANY_GSTIN}<br/>
{COMPANY_EMAIL}"""

        header_table = Table(
            [[Paragraph(company_info, company_detail_style),
              Paragraph(doc_type, doc_type_style)]],
            colWidths=[w * 0.6, w * 0.4],
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(header_table)

        # ── Doc number + date row ──
        date_str = ""
        if issued_date:
            if hasattr(issued_date, 'strftime'):
                date_str = issued_date.strftime("%d/%m/%Y")
            else:
                date_str = str(issued_date)[:10]

        ref_data = [
            [Paragraph("<b>#</b>", normal_style),
             Paragraph(f": {doc_number}", normal_style),
             Paragraph("<b>Date</b>", normal_style) if date_str else "",
             Paragraph(f": {date_str}", normal_style) if date_str else ""],
        ]
        # Quote reference (for invoices converted from quotes)
        if ref_quote_number or ref_quote_date:
            ref_data.append([
                Paragraph("<b>Quote #</b>", normal_style),
                Paragraph(f": {ref_quote_number or '—'}", normal_style),
                Paragraph("<b>Quote Date</b>", normal_style),
                Paragraph(f": {ref_quote_date or '—'}", normal_style),
            ])
        # PO reference
        if ref_po_number or ref_po_date:
            ref_data.append([
                Paragraph("<b>PO #</b>", normal_style),
                Paragraph(f": {ref_po_number or '—'}", normal_style),
                Paragraph("<b>PO Date</b>", normal_style),
                Paragraph(f": {ref_po_date or '—'}", normal_style),
            ])
        if date_value:
            ref_data.append([
                Paragraph(f"<b>{date_label}</b>", normal_style),
                Paragraph(f": {date_value}", normal_style), "", "",
            ])

        ref_table = Table(ref_data, colWidths=[w * 0.12, w * 0.38, w * 0.13, w * 0.37])
        ref_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(ref_table)
        elements.append(Spacer(1, 6))

        # ══════════════════════════════════════════════════════════════
        # BILL TO
        # ══════════════════════════════════════════════════════════════
        bill_to_header = Table(
            [[Paragraph("<b>Bill To</b>", section_header_style)]],
            colWidths=[w],
        )
        bill_to_header.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#2c3e50")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(bill_to_header)

        bill_lines = []
        if bill_to_name:
            bill_lines.append(f"<b>{bill_to_name}</b>")
        if bill_to_address:
            bill_lines.append(bill_to_address)
        if bill_to_email:
            bill_lines.append(bill_to_email)
        if bill_to_phone:
            bill_lines.append(bill_to_phone)

        if not bill_lines:
            bill_lines.append("—")

        bill_to_content = Table(
            [[Paragraph("<br/>".join(bill_lines), normal_style)]],
            colWidths=[w],
        )
        bill_to_content.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(bill_to_content)
        elements.append(Spacer(1, 10))

        # ══════════════════════════════════════════════════════════════
        # ITEMS TABLE
        # ══════════════════════════════════════════════════════════════
        col_widths_items = [w * 0.06, w * 0.44, w * 0.12, w * 0.12, w * 0.13, w * 0.13]
        table_data = [[
            Paragraph("<b>#</b>", section_header_style),
            Paragraph("<b>Item &amp; Description</b>", section_header_style),
            Paragraph("<b>HSN/SAC</b>", section_header_style),
            Paragraph("<b>Qty</b>", section_header_style),
            Paragraph("<b>Rate</b>", section_header_style),
            Paragraph("<b>Amount</b>", section_header_style),
        ]]

        sorted_items = sorted(items, key=lambda x: x.sort_order)
        for idx, item in enumerate(sorted_items, 1):
            item_name = getattr(item, 'item_name', None) or item.description or ""
            item_desc = item.description if item.description and item.description != item_name else ""

            cell_content = f"<b>{item_name}</b>"
            if item_desc:
                cell_content += f"<br/><font size=7 color='#666666'>{item_desc}</font>"

            hsn = f"{idx:06d}"

            table_data.append([
                Paragraph(str(idx), normal_style),
                Paragraph(cell_content, normal_style),
                Paragraph(hsn, normal_style),
                Paragraph(f"{float(item.quantity):,.2f}", normal_style),
                Paragraph(f"{float(item.rate):,.2f}", normal_style),
                Paragraph(f"{float(item.amount):,.2f}", normal_style),
            ])

        items_table = Table(table_data, colWidths=col_widths_items)
        items_table.setStyle(TableStyle([
            # Header
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            # Body
            ("TOPPADDING", (0, 1), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            # Grid
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            # Alignment
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            # Alternate row colors
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 6))

        # ══════════════════════════════════════════════════════════════
        # TOTALS + TOTAL IN WORDS + NOTES (bottom section)
        # ══════════════════════════════════════════════════════════════
        sym = CURRENCY_SYMBOLS.get(currency, currency)
        total_f = float(total_amount) if total_amount else 0.0
        words = _number_to_words(total_f, currency)

        # Left: total in words + bank details + notes | Right: subtotal / tax / total
        left_content = f"<b>Total In Words</b><br/><i>{words}</i>"

        # Bank details
        left_content += """<br/><br/>
<b>Company's Bank Details</b><br/>
A/c Holder's Name : <b>Axion Technical Services Pvt Ltd</b><br/>
Bank Name : <b>State Bank of India</b><br/>
A/c No. : <b>37286008771</b><br/>
Branch &amp; IFS Code : <b>Ayapakkam &amp; SBIN0016403</b><br/>
SWIFT Code : <b>SBININBB292</b>"""

        if notes:
            left_content += f"<br/><br/><b>Notes</b><br/>{notes}"
        if terms:
            left_content += f"<br/><br/><b>Terms</b><br/>{terms}"

        subtotal_f = float(subtotal) if subtotal else 0.0
        tax_f = float(tax_amount) if tax_amount else 0.0
        tax_pct_f = float(tax_percentage) if tax_percentage else 0.0

        right_data = [
            [Paragraph("<b>Sub Total</b>", normal_style),
             Paragraph(f"<b>{subtotal_f:,.2f}</b>", ParagraphStyle("R", parent=normal_style, alignment=2))],
        ]
        if tax_pct_f > 0:
            right_data.append([
                Paragraph(f"Tax ({tax_pct_f:.2f}%)", normal_style),
                Paragraph(f"{tax_f:,.2f}", ParagraphStyle("R", parent=normal_style, alignment=2)),
            ])
        right_data.append([
            Paragraph("<b>Total</b>", bold_style),
            Paragraph(f"<b>{sym} {total_f:,.2f}</b>", ParagraphStyle("R", parent=bold_style, alignment=2)),
        ])

        right_table = Table(right_data, colWidths=[w * 0.17, w * 0.16])
        right_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#fff3cd")),
        ]))

        bottom_table = Table(
            [[Paragraph(left_content, small_style), right_table]],
            colWidths=[w * 0.67, w * 0.33],
        )
        bottom_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (0, 0), 0.5, colors.HexColor("#999999")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (0, 0), 6),
        ]))
        elements.append(bottom_table)
        elements.append(Spacer(1, 30))

        # ── Authorized Signature ──
        sig_center = ParagraphStyle("SigCenter", parent=normal_style, alignment=1)
        sig_table = Table(
            [
                ["", Paragraph("<b>for Axion Technical Services Pvt Ltd</b>", sig_center)],
                ["", Spacer(1, 30)],
                ["", Paragraph("<b>Authorized Signature</b>", sig_center)],
            ],
            colWidths=[w * 0.6, w * 0.4],
        )
        sig_table.setStyle(TableStyle([
            ("LINEABOVE", (1, 2), (1, 2), 0.5, colors.HexColor("#333333")),
            ("TOPPADDING", (1, 2), (1, 2), 4),
        ]))
        elements.append(sig_table)

        doc.build(elements)
        buffer.seek(0)
        return buffer
