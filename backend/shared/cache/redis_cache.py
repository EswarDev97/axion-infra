"""
MindFlow Backend - Redis Cache Implementation
Per PO-030 Task 6.6.1: Implement Redis caching layer
"""

import json
import logging
from datetime import timedelta
from functools import lru_cache
from typing import Any, Optional, Union
from uuid import UUID

import redis.asyncio as redis

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class RedisCache:
    """
    Redis caching layer with TTL support.

    Features:
    - Key prefixing with tenant isolation
    - TTL-based expiration
    - JSON serialization for complex objects
    - Cache invalidation patterns
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        db: Optional[int] = None,
        prefix: str = "mindflow",
    ):
        self.redis_url = redis_url or settings.redis_url
        self.db = db if db is not None else settings.redis_cache_db
        self.prefix = prefix
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """Connect to Redis."""
        if self._client is None:
            # Parse redis URL and replace DB
            url = self.redis_url
            if "/" in url.split("@")[-1]:
                url = url.rsplit("/", 1)[0] + f"/{self.db}"
            else:
                url = f"{url}/{self.db}"

            self._client = redis.from_url(
                url,
                encoding="utf-8",
                decode_responses=True,
            )
            logger.info(f"Connected to Redis cache (db={self.db})")

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self._client:
            await self._client.close()
            self._client = None
            logger.info("Disconnected from Redis cache")

    @property
    def client(self) -> redis.Redis:
        """Get the Redis client."""
        if self._client is None:
            raise RuntimeError("Redis cache not connected. Call connect() first.")
        return self._client

    def _make_key(
        self,
        key: str,
        tenant_id: Optional[UUID] = None,
    ) -> str:
        """Build a cache key with prefix and optional tenant isolation."""
        parts = [self.prefix]
        if tenant_id:
            parts.append(f"tenant:{tenant_id}")
        parts.append(key)
        return ":".join(parts)

    def _serialize(self, value: Any) -> str:
        """Serialize value to JSON string."""
        return json.dumps(value, default=self._json_default)

    def _deserialize(self, value: str) -> Any:
        """Deserialize JSON string to value."""
        if value is None:
            return None
        return json.loads(value)

    @staticmethod
    def _json_default(obj: Any) -> Any:
        """JSON serializer for non-standard types."""
        if isinstance(obj, UUID):
            return str(obj)
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    async def get(
        self,
        key: str,
        tenant_id: Optional[UUID] = None,
    ) -> Optional[Any]:
        """
        Get a value from cache.

        Args:
            key: Cache key
            tenant_id: Optional tenant ID for isolation

        Returns:
            Cached value or None if not found
        """
        full_key = self._make_key(key, tenant_id)
        try:
            value = await self.client.get(full_key)
            if value:
                return self._deserialize(value)
            return None
        except Exception as e:
            logger.warning(f"Cache get failed for {full_key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Union[int, timedelta] = 300,
        tenant_id: Optional[UUID] = None,
    ) -> bool:
        """
        Set a value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds or timedelta
            tenant_id: Optional tenant ID for isolation

        Returns:
            True if successful
        """
        full_key = self._make_key(key, tenant_id)
        try:
            serialized = self._serialize(value)
            if isinstance(ttl, timedelta):
                ttl = int(ttl.total_seconds())
            await self.client.setex(full_key, ttl, serialized)
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for {full_key}: {e}")
            return False

    async def delete(
        self,
        key: str,
        tenant_id: Optional[UUID] = None,
    ) -> bool:
        """
        Delete a value from cache.

        Args:
            key: Cache key
            tenant_id: Optional tenant ID for isolation

        Returns:
            True if key was deleted
        """
        full_key = self._make_key(key, tenant_id)
        try:
            result = await self.client.delete(full_key)
            return result > 0
        except Exception as e:
            logger.warning(f"Cache delete failed for {full_key}: {e}")
            return False

    async def delete_pattern(
        self,
        pattern: str,
        tenant_id: Optional[UUID] = None,
    ) -> int:
        """
        Delete all keys matching a pattern.

        Args:
            pattern: Key pattern with wildcards (e.g., "user:*")
            tenant_id: Optional tenant ID for isolation

        Returns:
            Number of keys deleted
        """
        full_pattern = self._make_key(pattern, tenant_id)
        try:
            deleted = 0
            async for key in self.client.scan_iter(match=full_pattern):
                await self.client.delete(key)
                deleted += 1
            return deleted
        except Exception as e:
            logger.warning(f"Cache delete pattern failed for {full_pattern}: {e}")
            return 0

    async def exists(
        self,
        key: str,
        tenant_id: Optional[UUID] = None,
    ) -> bool:
        """Check if a key exists in cache."""
        full_key = self._make_key(key, tenant_id)
        try:
            return await self.client.exists(full_key) > 0
        except Exception as e:
            logger.warning(f"Cache exists check failed for {full_key}: {e}")
            return False

    async def ttl(
        self,
        key: str,
        tenant_id: Optional[UUID] = None,
    ) -> int:
        """Get remaining TTL for a key in seconds."""
        full_key = self._make_key(key, tenant_id)
        try:
            return await self.client.ttl(full_key)
        except Exception as e:
            logger.warning(f"Cache TTL check failed for {full_key}: {e}")
            return -1

    async def increment(
        self,
        key: str,
        amount: int = 1,
        tenant_id: Optional[UUID] = None,
    ) -> int:
        """Increment a counter value."""
        full_key = self._make_key(key, tenant_id)
        try:
            return await self.client.incrby(full_key, amount)
        except Exception as e:
            logger.warning(f"Cache increment failed for {full_key}: {e}")
            return 0

    async def get_or_set(
        self,
        key: str,
        factory,
        ttl: Union[int, timedelta] = 300,
        tenant_id: Optional[UUID] = None,
    ) -> Any:
        """
        Get from cache or set using factory function.

        Args:
            key: Cache key
            factory: Async function to generate value if not cached
            ttl: Time to live
            tenant_id: Optional tenant ID

        Returns:
            Cached or newly generated value
        """
        value = await self.get(key, tenant_id)
        if value is not None:
            return value

        # Generate new value
        if callable(factory):
            value = await factory() if hasattr(factory, "__await__") else factory()
        else:
            value = factory

        await self.set(key, value, ttl, tenant_id)
        return value


# Global cache instance
_cache_instance: Optional[RedisCache] = None


async def get_cache() -> RedisCache:
    """Get the global cache instance."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = RedisCache()
        await _cache_instance.connect()
    return _cache_instance
