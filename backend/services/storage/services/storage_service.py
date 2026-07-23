"""
MindFlow Storage Service - Storage Business Logic
Per API_CONTRACT.md Section 8.10 and TECH_STACK.md

Implements:
- File upload to MinIO
- Presigned URL generation
- File metadata management
"""

import hashlib
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import List, Optional, Tuple
from uuid import UUID, uuid4

from minio import Minio
from minio.error import S3Error
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import get_settings
from shared.exceptions import (
    ResourceNotFoundException,
    ValidationException,
)
from shared.schemas import PaginationParams

from ..models import FileMetadata


# Allowed file types per API_CONTRACT.md Section 6.3
ALLOWED_CONTENT_TYPES = {
    # Images
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    # Documents
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    # Archives
    "application/zip": [".zip"],
}

# Max file size: 10MB per API_CONTRACT.md Section 6.3
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class StorageService:
    """Storage service handling file operations with MinIO."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()
        self._minio_client: Optional[Minio] = None

    @property
    def minio_client(self) -> Minio:
        """Get or create MinIO client."""
        if self._minio_client is None:
            self._minio_client = Minio(
                self.settings.minio_endpoint,
                access_key=self.settings.minio_access_key,
                secret_key=self.settings.minio_secret_key,
                secure=self.settings.minio_secure
            )
        return self._minio_client

    def _ensure_bucket_exists(self, bucket_name: str) -> None:
        """Ensure the bucket exists, create if not."""
        if not self.minio_client.bucket_exists(bucket_name):
            self.minio_client.make_bucket(bucket_name)

    def _validate_file(
        self,
        filename: str,
        content_type: str,
        file_size: int
    ) -> None:
        """
        Validate file against allowed types and size limits.
        Per API_CONTRACT.md Section 6.3.

        Raises:
            ValidationException: If file validation fails
        """
        errors = []

        # Check file size
        if file_size > MAX_FILE_SIZE:
            errors.append({
                "field": "file",
                "message": f"File size exceeds maximum allowed ({MAX_FILE_SIZE // (1024*1024)}MB)",
                "code": "FILE_TOO_LARGE"
            })

        # Check content type
        if content_type not in ALLOWED_CONTENT_TYPES:
            errors.append({
                "field": "file",
                "message": f"File type '{content_type}' is not allowed",
                "code": "INVALID_FILE_TYPE"
            })

        # Check filename length
        if len(filename) > 255:
            errors.append({
                "field": "filename",
                "message": "Filename exceeds maximum length (255 characters)",
                "code": "FILENAME_TOO_LONG"
            })

        if errors:
            raise ValidationException(
                message="File validation failed",
                details=errors
            )

    def _generate_object_key(
        self,
        tenant_id: UUID,
        module: str,
        file_id: UUID,
        filename: str
    ) -> str:
        """Generate unique object key for MinIO storage."""
        # Format: {tenant_id}/{module}/{year}/{month}/{file_id}_{filename}
        now = datetime.now(timezone.utc)
        extension = filename.rsplit(".", 1)[-1] if "." in filename else ""
        safe_filename = f"{file_id}.{extension}" if extension else str(file_id)
        return f"{tenant_id}/{module}/{now.year}/{now.month:02d}/{safe_filename}"

    async def upload_file(
        self,
        tenant_id: UUID,
        user_id: UUID,
        file_content: bytes,
        filename: str,
        content_type: str,
        module: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        description: Optional[str] = None
    ) -> FileMetadata:
        """
        Upload file to MinIO and create metadata record.

        Args:
            tenant_id: Tenant ID
            user_id: User ID performing upload
            file_content: File content as bytes
            filename: Original filename
            content_type: MIME type
            module: Module name (e.g., "task", "expense")
            entity_type: Entity type (e.g., "attachment", "receipt")
            entity_id: Related entity ID
            description: Optional description

        Returns:
            FileMetadata record

        Raises:
            ValidationException: If file validation fails
        """
        file_size = len(file_content)

        # Validate file
        self._validate_file(filename, content_type, file_size)

        # Generate file ID and storage key
        file_id = uuid4()
        bucket_name = self.settings.minio_bucket_name
        object_key = self._generate_object_key(tenant_id, module, file_id, filename)

        # Calculate checksum
        checksum = hashlib.sha256(file_content).hexdigest()

        # Ensure bucket exists
        self._ensure_bucket_exists(bucket_name)

        # Upload to MinIO
        self.minio_client.put_object(
            bucket_name=bucket_name,
            object_name=object_key,
            data=BytesIO(file_content),
            length=file_size,
            content_type=content_type
        )

        # Create metadata record
        file_metadata = FileMetadata(
            id=file_id,
            tenant_id=tenant_id,
            original_filename=filename,
            stored_filename=object_key.split("/")[-1],
            content_type=content_type,
            file_size=file_size,
            bucket_name=bucket_name,
            object_key=object_key,
            module=module,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            checksum=checksum,
            created_by=user_id,
            updated_by=user_id
        )

        self.db.add(file_metadata)
        await self.db.commit()

        # Re-fetch to avoid lazy loading issues
        stmt = select(FileMetadata).where(FileMetadata.id == file_metadata.id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_file(self, file_id: UUID, tenant_id: UUID) -> FileMetadata:
        """
        Get file metadata by ID.

        Args:
            file_id: File ID
            tenant_id: Tenant ID

        Returns:
            FileMetadata record

        Raises:
            ResourceNotFoundException: If file not found
        """
        stmt = select(FileMetadata).where(
            FileMetadata.id == file_id,
            FileMetadata.tenant_id == tenant_id,
            FileMetadata.is_deleted == False
        )
        result = await self.db.execute(stmt)
        file_metadata = result.scalar_one_or_none()

        if not file_metadata:
            raise ResourceNotFoundException("File", str(file_id))

        return file_metadata

    async def list_files(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        module: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None
    ) -> Tuple[List[FileMetadata], int]:
        """
        List files with optional filters.

        Args:
            tenant_id: Tenant ID
            pagination: Pagination parameters
            module: Optional module filter
            entity_type: Optional entity type filter
            entity_id: Optional entity ID filter

        Returns:
            Tuple of (files, total_count)
        """
        # Base query
        base_query = select(FileMetadata).where(
            FileMetadata.tenant_id == tenant_id,
            FileMetadata.is_deleted == False
        )

        if module:
            base_query = base_query.where(FileMetadata.module == module)
        if entity_type:
            base_query = base_query.where(FileMetadata.entity_type == entity_type)
        if entity_id:
            base_query = base_query.where(FileMetadata.entity_id == entity_id)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.offset(pagination.offset).limit(pagination.page_size)

        if hasattr(FileMetadata, pagination.sort_by):
            order_col = getattr(FileMetadata, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        files = list(result.scalars().all())

        return files, total

    async def delete_file(
        self,
        file_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        reason: Optional[str] = None
    ) -> None:
        """
        Soft delete a file.

        Args:
            file_id: File ID
            tenant_id: Tenant ID
            user_id: User performing deletion
            reason: Optional deletion reason

        Raises:
            ResourceNotFoundException: If file not found
        """
        file_metadata = await self.get_file(file_id, tenant_id)

        file_metadata.is_deleted = True
        # deleted_at is a TIMESTAMP WITHOUT TIME ZONE column, so store a naive
        # (UTC) datetime to avoid asyncpg offset-aware/naive comparison errors.
        file_metadata.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None)
        file_metadata.deletion_reason = reason
        file_metadata.updated_by = user_id

        await self.db.commit()

        # Note: Actual file in MinIO is not deleted (soft delete only)
        # A background job could clean up orphaned files periodically

    def get_file_content(self, file_metadata: FileMetadata) -> bytes:
        """
        Read the raw object bytes from MinIO.

        Used by the authenticated content-streaming endpoint so files can be
        viewed/downloaded through the gateway without exposing MinIO directly.
        """
        response = None
        try:
            response = self.minio_client.get_object(
                bucket_name=file_metadata.bucket_name,
                object_name=file_metadata.object_key,
            )
            return response.read()
        finally:
            if response is not None:
                response.close()
                response.release_conn()

    def generate_download_url(
        self,
        file_metadata: FileMetadata,
        expires_in_seconds: int = 3600
    ) -> str:
        """
        Generate presigned download URL.
        Per API_CONTRACT.md - 1hr for view, 15min for download.

        Args:
            file_metadata: File metadata record
            expires_in_seconds: URL expiration time (default 1 hour)

        Returns:
            Presigned URL string
        """
        return self.minio_client.presigned_get_object(
            bucket_name=file_metadata.bucket_name,
            object_name=file_metadata.object_key,
            expires=timedelta(seconds=expires_in_seconds)
        )

    def generate_upload_url(
        self,
        tenant_id: UUID,
        module: str,
        filename: str,
        expires_in_seconds: int = 900
    ) -> Tuple[str, str]:
        """
        Generate presigned upload URL.

        Args:
            tenant_id: Tenant ID
            module: Module name
            filename: Target filename
            expires_in_seconds: URL expiration time (default 15 minutes)

        Returns:
            Tuple of (presigned_url, object_key)
        """
        file_id = uuid4()
        object_key = self._generate_object_key(tenant_id, module, file_id, filename)
        bucket_name = self.settings.minio_bucket_name

        self._ensure_bucket_exists(bucket_name)

        url = self.minio_client.presigned_put_object(
            bucket_name=bucket_name,
            object_name=object_key,
            expires=timedelta(seconds=expires_in_seconds)
        )

        return url, object_key
