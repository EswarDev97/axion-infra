"""
MindFlow Storage Service - File Schemas
Per API_CONTRACT.md Section 8.10
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class FileUploadRequest(BaseModel):
    """Metadata for file upload."""
    module: str = Field(max_length=50)
    entity_type: Optional[str] = Field(None, max_length=50, alias="entityType")
    entity_id: Optional[UUID] = Field(None, alias="entityId")
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class FileUploadResponse(BaseModel):
    """Response after successful file upload."""
    id: UUID
    original_filename: str = Field(alias="originalFilename")
    content_type: str = Field(alias="contentType")
    file_size: int = Field(alias="fileSize")
    module: str
    entity_type: Optional[str] = Field(None, alias="entityType")
    entity_id: Optional[UUID] = Field(None, alias="entityId")
    created_at: datetime = Field(alias="createdAt")
    download_url: str = Field(alias="downloadUrl")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class FileMetadataResponse(BaseModel):
    """Full file metadata response."""
    id: UUID
    original_filename: str = Field(alias="originalFilename")
    content_type: str = Field(alias="contentType")
    file_size: int = Field(alias="fileSize")
    module: str
    entity_type: Optional[str] = Field(None, alias="entityType")
    entity_id: Optional[UUID] = Field(None, alias="entityId")
    description: Optional[str] = None
    created_at: datetime = Field(alias="createdAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class FileListResponse(PaginatedData[FileMetadataResponse]):
    """Paginated list of files."""
    pass


class PresignedUrlResponse(BaseModel):
    """Presigned URL response."""
    url: str
    expires_in: int = Field(alias="expiresIn")
    method: str = "GET"

    model_config = ConfigDict(populate_by_name=True)
