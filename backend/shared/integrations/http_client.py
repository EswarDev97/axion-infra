"""
MindFlow Backend - HTTP Service Client
Base HTTP client for inter-service communication.
"""

import httpx
from functools import lru_cache
from typing import Any, Dict, Optional
from uuid import UUID

from ..config import get_settings


class ServiceClient:
    """Base HTTP client for service-to-service communication."""

    # Service URLs - configured for internal Docker networking
    SERVICE_URLS = {
        "auth": "http://auth-service:8101",
        "hr": "http://hr-service:8102",
        "task": "http://task-service:8103",
        "training": "http://training-service:8104",
        "expense": "http://expense-service:8105",
        "mindmap": "http://mindmap-service:8106",
        "complaint": "http://complaint-service:8107",
        "approval": "http://approval-service:8108",
        "notification": "http://notification-service:8109",
        "storage": "http://storage-service:8110",
        "report": "http://report-service:8111",
    }

    def __init__(self, service_name: str, timeout: float = 30.0):
        self.service_name = service_name
        self.base_url = self.SERVICE_URLS.get(service_name)
        if not self.base_url:
            raise ValueError(f"Unknown service: {service_name}")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        tenant_id: Optional[UUID] = None,
        auth_token: Optional[str] = None,
    ) -> httpx.Response:
        """Make GET request to service."""
        client = await self._get_client()
        request_headers = self._build_headers(headers, tenant_id, auth_token)
        return await client.get(path, params=params, headers=request_headers)

    async def post(
        self,
        path: str,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        tenant_id: Optional[UUID] = None,
        auth_token: Optional[str] = None,
    ) -> httpx.Response:
        """Make POST request to service."""
        client = await self._get_client()
        request_headers = self._build_headers(headers, tenant_id, auth_token)
        return await client.post(path, json=json, headers=request_headers)

    async def put(
        self,
        path: str,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        tenant_id: Optional[UUID] = None,
        auth_token: Optional[str] = None,
    ) -> httpx.Response:
        """Make PUT request to service."""
        client = await self._get_client()
        request_headers = self._build_headers(headers, tenant_id, auth_token)
        return await client.put(path, json=json, headers=request_headers)

    async def delete(
        self,
        path: str,
        headers: Optional[Dict[str, str]] = None,
        tenant_id: Optional[UUID] = None,
        auth_token: Optional[str] = None,
    ) -> httpx.Response:
        """Make DELETE request to service."""
        client = await self._get_client()
        request_headers = self._build_headers(headers, tenant_id, auth_token)
        return await client.delete(path, headers=request_headers)

    def _build_headers(
        self,
        custom_headers: Optional[Dict[str, str]],
        tenant_id: Optional[UUID],
        auth_token: Optional[str],
    ) -> Dict[str, str]:
        """Build request headers with tenant and auth info."""
        headers = {"Content-Type": "application/json"}

        if tenant_id:
            headers["X-Tenant-ID"] = str(tenant_id)

        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        if custom_headers:
            headers.update(custom_headers)

        return headers


def get_service_client(service_name: str) -> ServiceClient:
    """Get a service client instance."""
    return ServiceClient(service_name)
