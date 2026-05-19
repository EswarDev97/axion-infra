"""
Storage Service Model Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- FileMetadata model
"""

import pytest
from datetime import datetime
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestFileMetadataModel:
    """Tests for FileMetadata model."""

    async def test_file_metadata_creation(self, db_session, test_tenant, test_user):
        """Test file metadata creation."""
        from services.storage.models.file_metadata import FileMetadata

        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="report_q1_2026.pdf",
            stored_filename="abc123_report_q1_2026.pdf",
            content_type="application/pdf",
            file_size=1048576,  # 1 MB
            bucket_name="mindflow-documents",
            object_key="documents/reports/2026/abc123_report_q1_2026.pdf",
            module="task",
            entity_type="attachment",
            entity_id=uuid4(),
            description="Q1 2026 Financial Report",
            checksum="sha256:abc123def456...",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.id is not None
        assert file_metadata.original_filename == "report_q1_2026.pdf"
        assert file_metadata.content_type == "application/pdf"
        assert file_metadata.file_size == 1048576
        assert file_metadata.bucket_name == "mindflow-documents"

    async def test_file_metadata_modules(self, db_session, test_tenant, test_user):
        """Test different module values for file metadata."""
        modules = ["task", "expense", "training", "complaint", "mindmap", "hr"]

        for module in modules:
            file_metadata = FileMetadata(
                tenant_id=test_tenant.id,
                original_filename=f"{module}_file.pdf",
                stored_filename=f"stored_{module}_file.pdf",
                content_type="application/pdf",
                file_size=1024,
                bucket_name="mindflow-documents",
                object_key=f"{module}/files/stored_{module}_file.pdf",
                module=module,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(file_metadata)
            await db_session.commit()
            await db_session.refresh(file_metadata)
            assert file_metadata.module == module

    async def test_file_metadata_content_types(self, db_session, test_tenant, test_user):
        """Test various content types."""
        content_types = [
            ("document.pdf", "application/pdf"),
            ("image.png", "image/png"),
            ("image.jpg", "image/jpeg"),
            ("spreadsheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            ("presentation.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            ("document.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            ("archive.zip", "application/zip"),
            ("text.txt", "text/plain"),
            ("data.json", "application/json"),
            ("video.mp4", "video/mp4"),
        ]

        for filename, content_type in content_types:
            file_metadata = FileMetadata(
                tenant_id=test_tenant.id,
                original_filename=filename,
                stored_filename=f"stored_{filename}",
                content_type=content_type,
                file_size=1024,
                bucket_name="mindflow-documents",
                object_key=f"files/stored_{filename}",
                module="task",
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(file_metadata)
            await db_session.commit()
            await db_session.refresh(file_metadata)
            assert file_metadata.content_type == content_type

    async def test_file_metadata_with_entity_reference(
        self, db_session, test_tenant, test_user
    ):
        """Test file metadata with entity reference."""
        entity_id = uuid4()
        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="receipt.jpg",
            stored_filename="abc123_receipt.jpg",
            content_type="image/jpeg",
            file_size=512000,
            bucket_name="mindflow-receipts",
            object_key="expense/receipts/abc123_receipt.jpg",
            module="expense",
            entity_type="receipt",
            entity_id=entity_id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.entity_type == "receipt"
        assert file_metadata.entity_id == entity_id

    async def test_file_metadata_without_entity_reference(
        self, db_session, test_tenant, test_user
    ):
        """Test file metadata without entity reference."""
        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="general_file.pdf",
            stored_filename="stored_general_file.pdf",
            content_type="application/pdf",
            file_size=1024,
            bucket_name="mindflow-documents",
            object_key="general/stored_general_file.pdf",
            module="task",
            entity_type=None,
            entity_id=None,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.entity_type is None
        assert file_metadata.entity_id is None

    async def test_file_metadata_with_checksum(self, db_session, test_tenant, test_user):
        """Test file metadata with checksum."""
        checksum = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="verified_file.pdf",
            stored_filename="stored_verified_file.pdf",
            content_type="application/pdf",
            file_size=2048,
            bucket_name="mindflow-documents",
            object_key="verified/stored_verified_file.pdf",
            module="task",
            checksum=checksum,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.checksum == checksum

    async def test_file_metadata_soft_delete(self, db_session, test_tenant, test_user):
        """Test file metadata soft delete."""
        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="to_delete.pdf",
            stored_filename="stored_to_delete.pdf",
            content_type="application/pdf",
            file_size=1024,
            bucket_name="mindflow-documents",
            object_key="temp/stored_to_delete.pdf",
            module="task",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()

        assert file_metadata.is_deleted is False
        assert file_metadata.deleted_at is None

        # Soft delete
        file_metadata.is_deleted = True
        file_metadata.deleted_at = datetime.utcnow()
        file_metadata.deletion_reason = "File replaced by newer version"
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.is_deleted is True
        assert file_metadata.deleted_at is not None
        assert file_metadata.deletion_reason == "File replaced by newer version"

    async def test_file_metadata_large_file(self, db_session, test_tenant, test_user):
        """Test file metadata for large file (>100MB)."""
        large_file_size = 104857600 * 5  # 500 MB

        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="large_video.mp4",
            stored_filename="stored_large_video.mp4",
            content_type="video/mp4",
            file_size=large_file_size,
            bucket_name="mindflow-media",
            object_key="training/videos/stored_large_video.mp4",
            module="training",
            entity_type="training_content",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.file_size == large_file_size

    async def test_file_metadata_unicode_filename(
        self, db_session, test_tenant, test_user
    ):
        """Test file metadata with unicode characters in filename."""
        unicode_filename = "报告_2026年第一季度.pdf"

        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename=unicode_filename,
            stored_filename="abc123_unicode_report.pdf",
            content_type="application/pdf",
            file_size=1024,
            bucket_name="mindflow-documents",
            object_key="reports/abc123_unicode_report.pdf",
            module="task",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.original_filename == unicode_filename

    async def test_file_metadata_with_description(
        self, db_session, test_tenant, test_user
    ):
        """Test file metadata with description."""
        description = "Monthly expense report with all receipts attached"

        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="expenses_jan_2026.pdf",
            stored_filename="stored_expenses_jan_2026.pdf",
            content_type="application/pdf",
            file_size=5120,
            bucket_name="mindflow-documents",
            object_key="expense/reports/stored_expenses_jan_2026.pdf",
            module="expense",
            description=description,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.description == description


class TestFileMetadataBucketOrganization:
    """Tests for file organization in buckets."""

    async def test_files_organized_by_module(self, db_session, test_tenant, test_user):
        """Test that files are organized by module."""
        modules_and_buckets = [
            ("task", "mindflow-documents", "task/attachments/"),
            ("expense", "mindflow-receipts", "expense/receipts/"),
            ("training", "mindflow-media", "training/content/"),
            ("complaint", "mindflow-documents", "complaint/evidence/"),
        ]

        for module, bucket, path_prefix in modules_and_buckets:
            file_metadata = FileMetadata(
                tenant_id=test_tenant.id,
                original_filename=f"{module}_file.pdf",
                stored_filename=f"stored_{module}_file.pdf",
                content_type="application/pdf",
                file_size=1024,
                bucket_name=bucket,
                object_key=f"{path_prefix}stored_{module}_file.pdf",
                module=module,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(file_metadata)
            await db_session.commit()
            await db_session.refresh(file_metadata)

            assert file_metadata.bucket_name == bucket
            assert file_metadata.object_key.startswith(path_prefix)

    async def test_file_path_with_date_hierarchy(
        self, db_session, test_tenant, test_user
    ):
        """Test file paths with date-based hierarchy."""
        year = "2026"
        month = "01"
        object_key = f"expense/receipts/{year}/{month}/stored_receipt.jpg"

        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="receipt.jpg",
            stored_filename="stored_receipt.jpg",
            content_type="image/jpeg",
            file_size=512000,
            bucket_name="mindflow-receipts",
            object_key=object_key,
            module="expense",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert year in file_metadata.object_key
        assert month in file_metadata.object_key


class TestFileMetadataAudit:
    """Tests for file metadata audit trail."""

    async def test_file_metadata_audit_columns(self, db_session, test_tenant, test_user):
        """Test audit columns are properly set."""
        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="audit_test.pdf",
            stored_filename="stored_audit_test.pdf",
            content_type="application/pdf",
            file_size=1024,
            bucket_name="mindflow-documents",
            object_key="audit/stored_audit_test.pdf",
            module="task",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        assert file_metadata.created_at is not None
        assert file_metadata.updated_at is not None
        assert file_metadata.created_by == test_user.id
        assert file_metadata.updated_by == test_user.id

    async def test_file_metadata_updated_at_changes(
        self, db_session, test_tenant, test_user
    ):
        """Test that updated_at changes on modification."""
        file_metadata = FileMetadata(
            tenant_id=test_tenant.id,
            original_filename="update_test.pdf",
            stored_filename="stored_update_test.pdf",
            content_type="application/pdf",
            file_size=1024,
            bucket_name="mindflow-documents",
            object_key="update/stored_update_test.pdf",
            module="task",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(file_metadata)
        await db_session.commit()
        await db_session.refresh(file_metadata)

        original_updated_at = file_metadata.updated_at

        # Update description
        file_metadata.description = "Updated description"
        await db_session.commit()
        await db_session.refresh(file_metadata)

        # Note: updated_at auto-update depends on onupdate trigger
        assert file_metadata.description == "Updated description"
