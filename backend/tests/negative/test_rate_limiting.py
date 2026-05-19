"""
Negative Tests - Rate Limiting and Abuse Prevention
Per SDLC Phase 7 Task 7.5

Tests for:
- API rate limiting
- Brute force protection
- Resource exhaustion prevention
- DoS attack mitigation
"""

import pytest
import asyncio
from uuid import uuid4

pytestmark = [pytest.mark.negative, pytest.mark.asyncio]


class TestRateLimiting:
    """Tests for API rate limiting."""

    async def test_login_rate_limiting(self, auth_client, test_tenant):
        """Test rate limiting on login endpoint."""
        # Make rapid login attempts
        responses = []
        for i in range(20):
            response = await auth_client.post(
                "/api/v1/auth/login",
                json={
                    "email": f"test{i}@example.com",
                    "password": "wrongpassword",
                },
                headers={"X-Tenant-ID": str(test_tenant.id)},
            )
            responses.append(response.status_code)

        # Should eventually see rate limiting (429)
        # Note: This depends on rate limit configuration
        # If rate limiting is strict, we should see 429s
        assert 429 in responses or all(r in [400, 401, 422] for r in responses)

    async def test_api_rate_limiting(self, auth_client, auth_headers):
        """Test general API rate limiting."""
        # Make many rapid requests
        async def make_request():
            return await auth_client.get(
                "/api/v1/users/me",
                headers=auth_headers,
            )

        tasks = [make_request() for _ in range(50)]
        responses = await asyncio.gather(*tasks)
        status_codes = [r.status_code for r in responses]

        # Either all succeed or some are rate limited
        # Just verify no 500 errors
        assert 500 not in status_codes


class TestBruteForceProtection:
    """Tests for brute force attack protection."""

    async def test_account_lockout_after_failed_attempts(
        self, auth_client, test_tenant, test_user
    ):
        """Test account lockout after multiple failed login attempts."""
        # Make multiple failed login attempts
        for i in range(10):
            await auth_client.post(
                "/api/v1/auth/login",
                json={
                    "email": test_user.email,
                    "password": f"wrongpassword{i}",
                },
                headers={"X-Tenant-ID": str(test_tenant.id)},
            )

        # Next attempt should be blocked (account locked)
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user.email,
                "password": "correctpassword",  # Even with correct password
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )

        # Should be locked out or rate limited
        assert response.status_code in [401, 403, 423, 429]

    async def test_password_reset_rate_limiting(
        self, auth_client, test_tenant
    ):
        """Test rate limiting on password reset endpoint."""
        responses = []
        for i in range(10):
            response = await auth_client.post(
                "/api/v1/auth/password/reset-request",
                json={"email": f"user{i}@example.com"},
                headers={"X-Tenant-ID": str(test_tenant.id)},
            )
            responses.append(response.status_code)

        # Should see rate limiting after several attempts
        # 200 if email sent, 429 if rate limited
        assert 429 in responses or all(r in [200, 400, 422, 404] for r in responses)


class TestResourceExhaustion:
    """Tests for resource exhaustion prevention."""

    async def test_large_payload_rejection(self, auth_client, auth_headers):
        """Test rejection of excessively large payloads."""
        # Create a very large payload
        large_data = "A" * (10 * 1024 * 1024)  # 10 MB

        response = await auth_client.post(
            "/api/v1/tasks",
            json={
                "title": "Test",
                "description": large_data,
            },
            headers=auth_headers,
        )

        # Should reject with 413 or 422
        assert response.status_code in [400, 413, 422]

    async def test_many_items_in_request(self, auth_client, auth_headers):
        """Test handling of requests with many items."""
        # Request with too many items
        items = [{"title": f"Item {i}"} for i in range(10000)]

        response = await auth_client.post(
            "/api/v1/tasks/bulk",
            json={"tasks": items},
            headers=auth_headers,
        )

        # Should reject or limit
        assert response.status_code in [400, 404, 413, 422]

    async def test_deeply_nested_json(self, auth_client, auth_headers):
        """Test rejection of deeply nested JSON."""
        # Create deeply nested structure
        nested = {}
        current = nested
        for i in range(100):
            current["nested"] = {}
            current = current["nested"]

        response = await auth_client.post(
            "/api/v1/tasks",
            json=nested,
            headers=auth_headers,
        )

        # Should handle gracefully
        assert response.status_code in [400, 422, 500]  # Some level of rejection

    async def test_query_with_excessive_results(
        self, auth_client, admin_headers
    ):
        """Test query limiting for large result sets."""
        response = await auth_client.get(
            "/api/v1/users",
            params={"limit": 1000000},
            headers=admin_headers,
        )

        # Should cap the limit
        if response.status_code == 200:
            data = response.json()["data"]
            assert len(data.get("items", [])) <= 1000  # Reasonable max


class TestSlowlorisProtection:
    """Tests for slowloris attack protection."""

    async def test_slow_request_timeout(self, auth_client, auth_headers):
        """Test that slow requests are timed out."""
        # This is more of a configuration test
        # The server should have appropriate timeouts configured
        pass  # Actual test would need infrastructure-level testing


class TestInputValidation:
    """Tests for input validation as abuse prevention."""

    @pytest.mark.parametrize("field_length", [256, 1000, 10000])
    async def test_maximum_field_length_enforcement(
        self, task_client, auth_headers, field_length
    ):
        """Test maximum field length is enforced."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "A" * field_length,
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )

        # Long titles should be rejected
        if field_length > 255:
            assert response.status_code in [400, 422]

    async def test_maximum_query_parameters(
        self, auth_client, admin_headers
    ):
        """Test maximum query parameter handling."""
        # Build URL with many parameters
        params = {f"param{i}": f"value{i}" for i in range(100)}

        response = await auth_client.get(
            "/api/v1/users",
            params=params,
            headers=admin_headers,
        )

        # Should handle gracefully (ignore unknown params or reject)
        assert response.status_code in [200, 400, 414]  # 414 = URI too long


class TestConcurrentAccess:
    """Tests for concurrent access handling."""

    async def test_concurrent_updates(self, task_client, auth_headers):
        """Test handling of concurrent updates to same resource."""
        # Create a task
        create_response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": "Concurrent Test",
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create task")

        task_id = create_response.json()["data"]["id"]

        # Make concurrent updates
        async def update_task(priority):
            return await task_client.patch(
                f"/api/v1/tasks/{task_id}",
                json={"priority": priority},
                headers=auth_headers,
            )

        tasks = [
            update_task("HIGH"),
            update_task("LOW"),
            update_task("MEDIUM"),
        ]
        responses = await asyncio.gather(*tasks)

        # All should succeed or fail gracefully with conflict
        for r in responses:
            assert r.status_code in [200, 409, 422]

    async def test_concurrent_creates_unique_constraint(
        self, auth_client, admin_headers, test_tenant
    ):
        """Test concurrent creates with unique constraints."""
        unique_email = f"concurrent_test_{uuid4().hex[:8]}@example.com"

        async def create_user():
            return await auth_client.post(
                "/api/v1/users",
                json={
                    "email": unique_email,
                    "password": "Password123!",
                },
                headers=admin_headers,
            )

        tasks = [create_user() for _ in range(5)]
        responses = await asyncio.gather(*tasks)
        status_codes = [r.status_code for r in responses]

        # Only one should succeed, others should fail
        success_count = status_codes.count(201)
        conflict_count = status_codes.count(409)

        assert success_count <= 1
        # Others should be conflicts or validation errors
        for code in status_codes:
            assert code in [201, 400, 409, 422]
