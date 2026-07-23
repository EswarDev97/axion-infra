"""
MindFlow Backend - Exception Handling
Per API_CONTRACT.md Section 5 - Error Handling Standards
"""

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status


class MindFlowException(Exception):
    """Base exception for MindFlow application."""

    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[List[Dict[str, Any]]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


# Authentication Errors (401)
class AuthTokenExpiredException(MindFlowException):
    """AUTH_TOKEN_EXPIRED - Access token has expired."""

    def __init__(self, message: str = "Access token has expired"):
        super().__init__(
            message=message,
            code="AUTH_TOKEN_EXPIRED",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthTokenInvalidException(MindFlowException):
    """AUTH_TOKEN_INVALID - Token is malformed or invalid."""

    def __init__(self, message: str = "Token is malformed or invalid"):
        super().__init__(
            message=message,
            code="AUTH_TOKEN_INVALID",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthRefreshInvalidException(MindFlowException):
    """AUTH_REFRESH_INVALID - Refresh token is invalid or revoked."""

    def __init__(self, message: str = "Refresh token is invalid or revoked"):
        super().__init__(
            message=message,
            code="AUTH_REFRESH_INVALID",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthCredentialsInvalidException(MindFlowException):
    """AUTH_CREDENTIALS_INVALID - Wrong email/password."""

    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(
            message=message,
            code="AUTH_CREDENTIALS_INVALID",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


# Authorization Errors (403)
class AuthAccountLockedException(MindFlowException):
    """AUTH_ACCOUNT_LOCKED - Account locked due to failed attempts."""

    def __init__(self, message: str = "Account locked due to too many failed login attempts"):
        super().__init__(
            message=message,
            code="AUTH_ACCOUNT_LOCKED",
            status_code=status.HTTP_403_FORBIDDEN
        )


class AuthAccountInactiveException(MindFlowException):
    """AUTH_ACCOUNT_INACTIVE - User account is deactivated."""

    def __init__(self, message: str = "User account is deactivated"):
        super().__init__(
            message=message,
            code="AUTH_ACCOUNT_INACTIVE",
            status_code=status.HTTP_403_FORBIDDEN
        )


class AuthzInsufficientPermissionException(MindFlowException):
    """AUTHZ_INSUFFICIENT_PERMISSION - User lacks required permission."""

    def __init__(
        self,
        message: str = "You do not have permission to perform this action",
        required: Optional[str] = None,
        actual: Optional[List[str]] = None
    ):
        if required:
            message = f"{message} (requires: {required})"
        super().__init__(
            message=message,
            code="AUTHZ_INSUFFICIENT_PERMISSION",
            status_code=status.HTTP_403_FORBIDDEN
        )


class AuthzTenantMismatchException(MindFlowException):
    """AUTHZ_TENANT_MISMATCH - Resource belongs to different tenant."""

    def __init__(self, message: str = "Resource belongs to a different tenant"):
        super().__init__(
            message=message,
            code="AUTHZ_TENANT_MISMATCH",
            status_code=status.HTTP_403_FORBIDDEN
        )


class AuthzHierarchyViolationException(MindFlowException):
    """AUTHZ_HIERARCHY_VIOLATION - Action not allowed by hierarchy."""

    def __init__(self, message: str = "Action not allowed by organizational hierarchy"):
        super().__init__(
            message=message,
            code="AUTHZ_HIERARCHY_VIOLATION",
            status_code=status.HTTP_403_FORBIDDEN
        )


# Validation Errors (400)
class ValidationException(MindFlowException):
    """VALIDATION_ERROR - Request validation failed."""

    def __init__(
        self,
        message: str = "Validation failed",
        details: Optional[List[Dict[str, Any]]] = None
    ):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class ValidationRequiredFieldException(MindFlowException):
    """VALIDATION_REQUIRED_FIELD - Required field missing."""

    def __init__(self, field: str):
        super().__init__(
            message=f"Required field missing: {field}",
            code="VALIDATION_REQUIRED_FIELD",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=[{"field": field, "message": f"{field} is required", "code": "VALIDATION_REQUIRED_FIELD"}]
        )


class ValidationInvalidFormatException(MindFlowException):
    """VALIDATION_INVALID_FORMAT - Field format invalid."""

    def __init__(self, field: str, message: str = "Invalid format"):
        super().__init__(
            message=f"Invalid format for field: {field}",
            code="VALIDATION_INVALID_FORMAT",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=[{"field": field, "message": message, "code": "VALIDATION_INVALID_FORMAT"}]
        )


# Resource Errors (404, 409)
class ResourceNotFoundException(MindFlowException):
    """RESOURCE_NOT_FOUND - Requested resource not found."""

    def __init__(self, resource: str, identifier: Optional[str] = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(
            message=message,
            code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )


class ResourceAlreadyExistsException(MindFlowException):
    """RESOURCE_ALREADY_EXISTS - Resource with identifier exists."""

    def __init__(self, resource: str, identifier: Optional[str] = None):
        message = f"{resource} already exists"
        if identifier:
            message = f"{resource} with identifier '{identifier}' already exists"
        super().__init__(
            message=message,
            code="RESOURCE_ALREADY_EXISTS",
            status_code=status.HTTP_409_CONFLICT
        )


class ResourceStateConflictException(MindFlowException):
    """RESOURCE_STATE_CONFLICT - Invalid state transition."""

    def __init__(
        self,
        message: str = "Invalid state transition",
        current_state: Optional[str] = None,
        target_state: Optional[str] = None
    ):
        details = None
        if current_state or target_state:
            details = [{"currentState": current_state, "targetState": target_state}]
        super().__init__(
            message=message,
            code="RESOURCE_STATE_CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details
        )


# Business Logic Errors (422)
class BusinessRuleViolationException(MindFlowException):
    """BUSINESS_RULE_VIOLATION - Business logic constraint violated."""

    def __init__(self, message: str, details: Optional[List[Dict[str, Any]]] = None):
        super().__init__(
            message=message,
            code="BUSINESS_RULE_VIOLATION",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


# Rate Limiting (429)
class RateLimitExceededException(MindFlowException):
    """RATE_LIMIT_EXCEEDED - Too many requests."""

    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )


# Internal Errors (500)
class InternalErrorException(MindFlowException):
    """INTERNAL_ERROR - Unexpected server error."""

    def __init__(self, message: str = "An unexpected error occurred"):
        super().__init__(
            message=message,
            code="INTERNAL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
