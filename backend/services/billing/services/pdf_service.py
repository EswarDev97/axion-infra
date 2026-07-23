"""
MindFlow Billing Service - PDF Generation
Professional PDF output for Quotes and Invoices matching Axion template.
"""

from datetime import datetime
from decimal import Decimal
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, HRFlowable,
)

from ..models import Quote, Invoice

CURRENCY_SYMBOLS = {
    "INR": "Rs.",
    "USD": "$",
}

COMPANY_NAME    = "Axion Technical Services PVT LTD"
COMPANY_ADDRESS = "806, 48th Cross St, Valmiki Nagar, Thiruvalluvar Nagar,\nThiruvanmiyur, Chennai, Tamil Nadu 600041"
COMPANY_GSTIN   = "GSTIN 33AAOCA3717H1ZR"
COMPANY_EMAIL   = "eswar.nagaraja@axionpcs.in"


def _currency_fmt(amount, currency: str) -> str:
    sym = CURRENCY_SYMBOLS.get(currency, currency)
    try:
        val = float(amount) if amount is not None else 0.0
    except (TypeError, ValueError):
        val = 0.0
    return f"{sym} {val:,.2f}"


def _number_to_words(amount: float, currency: str) -> str:
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
            "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
            "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty",
            "Sixty", "Seventy", "Eighty", "Ninety"]

    def _two_digits(n):
        if n < 20: return ones[n]
        return (tens[n // 10] + (" " + ones[n % 10] if n % 10 else "")).strip()

    def _three_digits(n):
        if n >= 100:
            return ones[n // 100] + " Hundred" + (" and " + _two_digits(n % 100) if n % 100 else "")
        return _two_digits(n)

    def _int_to_words(n):
        if n == 0: return "Zero"
        parts = []
        if n >= 10_000_000:
            parts.append(_two_digits(n // 10_000_000) + " Crore"); n %= 10_000_000
        if n >= 100_000:
            parts.append(_two_digits(n // 100_000) + " Lakh"); n %= 100_000
        if n >= 1_000:
            parts.append(_two_digits(n // 1_000) + " Thousand"); n %= 1_000
        if n > 0:
            parts.append(_three_digits(n))
        return " ".join(parts)

    whole = int(amount)
    frac  = round((amount - whole) * 100)
    major = "Rupees" if currency == "INR" else "United States Dollar"
    minor = "Paise"  if currency == "INR" else "Cents"
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
            igst_percentage=getattr(invoice, 'igst_percentage', None),
            cgst_percentage=getattr(invoice, 'cgst_percentage', None),
            sgst_percentage=getattr(invoice, 'sgst_percentage', None),
            bill_to_name=invoice.bill_to_name,
            bill_to_address=invoice.bill_to_address,
            bill_to_email=invoice.bill_to_email,
            bill_to_phone=invoice.bill_to_phone,
            notes=invoice.notes,
            terms=invoice.terms,
            date_label="Due Date",
            date_value=str(invoice.due_date) if invoice.due_date else None,
            # Invoice "Date" = user-set bill date; fall back to issue/created date
            issued_date=invoice.bill_date or invoice.issued_at or invoice.created_at,
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
        igst_percentage=None,
        cgst_percentage=None,
        sgst_percentage=None,
    ) -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=35,
            leftMargin=35,
            topMargin=110,   # Extra top space for letterhead printing
            bottomMargin=35,
            title=f"{doc_type} {doc_number}",
            author="Axion Technical Services PVT LTD",
            subject=f"{doc_type} {doc_number} - {title or ''}",
            creator="MindFlow - Axion Technical Services PVT LTD",
        )

        elements = []
        styles = getSampleStyleSheet()
        w = A4[0] - 70   # usable width (page - left - right margins)

        # ── STYLES ──────────────────────────────────────────────────
        company_name_style = ParagraphStyle(
            "CompanyName", parent=styles["Normal"],
            fontSize=18, fontName="Helvetica-Bold",
            leading=22, spaceAfter=5,
            textColor=colors.HexColor("#1a1a1a"),
        )
        company_detail_style = ParagraphStyle(
            "CompanyDetail", parent=styles["Normal"],
            fontSize=8, fontName="Helvetica",
            textColor=colors.HexColor("#444444"),
            leading=12, spaceAfter=0,
        )
        doc_type_style = ParagraphStyle(
            "DocType", parent=styles["Heading1"],
            fontSize=26, fontName="Helvetica-Bold",
            alignment=2, spaceAfter=0,
            textColor=colors.HexColor("#1a1a1a"),
        )
        section_header_style = ParagraphStyle(
            "SectionHeader", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica-Bold",
            textColor=colors.white, leading=12,
        )
        normal_style = ParagraphStyle(
            "NormalCell", parent=styles["Normal"],
            fontSize=9, leading=11,
        )
        bold_style = ParagraphStyle(
            "BoldCell", parent=styles["Normal"],
            fontSize=9, fontName="Helvetica-Bold", leading=11,
        )
        small_style = ParagraphStyle(
            "SmallCell", parent=styles["Normal"],
            fontSize=8, textColor=colors.HexColor("#555555"), leading=10,
        )

        # ══════════════════════════════════════════════════════════════
        # HEADER — Company info (left) | INVOICE label (right)
        # Uses a nested table on the left so name and address stack
        # cleanly without any overlap.
        # ══════════════════════════════════════════════════════════════
        addr_html = COMPANY_ADDRESS.replace("\n", "<br/>")
        detail_html = (
            f"{addr_html}<br/>"
            f"{COMPANY_GSTIN}<br/>"
            f"{COMPANY_EMAIL}"
        )

        # Nested table: one column, two rows (name row + detail row)
        left_col_w = w * 0.60
        company_info_table = Table(
            [
                [Paragraph(COMPANY_NAME, company_name_style)],
                [Paragraph(detail_html,  company_detail_style)],
            ],
            colWidths=[left_col_w - 10],
        )
        company_info_table.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (0, 0),   4),   # gap between name and address
            ("BOTTOMPADDING", (0, 1), (-1, -1), 0),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))

        header_table = Table(
            [[company_info_table, Paragraph(doc_type, doc_type_style)]],
            colWidths=[left_col_w, w * 0.40],
        )
        header_table.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_table)
        elements.append(HRFlowable(width=w, thickness=1,
                                   color=colors.HexColor("#cccccc"), spaceAfter=6))

        # ── Doc number + date row ────────────────────────────────────
        date_str = ""
        if issued_date:
            if hasattr(issued_date, "strftime"):
                date_str = issued_date.strftime("%d/%m/%Y")
            else:
                date_str = str(issued_date)[:10]

        doc_num_label = "Invoice No." if doc_type == "INVOICE" else "Quote No."
        ref_data = [
            [Paragraph(f"<b>{doc_num_label}</b>", normal_style),
             Paragraph(f": {doc_number}", normal_style),
             Paragraph("<b>Date</b>", normal_style) if date_str else "",
             Paragraph(f": {date_str}", normal_style) if date_str else ""],
        ]
        if ref_quote_number or ref_quote_date:
            ref_data.append([
                Paragraph("<b>Quote #</b>", normal_style),
                Paragraph(f": {ref_quote_number or '—'}", normal_style),
                Paragraph("<b>Quote Date</b>", normal_style),
                Paragraph(f": {ref_quote_date or '—'}", normal_style),
            ])
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

        ref_table = Table(ref_data, colWidths=[w*0.12, w*0.38, w*0.13, w*0.37])
        ref_table.setStyle(TableStyle([
            ("BOX",          (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("INNERGRID",    (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            ("TOPPADDING",   (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
            ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ]))
        elements.append(ref_table)
        elements.append(Spacer(1, 8))

        # ══════════════════════════════════════════════════════════════
        # BILL TO
        # ══════════════════════════════════════════════════════════════
        bill_to_header = Table(
            [[Paragraph("<b>Bill To</b>", section_header_style)]],
            colWidths=[w],
        )
        bill_to_header.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, -1), colors.HexColor("#2c3e50")),
            ("TOPPADDING",   (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
            ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ]))
        elements.append(bill_to_header)

        bill_lines = []
        if bill_to_name:
            bill_lines.append(f"<b>{bill_to_name}</b>")
        if bill_to_address:
            bill_lines.append(bill_to_address.replace("\n", "<br/>"))
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
            ("BOX",          (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("TOPPADDING",   (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
            ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ]))
        elements.append(bill_to_content)
        elements.append(Spacer(1, 10))

        # ══════════════════════════════════════════════════════════════
        # ITEMS TABLE
        # ══════════════════════════════════════════════════════════════
        col_w = [w*0.06, w*0.44, w*0.12, w*0.10, w*0.14, w*0.14]
        table_data = [[
            Paragraph("<b>#</b>",                      section_header_style),
            Paragraph("<b>Item &amp; Description</b>", section_header_style),
            Paragraph("<b>HSN/SAC</b>",                section_header_style),
            Paragraph("<b>Qty</b>",                    section_header_style),
            Paragraph("<b>Rate</b>",                   section_header_style),
            Paragraph("<b>Amount</b>",                 section_header_style),
        ]]
        sorted_items = sorted(items, key=lambda x: x.sort_order)
        for idx, item in enumerate(sorted_items, 1):
            item_name = getattr(item, "item_name", None) or item.description or ""
            item_desc = item.description if item.description and item.description != item_name else ""
            cell = f"<b>{item_name}</b>"
            if item_desc:
                cell += f"<br/><font size=7 color='#666666'>{item_desc}</font>"
            table_data.append([
                Paragraph(str(idx), normal_style),
                Paragraph(cell, normal_style),
                Paragraph(f"{idx:06d}", normal_style),
                Paragraph(f"{float(item.quantity):,.2f}", normal_style),
                Paragraph(f"{float(item.rate):,.2f}", normal_style),
                Paragraph(f"{float(item.amount):,.2f}", normal_style),
            ])

        items_table = Table(table_data, colWidths=col_w)
        items_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0),  colors.HexColor("#2c3e50")),
            ("TEXTCOLOR",    (0, 0), (-1, 0),  colors.white),
            ("TOPPADDING",   (0, 0), (-1, 0),  6),
            ("BOTTOMPADDING",(0, 0), (-1, 0),  6),
            ("TOPPADDING",   (0, 1), (-1, -1), 5),
            ("BOTTOMPADDING",(0, 1), (-1, -1), 5),
            ("LEFTPADDING",  (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("BOX",          (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("INNERGRID",    (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            ("ALIGN",        (0, 0), (0, -1),  "CENTER"),
            ("ALIGN",        (2, 0), (-1, -1), "RIGHT"),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1),
             [colors.white, colors.HexColor("#f8f9fa")]),
            ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 8))

        # ══════════════════════════════════════════════════════════════
        # TOTALS + WORDS + BANK
        # ══════════════════════════════════════════════════════════════
        sym       = CURRENCY_SYMBOLS.get(currency, currency)
        total_f   = float(total_amount)   if total_amount   else 0.0
        subtotal_f= float(subtotal)       if subtotal       else 0.0
        tax_f     = float(tax_amount)     if tax_amount     else 0.0
        tax_pct_f = float(tax_percentage) if tax_percentage else 0.0
        igst_f    = float(igst_percentage) if igst_percentage else 0.0
        cgst_f    = float(cgst_percentage) if cgst_percentage else 0.0
        sgst_f    = float(sgst_percentage) if sgst_percentage else 0.0
        igst_amt  = subtotal_f * igst_f / 100
        cgst_amt  = subtotal_f * cgst_f / 100
        sgst_amt  = subtotal_f * sgst_f / 100
        words     = _number_to_words(total_f, currency)

        left_txt = f"<b>Total In Words</b><br/><i>{words}</i>"
        left_txt += (
            "<br/><br/>"
            "<b>Company\'s Bank Details</b><br/>"
            "A/c Holder\'s Name : <b>Axion Technical Services Pvt Ltd</b><br/>"
            "Bank Name : <b>State Bank of India</b><br/>"
            "A/c No. : <b>37286008771</b><br/>"
            "Branch &amp; IFS Code : <b>Ayapakkam &amp; SBIN0016403</b><br/>"
            "SWIFT Code : <b>SBININBB292</b>"
        )
        if notes: left_txt += f"<br/><br/><b>Notes</b><br/>{notes}"
        if terms: left_txt += f"<br/><br/><b>Terms</b><br/>{terms}"

        r_style = ParagraphStyle("R",  parent=normal_style, alignment=2)
        r_bold  = ParagraphStyle("RB", parent=bold_style,   alignment=2)

        right_data = [
            [Paragraph("<b>Sub Total</b>", normal_style),
             Paragraph(f"<b>{subtotal_f:,.2f}</b>", r_style)],
        ]
        if igst_f > 0:
            right_data.append([
                Paragraph(f"IGST ({igst_f:.2f}%)", normal_style),
                Paragraph(f"{igst_amt:,.2f}", r_style),
            ])
        if cgst_f > 0:
            right_data.append([
                Paragraph(f"CGST ({cgst_f:.2f}%)", normal_style),
                Paragraph(f"{cgst_amt:,.2f}", r_style),
            ])
        if sgst_f > 0:
            right_data.append([
                Paragraph(f"SGST ({sgst_f:.2f}%)", normal_style),
                Paragraph(f"{sgst_amt:,.2f}", r_style),
            ])
        if igst_f == 0 and cgst_f == 0 and sgst_f == 0 and tax_pct_f > 0:
            right_data.append([
                Paragraph(f"Tax ({tax_pct_f:.2f}%)", normal_style),
                Paragraph(f"{tax_f:,.2f}", r_style),
            ])
        right_data.append([
            Paragraph("<b>Total</b>", bold_style),
            Paragraph(f"<b>{sym} {total_f:,.2f}</b>", r_bold),
        ])

        right_table = Table(right_data, colWidths=[w*0.17, w*0.16])
        right_table.setStyle(TableStyle([
            ("BOX",          (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("INNERGRID",    (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
            ("LEFTPADDING",  (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("BACKGROUND",   (0, -1), (-1, -1), colors.HexColor("#fff3cd")),
        ]))

        bottom_table = Table(
            [[Paragraph(left_txt, small_style), right_table]],
            colWidths=[w*0.67, w*0.33],
        )
        bottom_table.setStyle(TableStyle([
            ("VALIGN",       (0, 0), (-1, -1), "TOP"),
            ("BOX",          (0, 0), (0, 0),   0.5, colors.HexColor("#999999")),
            ("TOPPADDING",   (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
            ("LEFTPADDING",  (0, 0), (0, 0),   7),
        ]))
        elements.append(bottom_table)
        elements.append(Spacer(1, 20))

        # ── Computer-generated notice ────────────────────────────────
        cg_style = ParagraphStyle(
            "CGNotice", parent=normal_style,
            alignment=1,
            fontSize=8,
            textColor=colors.HexColor("#777777"),
            fontName="Helvetica-Oblique",
        )
        elements.append(HRFlowable(width=w, thickness=0.5,
                                   color=colors.HexColor("#cccccc"), spaceAfter=6))
        elements.append(Paragraph("This is a Computer Generated Invoice", cg_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer
