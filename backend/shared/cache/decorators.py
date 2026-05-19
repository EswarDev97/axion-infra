"""
MindFlow Backend - Cache Decorators
Convenient decorators for caching function results.
"""

import functools
import hashlib
import json
import logging
from datetime import timedelta
from typing import Any, Callable, Optional, Union
from uuid import UUID

logger = logging.getLogger(__name__)


def cache(
    key_prefix: str,
    ttl: Union[int, timedelta] = 300,
    tenant_aware: bool = True,
):
    """
    Decorator to cache function results in Redis.

    Args:
        key_prefix: Prefix for cache key
        ttl: Time to live in seconds or timedelta
        tenant_aware: If True, include tenant_id in cache key

    Usage:
        @cache("user:profile", ttl=600, tenant_aware=True)
        async def get_user_profile(user_id: UUID, tenant_id: UUID) -> dict:
            ...

    The cache key is built from:
    - key_prefix
    - tenant_id (if tenant_aware and present in kwargs)
    - hash of all other arguments
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Import here to avoid circular dependency
            from .redis_cache import get_cache

            try:
                cache_instance = await get_cache()
            except Exception as e:
                logger.warning(f"Cache unavailable, executing without cache: {e}")
                return await func(*args, **kwargs)

            # Extract tenant_id if present
            tenant_id = kwargs.get("tenant_id")
            if tenant_aware and not tenant_id:
                # Check positional args for common patterns
                # This is a fallback - prefer explicit tenant_id in kwargs
                pass

            # Build cache key from arguments
            cache_key = _build_cache_key(key_prefix, args, kwargs)

            # Try to get from cache
            cached_value = await cache_instance.get(cache_key, tenant_id)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_value

            # Execute function
            logger.debug(f"Cache miss: {cache_key}")
            result = await func(*args, **kwargs)

            # Store in cache
            await cache_instance.set(cache_key, result, ttl, tenant_id)

            return result

        return wrapper

    return decorator


def cache_invalidate(
    key_pattern: str,
    tenant_aware: bool = True,
):
    """
    Decorator to invalidate cache entries after function execution.

    Args:
        key_pattern: Pattern of keys to invalidate (supports * wildcard)
        tenant_aware: If True, scope invalidation to tenant

    Usage:
        @cache_invalidate("user:*", tenant_aware=True)
        async def update_user(user_id: UUID, data: dict, tenant_id: UUID) -> dict:
            ...
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Execute function first
            result = await func(*args, **kwargs)

            # Import here to avoid circular dependency
            from .redis_cache import get_cache

            try:
                cache_instance = await get_cache()

                # Extract tenant_id if present
                tenant_id = kwargs.get("tenant_id") if tenant_aware else None

                # Invalidate matching keys
                deleted = await cache_instance.delete_pattern(key_pattern, tenant_id)
                if deleted > 0:
                    logger.debug(f"Invalidated {deleted} cache entries matching {key_pattern}")

            except Exception as e:
                logger.warning(f"Cache invalidation failed: {e}")

            return result

        return wrapper

    return decorator


def _build_cache_key(prefix: str, args: tuple, kwargs: dict) -> str:
    """Build a cache key from function arguments."""
    # Filter out tenant_id from hash (it's handled separately)
    filtered_kwargs = {k: v for k, v in kwargs.items() if k != "tenant_id"}

    # Create a hashable representation of arguments
    key_parts = [prefix]

    if args:
        args_str = json.dumps([_serialize_arg(a) for a in args], sort_keys=True)
        key_parts.append(hashlib.md5(args_str.encode()).hexdigest()[:8])

    if filtered_kwargs:
        kwargs_str = json.dumps(
            {k: _serialize_arg(v) for k, v in sorted(filtered_kwargs.items())},
            sort_keys=True,
        )
        key_parts.append(hashlib.md5(kwargs_str.encode()).hexdigest()[:8])

    return ":".join(key_parts)


def _serialize_arg(arg: Any) -> Any:
    """Serialize an argument for hashing."""
    if isinstance(arg, UUID):
        return str(arg)
    if hasattr(arg, "isoformat"):
        return arg.isoformat()
    if hasattr(arg, "__dict__"):
        return {k: _serialize_arg(v) for k, v in arg.__dict__.items() if not k.startswith("_")}
    if isinstance(arg, (list, tuple)):
        return [_serialize_arg(a) for a in arg]
    if isinstance(arg, dict):
        return {k: _serialize_arg(v) for k, v in arg.items()}
    return arg
