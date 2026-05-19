"""
MindFlow Training Service - Certificate API Routes
Per API_CONTRACT.md Section 8.5.6
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id, get_employee_id
from shared.schemas import APIResponse, PaginationParams

from ..schemas.certificate import (
    CertificateIssueRequest,
    CertificateResponse,
    CertificateListResponse,
)
from ..services.certificate_service import CertificateService

router = APIRouter(prefix="/certificates", tags=["certificates"])


def _certificate_to_response(certificate) -> CertificateResponse:
    """Convert Certificate model to response schema."""
    course_info = None
    if certificate.course:
        course_info = {
            "id": certificate.course.id,
            "title": certificate.course.title,
            "code": certificate.course.code
        }

    return CertificateResponse(
        id=certificate.id,
        certificate_number=certificate.certificate_number,
        enrollment_id=certificate.enrollment_id,
        employee_id=certificate.employee_id,
        employee=None,  # Would need employee lookup
        course_id=certificate.course_id,
        course=course_info,
        issued_at=certificate.issued_at,
        valid_until=certificate.valid_until,
        is_valid=certificate.is_valid,
        is_expired=certificate.is_expired,
        pdf_file_id=certificate.pdf_file_id,
        tenant_id=certificate.tenant_id,
        created_at=certificate.created_at
    )


@router.get("", response_model=APIResponse[CertificateListResponse])
async def list_certificates(
    employee_id: Optional[UUID] = Query(None, alias="employeeId"),
    course_id: Optional[UUID] = Query(None, alias="courseId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """List certificates with pagination."""
    service = CertificateService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="issued_at",
        sort_order="desc"
    )

    certificates, total = await service.list_certificates(
        tenant_id=tenant_id,
        pagination=pagination,
        employee_id=employee_id,
        course_id=course_id
    )

    return APIResponse(
        success=True,
        data=CertificateListResponse(
            items=[_certificate_to_response(c) for c in certificates],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        ),
        message="Certificates retrieved successfully"
    )


@router.post("/issue", response_model=APIResponse[CertificateResponse], status_code=201)
async def issue_certificate(
    request: CertificateIssueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Issue a certificate for completed enrollment."""
    service = CertificateService(db)
    certificate = await service.issue_certificate(
        enrollment_id=request.enrollment_id,
        tenant_id=tenant_id,
        issued_by=current_user["id"],
        valid_until=request.valid_until
    )

    return APIResponse(
        success=True,
        data=_certificate_to_response(certificate),
        message="Certificate issued successfully"
    )


@router.get("/my-certificates", response_model=APIResponse[CertificateListResponse])
async def get_my_certificates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id)
):
    """Get my certificates."""
    service = CertificateService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="issued_at",
        sort_order="desc"
    )

    certificates, total = await service.get_my_certificates(employee_id, tenant_id, pagination)

    return APIResponse(
        success=True,
        data=CertificateListResponse(
            items=[_certificate_to_response(c) for c in certificates],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        ),
        message="My certificates retrieved successfully"
    )


@router.get("/{certificate_id}", response_model=APIResponse[CertificateResponse])
async def get_certificate(
    certificate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get certificate by ID."""
    service = CertificateService(db)
    certificate = await service.get_certificate(certificate_id, tenant_id)

    return APIResponse(
        success=True,
        data=_certificate_to_response(certificate),
        message="Certificate retrieved successfully"
    )


@router.get("/{certificate_id}/download", response_model=APIResponse[CertificateResponse])
async def download_certificate(
    certificate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Download certificate (returns file info)."""
    service = CertificateService(db)
    certificate = await service.download_certificate(certificate_id, tenant_id)

    return APIResponse(
        success=True,
        data=_certificate_to_response(certificate),
        message="Certificate ready for download"
    )


@router.get("/verify/{certificate_number}", response_model=APIResponse[CertificateResponse])
async def verify_certificate(
    certificate_number: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Verify certificate by number."""
    service = CertificateService(db)
    certificate = await service.verify_certificate(certificate_number, tenant_id)

    if not certificate:
        return APIResponse(
            success=False,
            data=None,
            message="Certificate not found"
        )

    return APIResponse(
        success=True,
        data=_certificate_to_response(certificate),
        message="Certificate verified"
    )
