"""
MindFlow Expense Service - Report Business Logic
Per API_CONTRACT.md Section 8.6.6
"""

from datetime import date
from decimal import Decimal
from typing import Dict, List
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import (
    ExpenseCategory,
    ExpenseRequest,
    ExpenseItem,
)


class ReportService:
    """Expense reporting service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(
        self,
        tenant_id: UUID,
        start_date: date,
        end_date: date
    ) -> Dict:
        """Get expense summary for date range."""
        base_query = select(ExpenseRequest).where(
            ExpenseRequest.tenant_id == tenant_id,
            ExpenseRequest.is_deleted == False,
            ExpenseRequest.expense_date >= start_date,
            ExpenseRequest.expense_date <= end_date
        )

        # Get all requests in date range
        result = await self.db.execute(base_query)
        requests = list(result.scalars().all())

        total_requests = len(requests)
        total_amount = sum(r.total_amount for r in requests)

        # Calculate by status
        by_status = {}
        approved_amount = Decimal("0.00")
        pending_amount = Decimal("0.00")
        rejected_amount = Decimal("0.00")
        paid_amount = Decimal("0.00")

        for req in requests:
            status = req.status
            if status not in by_status:
                by_status[status] = {"count": 0, "amount": Decimal("0.00")}
            by_status[status]["count"] += 1
            by_status[status]["amount"] += req.total_amount

            if status in ["MANAGER_APPROVED", "FINANCE_APPROVED", "PAID"]:
                approved_amount += req.total_amount
            elif status in ["DRAFT", "SUBMITTED"]:
                pending_amount += req.total_amount
            elif status == "REJECTED":
                rejected_amount += req.total_amount

            if status == "PAID":
                paid_amount += req.total_amount

        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_requests": total_requests,
            "total_amount": total_amount,
            "approved_amount": approved_amount,
            "pending_amount": pending_amount,
            "rejected_amount": rejected_amount,
            "paid_amount": paid_amount,
            "by_status": by_status
        }

    async def get_by_category(
        self,
        tenant_id: UUID,
        start_date: date,
        end_date: date
    ) -> Dict:
        """Get expenses grouped by category."""
        # Get items in date range with their categories
        stmt = select(
            ExpenseCategory.id,
            ExpenseCategory.name,
            ExpenseCategory.code,
            func.sum(ExpenseItem.amount).label("total_amount"),
            func.count(ExpenseItem.id).label("item_count")
        ).join(
            ExpenseItem,
            ExpenseItem.category_id == ExpenseCategory.id
        ).join(
            ExpenseRequest,
            ExpenseRequest.id == ExpenseItem.expense_request_id
        ).where(
            ExpenseCategory.tenant_id == tenant_id,
            ExpenseRequest.is_deleted == False,
            ExpenseRequest.expense_date >= start_date,
            ExpenseRequest.expense_date <= end_date
        ).group_by(
            ExpenseCategory.id,
            ExpenseCategory.name,
            ExpenseCategory.code
        ).order_by(func.sum(ExpenseItem.amount).desc())

        result = await self.db.execute(stmt)
        rows = result.fetchall()

        total_amount = sum(row.total_amount or Decimal("0.00") for row in rows)

        categories = []
        for row in rows:
            amount = row.total_amount or Decimal("0.00")
            percentage = (amount / total_amount * 100) if total_amount > 0 else Decimal("0.00")
            categories.append({
                "category_id": row.id,
                "category_name": row.name,
                "category_code": row.code,
                "total_amount": amount,
                "item_count": row.item_count,
                "percentage": round(percentage, 2)
            })

        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_amount": total_amount,
            "categories": categories
        }

    async def get_by_employee(
        self,
        tenant_id: UUID,
        start_date: date,
        end_date: date
    ) -> Dict:
        """Get expenses grouped by employee."""
        # Get requests grouped by employee
        stmt = select(
            ExpenseRequest.employee_id,
            func.sum(ExpenseRequest.total_amount).label("total_amount"),
            func.count(ExpenseRequest.id).label("request_count")
        ).where(
            ExpenseRequest.tenant_id == tenant_id,
            ExpenseRequest.is_deleted == False,
            ExpenseRequest.expense_date >= start_date,
            ExpenseRequest.expense_date <= end_date
        ).group_by(
            ExpenseRequest.employee_id
        ).order_by(func.sum(ExpenseRequest.total_amount).desc())

        result = await self.db.execute(stmt)
        rows = result.fetchall()

        total_amount = sum(row.total_amount or Decimal("0.00") for row in rows)

        employees = []
        for row in rows:
            employees.append({
                "employee_id": row.employee_id,
                "employee_name": "Unknown",  # Would need employee lookup
                "employee_code": "N/A",
                "department": None,
                "total_amount": row.total_amount or Decimal("0.00"),
                "request_count": row.request_count
            })

        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_amount": total_amount,
            "employees": employees
        }
