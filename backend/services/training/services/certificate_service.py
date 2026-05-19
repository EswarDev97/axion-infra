"""
MindFlow Training Service - Certificate Business Logic
Per API_CONTRACT.md Section 8.5.6
"""

from datetime import date, datetime, timezone
from dateutil.relativedelta import relativedelta
from typing import List, Optional, Tuple
from uuid import UUID
import secrets
import string

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import Course, Enrollment, Certificate


class CertificateService:
    """Certificate management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_certificate_number(self, tenant_id: UUID) -> str:
        """Generate unique certificate number."""
        chars = string.ascii_uppercase + string.digits
        random_part = ''.join(secrets.choice(chars) for _ in range(8))
        return f"CERT-{random_part}"

    # ==================== Certificate CRUD ====================

    async def issue_certificate(
        self,
        enrollment_id: UUID,
        tenant_id: UUID,
        issued_by: UUID,
        valid_until: Optional[date] = None
    ) -> Certificate:
        """Issue a certificate for completed enrollment."""
        # Get enrollment
        stmt = select(Enrollment).where(
            Enrollment.id == enrollment_id,
            Enrollment.tenant_id == tenant_id,
            Enrollment.is_deleted == False
        ).options(selectinload(Enrollment.course))
        result = await self.db.execute(stmt)
        enrollment = result.scalar_one_or_none()

        if not enrollment:
            raise ResourceNotFoundException("Enrollment", str(enrollment_id))

        if enrollment.status != "COMPLETED":
            raise BusinessRuleViolationException(
                "Cannot issue certificate for incomplete enrollment"
            )

        # Check if certificate already issued
        stmt = select(Certificate).where(
            Certificate.enrollment_id == enrollment_id,
            Certificate.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            raise ResourceAlreadyExistsException(
                "Certificate",
                f"enrollment={enrollment_id}"
            )

        # Calculate validity if not provided
        if not valid_until and enrollment.course and enrollment.course.validity_months:
            valid_until = date.today() + relativedelta(
                months=enrollment.course.validity_months
            )

        # Generate certificate number
        certificate_number = self._generate_certificate_number(tenant_id)

        certificate = Certificate(
            tenant_id=tenant_id,
            enrollment_id=enrollment_id,
            employee_id=enrollment.employee_id,
            course_id=enrollment.course_id,
            certificate_number=certificate_number,
            valid_until=valid_until
        )
        self.db.add(certificate)
        await self.db.commit()
        await self.db.refresh(certificate)

        return certificate

    async def get_certificate(
        self,
        certificate_id: UUID,
        tenant_id: UUID
    ) -> Certificate:
        """Get certificate by ID."""
        stmt = select(Certificate).where(
            Certificate.id == certificate_id,
            Certificate.tenant_id == tenant_id
        ).options(
            selectinload(Certificate.enrollment),
            selectinload(Certificate.course)
        )
        result = await self.db.execute(stmt)
        certificate = result.scalar_one_or_none()

        if not certificate:
            raise ResourceNotFoundException("Certificate", str(certificate_id))

        return certificate

    async def list_certificates(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        employee_id: Optional[UUID] = None,
        course_id: Optional[UUID] = None
    ) -> Tuple[List[Certificate], int]:
        """List certificates with pagination."""
        base_query = select(Certificate).where(
            Certificate.tenant_id == tenant_id
        )

        if employee_id:
            base_query = base_query.where(Certificate.employee_id == employee_id)
        if course_id:
            base_query = base_query.where(Certificate.course_id == course_id)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Certificate.enrollment),
            selectinload(Certificate.course)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(Certificate.issued_at.desc())

        result = await self.db.execute(stmt)
        certificates = list(result.scalars().unique().all())

        return certificates, total

    async def get_my_certificates(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Certificate], int]:
        """Get certificates for current employee."""
        return await self.list_certificates(
            tenant_id=tenant_id,
            pagination=pagination,
            employee_id=employee_id
        )

    async def verify_certificate(
        self,
        certificate_number: str,
        tenant_id: UUID
    ) -> Optional[Certificate]:
        """Verify certificate by number."""
        stmt = select(Certificate).where(
            Certificate.certificate_number == certificate_number,
            Certificate.tenant_id == tenant_id
        ).options(
            selectinload(Certificate.enrollment),
            selectinload(Certificate.course)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def download_certificate(
        self,
        certificate_id: UUID,
        tenant_id: UUID
    ) -> Certificate:
        """Get certificate for download."""
        certificate = await self.get_certificate(certificate_id, tenant_id)

        if not certificate.pdf_file_id:
            raise BusinessRuleViolationException(
                "Certificate PDF not available"
            )

        return certificate
