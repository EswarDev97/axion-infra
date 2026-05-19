"""
MindFlow Backend - Security Module
Per TECH_STACK.md, SECURITY_ARCHITECTURE.md, and THREAT_MODEL.md

Implements:
- JWT token generation and validation (HS256)
- Password hashing with bcrypt
- Token refresh rotation
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings

# Password hashing context (bcrypt per TECH_STACK.md)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SecurityError(Exception):
    """Base security exception."""
    pass


class TokenError(SecurityError):
    """Token-related errors."""
    pass


class PasswordError(SecurityError):
    """Password-related errors."""
    pass


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """
    Validate password strength per API_CONTRACT.md Section 6.1:
    - Min 12 chars
    - 1 uppercase
    - 1 lowercase
    - 1 digit
    - 1 special character
    """
    settings = get_settings()
    errors = []

    if len(password) < settings.password_min_length:
        errors.append(f"Password must be at least {settings.password_min_length} characters")

    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter")

    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter")

    if not re.search(r"\d", password):
        errors.append("Password must contain at least one digit")

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        errors.append("Password must contain at least one special character")

    return len(errors) == 0, errors


def create_access_token(
    user_id: UUID,
    tenant_id: UUID,
    email: str,
    roles: list[str],
    permissions: list[str],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token per API_CONTRACT.md Section 2.1.

    Token structure:
    {
        "user_id": "uuid",
        "tenant_id": "uuid",
        "email": "user@example.com",
        "roles": ["MANAGER", "HR_ADMIN"],
        "permissions": ["hr:read:all", "hr:write:subordinates"],
        "exp": 1234567890,
        "iat": 1234567890,
        "jti": "unique-token-id",
        "token_type": "access",
        "iss": "mindflow",
        "sub": "uuid"
    }
    """
    settings = get_settings()

    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)

    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    payload = {
        "user_id": str(user_id),
        "tenant_id": str(tenant_id),
        "email": email,
        "roles": roles,
        "permissions": permissions,
        "exp": expire,
        "iat": now,
        "jti": str(uuid4()),
        "token_type": "access",
        "iss": settings.jwt_issuer,
        "sub": str(user_id),
    }

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(
    user_id: UUID,
    tenant_id: UUID,
    expires_delta: Optional[timedelta] = None
) -> tuple[str, UUID]:
    """
    Create JWT refresh token per API_CONTRACT.md Section 2.1.

    Returns:
        Tuple of (token_string, jti_uuid) for session tracking

    Token structure:
    {
        "user_id": "uuid",
        "tenant_id": "uuid",
        "jti": "unique-token-id",
        "token_type": "refresh",
        "exp": 1234567890,
        "iat": 1234567890
    }
    """
    settings = get_settings()

    if expires_delta is None:
        expires_delta = timedelta(days=settings.jwt_refresh_token_expire_days)

    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    jti = uuid4()

    payload = {
        "user_id": str(user_id),
        "tenant_id": str(tenant_id),
        "jti": str(jti),
        "token_type": "refresh",
        "exp": expire,
        "iat": now,
    }

    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, jti


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.

    Raises:
        TokenError: If token is invalid, expired, or malformed
    """
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": True}
        )
        return payload
    except JWTError as e:
        raise TokenError(f"Invalid token: {str(e)}")


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate an access token.

    Returns dict with user_id, tenant_id, email, roles, permissions.

    Raises:
        TokenError: If token is invalid or not an access token
    """
    payload = decode_token(token)

    if payload.get("token_type") != "access":
        raise TokenError("Invalid token type: expected access token")

    return payload


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a refresh token.

    Returns dict with user_id, tenant_id, jti.

    Raises:
        TokenError: If token is invalid or not a refresh token
    """
    payload = decode_token(token)

    if payload.get("token_type") != "refresh":
        raise TokenError("Invalid token type: expected refresh token")

    return payload
