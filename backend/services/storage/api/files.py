"""
MindFlow Storage Service - File Endpoints
Per API_CONTRACT.md Section 8.10

Endpoints:
- POST /files - Upload file
- GET /files - List files
- GET /files/{file_id} - Get file metadata
- GET /files/{file_id}/download - Get download URL
- DELETE /files/{file_id} - Delete file
"""

from typing import Annotated, Optional
from urllib.parse import quote
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, Header, Query, Response, UploadFile

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_current_user,
    get_pagination_params,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas import (
    FileListResponse,
    FileMetadataResponse,
    FileUploadResponse,
    PresignedUrlResponse,
)
from ..services import StorageService

router = APIRouter(prefix="/files", tags=["files"])


def _file_to_response(file_metadata, download_url: str = None) -> FileUploadResponse:
    """Convert FileMetadata to response schema."""
    return FileUploadResponse(
        id=file_metadata.id,
        originalFilename=file_metadata.original_filename,
        contentType=file_metadata.content_type,
        fileSize=file_metadata.file_size,
        module=file_metadata.module,
        entityType=file_metadata.entity_type,
        entityId=file_metadata.entity_id,
        createdAt=file_metadata.created_at,
        downloadUrl=download_url or ""
    )


def _file_to_metadata_response(file_metadata) -> FileMetadataResponse:
    """Convert FileMetadata to metadata response schema."""
    return FileMetadataResponse(
        id=file_metadata.id,
        originalFilename=file_metadata.original_filename,
        contentType=file_metadata.content_type,
        fileSize=file_metadata.file_size,
        module=file_metadata.module,
        entityType=file_metadata.entity_type,
        entityId=file_metadata.entity_id,
        description=file_metadata.description,
        createdAt=file_metadata.created_at,
        createdBy=file_metadata.created_by
    )


@router.post("", response_model=ApiResponse[FileUploadResponse], status_code=201)
async def upload_file(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    file: UploadFile = File(...),
    module: str = Form(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Upload a file.

    - Max file size: 10MB
    - Allowed types: Images (jpg, png, gif, webp), Documents (pdf, doc, docx, xls, xlsx, ppt, pptx), Archives (zip)
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    # Read file content
    file_content = await file.read()

    # Parse entity_id if provided
    parsed_entity_id = UUID(entity_id) if entity_id else None

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        storage_service = StorageService(db)
        file_metadata = await storage_service.upload_file(
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            file_content=file_content,
            filename=file.filename or "unnamed",
            content_type=file.content_type or "application/octet-stream",
            module=module,
            entity_type=entity_type,
            entity_id=parsed_entity_id,
            description=description
        )

        # Generate download URL
        download_url = storage_service.generate_download_url(file_metadata)

        return ApiResponse(
            success=True,
            data=_file_to_response(file_metadata, download_url),
            message="File uploaded successfully",
            requestId=request_id
        )


@router.get("", response_model=ApiResponse[FileListResponse])
async def list_files(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    module: Annotated[Optional[str], Query()] = None,
    entity_type: Annotated[Optional[str], Query(alias="entity_type")] = None,
    entity_id: Annotated[Optional[UUID], Query(alias="entity_id")] = None,
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    List files with optional filters.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        storage_service = StorageService(db)
        files, total = await storage_service.list_files(
            tenant_id=user.tenant_id,
            pagination=pagination,
            module=module,
            entity_type=entity_type,
            entity_id=entity_id
        )

        items = [_file_to_metadata_response(f) for f in files]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = FileListResponse(
            items=items,
            pagination=PaginationMeta(
                page=pagination.page,
                pageSize=pagination.page_size,
                totalItems=total,
                totalPages=total_pages,
                hasNext=pagination.page < total_pages,
                hasPrevious=pagination.page > 1
            )
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Files retrieved successfully",
            requestId=request_id
        )


@router.get("/{file_id}", response_model=ApiResponse[FileMetadataResponse])
async def get_file(
    file_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Get file metadata by ID.
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        storage_service = StorageService(db)
        file_metadata = await storage_service.get_file(file_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_file_to_metadata_response(file_metadata),
            message="File metadata retrieved successfully",
            requestId=request_id
        )


@router.get("/{file_id}/download", response_model=ApiResponse[PresignedUrlResponse])
async def get_download_url(
    file_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    expires: Annotated[int, Query(ge=60, le=86400)] = 3600,
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Get presigned download URL.

    - Default expiration: 1 hour (3600 seconds)
    - Max expiration: 24 hours (86400 seconds)
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        storage_service = StorageService(db)
        file_metadata = await storage_service.get_file(file_id, user.tenant_id)
        download_url = storage_service.generate_download_url(file_metadata, expires)

        return ApiResponse(
            success=True,
            data=PresignedUrlResponse(
                url=download_url,
                expiresIn=expires,
                method="GET"
            ),
            message="Download URL generated successfully",
            requestId=request_id
        )


@router.get("/{file_id}/content")
async def get_file_content(
    file_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Stream the raw file content through the (authenticated) API.

    Unlike the presigned-URL endpoint, this proxies the bytes via the gateway,
    so it works in the browser even when MinIO is only reachable internally.
    Used for viewing/downloading expense receipts and other attachments.
    """
    async with db_manager.session(tenant_id=user.tenant_id) as db:
        storage_service = StorageService(db)
        file_metadata = await storage_service.get_file(file_id, user.tenant_id)
        content = storage_service.get_file_content(file_metadata)

        filename = quote(file_metadata.original_filename or "document")
        return Response(
            content=content,
            media_type=file_metadata.content_type or "application/octet-stream",
            headers={
                "Content-Disposition": f"inline; filename*=UTF-8''{filename}",
                "Cache-Control": "private, max-age=0, no-cache",
            },
        )


@router.delete("/{file_id}", response_model=ApiResponse[None])
async def delete_file(
    file_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Delete a file (soft delete).
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        storage_service = StorageService(db)
        await storage_service.delete_file(
            file_id=file_id,
            tenant_id=user.tenant_id,
            user_id=user.user_id
        )

        return ApiResponse(
            success=True,
            message="File deleted successfully",
            requestId=request_id
        )
