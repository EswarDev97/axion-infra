"""
Negative Tests - Invalid Inputs
Per SDLC Phase 7 Task 7.5 - Test Negative and Abuse Cases

Tests for handling of invalid inputs:
- Invalid data types
- Missing required fields
- Out of range values
- Malformed data
"""

import pytest
from uuid import uuid4

pytestmark = [pytest.mark.negative, pytest.mark.asyncio]


class TestInvalidEmailFormats:
    """Tests for invalid email format handling."""

    @pytest.mark.parametrize("invalid_email", [
        "",                             # Empty
        "notanemail",                   # Missing @
        "@missing.local",               # Missing local part
        "missing@.domain",              # Missing domain
        "spaces in@email.com",          # Spaces
        "multiple@@at.com",             # Multiple @
        "a" * 256 + "@example.com",     # Too long (>255 chars)
        "emoji😀@example.com",          # Emoji
        "<script>@evil.com",            # XSS attempt
    ])
    async def test_register_invalid_email_rejected(
        self, auth_client, test_tenant, invalid_email
    ):
        """Test registration rejects invalid email formats."""
        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "email": invalid_email,
                "password": "ValidPass123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )
        assert response.status_code == 422


class TestInvalidUUIDs:
    """Tests for invalid UUID handling."""

    @pytest.mark.parametrize("invalid_uuid", [
        "not-a-uuid",
        "12345",
        "",
        "null",
        "undefined",
        "00000000-0000-0000-0000",          # Incomplete
        "00000000-0000-0000-0000-00000000000g",  # Invalid char
        "../../../etc/passwd",              # Path traversal
    ])
    async def test_get_user_invalid_uuid_rejected(
        self, auth_client, admin_headers, invalid_uuid
    ):
        """Test endpoints reject invalid UUIDs."""
        response = await auth_client.get(
            f"/api/v1/users/{invalid_uuid}",
            headers=admin_headers,
        )
        assert response.status_code in [404, 422]

    @pytest.mark.parametrize("invalid_uuid", [
        "not-a-uuid",
        "12345",
        "",
    ])
    async def test_get_task_invalid_uuid_rejected(
        self, task_client, auth_headers, invalid_uuid
    ):
        """Test task endpoints reject invalid UUIDs."""
        response = await task_client.get(
            f"/api/v1/tasks/{invalid_uuid}",
            headers=auth_headers,
        )
        assert response.status_code in [404, 422]


class TestMissingRequiredFields:
    """Tests for missing required field handling."""

    async def test_register_missing_email(self, auth_client, test_tenant):
        """Test registration fails without email."""
        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "password": "ValidPass123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )
        assert response.status_code == 422

    async def test_register_missing_password(self, auth_client, test_tenant):
        """Test registration fails without password."""
        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )
        assert response.status_code == 422

    async def test_login_missing_credentials(self, auth_client, test_tenant):
        """Test login fails without credentials."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={},
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )
        assert response.status_code == 422

    async def test_create_task_missing_title(self, task_client, auth_headers):
        """Test task creation fails without title."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "description": "Task without title",
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestInvalidDataTypes:
    """Tests for invalid data type handling."""

    async def test_priority_invalid_type(self, task_client, auth_headers):
        """Test task creation with invalid priority type."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Test Task",
                "priority": 123,  # Should be string
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    async def test_is_active_invalid_type(self, auth_client, admin_headers, test_user):
        """Test user update with invalid boolean type."""
        response = await auth_client.put(
            f"/api/v1/users/{test_user.id}",
            json={
                "is_active": "not_a_boolean",
            },
            headers=admin_headers,
        )
        assert response.status_code == 422

    async def test_date_invalid_format(self, hr_client, employee_headers):
        """Test leave request with invalid date format."""
        response = await hr_client.post(
            "/api/v1/hr/leave/requests",
            json={
                "leave_type_id": str(uuid4()),
                "start_date": "not-a-date",
                "end_date": "2026-01-15",
                "reason": "Test",
            },
            headers=employee_headers,
        )
        assert response.status_code == 422


class TestOutOfRangeValues:
    """Tests for out of range value handling."""

    async def test_negative_page_number(self, auth_client, admin_headers):
        """Test negative page number is rejected."""
        response = await auth_client.get(
            "/api/v1/users?page=-1",
            headers=admin_headers,
        )
        assert response.status_code in [400, 422]

    async def test_excessive_page_size(self, auth_client, admin_headers):
        """Test excessive page size is rejected or limited."""
        response = await auth_client.get(
            "/api/v1/users?limit=10000",
            headers=admin_headers,
        )
        # Should either reject or cap the limit
        assert response.status_code in [200, 400, 422]
        if response.status_code == 200:
            # Check limit was applied
            data = response.json()["data"]
            assert len(data.get("items", [])) <= 100  # Reasonable max

    async def test_leave_end_before_start(self, hr_client, employee_headers):
        """Test leave request with end date before start date."""
        response = await hr_client.post(
            "/api/v1/hr/leave/requests",
            json={
                "leave_type_id": str(uuid4()),
                "start_date": "2026-01-20",
                "end_date": "2026-01-15",  # Before start
                "reason": "Invalid dates",
            },
            headers=employee_headers,
        )
        assert response.status_code in [400, 422]


class TestMalformedRequests:
    """Tests for malformed request handling."""

    async def test_invalid_json_body(self, auth_client, test_tenant):
        """Test invalid JSON body is rejected."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            content="not valid json{",
            headers={
                "X-Tenant-ID": str(test_tenant.id),
                "Content-Type": "application/json",
            },
        )
        assert response.status_code == 422

    async def test_empty_json_body(self, auth_client, test_tenant):
        """Test empty JSON body is handled."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json=None,
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )
        assert response.status_code == 422

    async def test_array_instead_of_object(self, auth_client, test_tenant):
        """Test array instead of object is rejected."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json=["email@example.com", "password"],
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )
        assert response.status_code == 422


class TestNullValues:
    """Tests for null value handling."""

    async def test_null_email(self, auth_client, test_tenant):
        """Test null email is rejected."""
        response = await auth_client.post(
            "/api/v1/auth/register",
            json={
                "email": None,
                "password": "ValidPass123!",
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )
        assert response.status_code == 422

    async def test_null_required_field(self, task_client, auth_headers):
        """Test null required field is rejected."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": None,
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestSpecialCharacters:
    """Tests for special character handling."""

    @pytest.mark.parametrize("special_title", [
        "<script>alert('xss')</script>",
        "'; DROP TABLE tasks; --",
        "${7*7}",
        "{{7*7}}",
        "%n%n%n%n",
        "\x00null\x00byte",
    ])
    async def test_task_title_special_chars(
        self, task_client, auth_headers, special_title
    ):
        """Test task creation with special characters in title."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": special_title,
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        # Should either sanitize and accept, or reject
        assert response.status_code in [201, 400, 422]

        # If accepted, verify it was sanitized
        if response.status_code == 201:
            task = response.json()["data"]
            # Should not contain raw script tags
            assert "<script>" not in task.get("title", "")


class TestBoundaryValues:
    """Tests for boundary value handling."""

    async def test_max_length_title(self, task_client, auth_headers):
        """Test maximum length task title."""
        max_length = 255
        long_title = "A" * max_length

        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": long_title,
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        # Should accept at max length
        assert response.status_code in [201, 422]

    async def test_exceed_max_length_title(self, task_client, auth_headers):
        """Test exceeding maximum length task title."""
        over_max = "A" * 1000

        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": over_max,
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        # Should reject or truncate
        assert response.status_code in [201, 400, 422]

    async def test_empty_string_title(self, task_client, auth_headers):
        """Test empty string task title."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "",
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    async def test_whitespace_only_title(self, task_client, auth_headers):
        """Test whitespace-only task title."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "   ",
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422
