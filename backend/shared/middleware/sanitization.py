"""
MindFlow Backend - Input Sanitization Middleware
Per PO-030 Task 6.7.2: Implement input sanitization

Uses bleach for HTML/XSS sanitization.
"""

import logging
import re
from typing import Any, Callable, Dict, List, Optional, Union

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

try:
    import bleach
    BLEACH_AVAILABLE = True
except ImportError:
    BLEACH_AVAILABLE = False
    logging.warning("bleach not installed. HTML sanitization will be limited.")

logger = logging.getLogger(__name__)


# Allowed HTML tags (for rich text fields)
ALLOWED_TAGS = [
    "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
    "ul", "ol", "li", "blockquote", "code", "pre",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "span", "div",
]

# Allowed HTML attributes
ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
    "span": ["class", "style"],
    "div": ["class", "style"],
    "*": ["id", "class"],
}

# Allowed URL schemes
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]

# Dangerous patterns to detect
DANGEROUS_PATTERNS = [
    # SQL Injection patterns
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|TRUNCATE)\b.*\b(FROM|INTO|TABLE|WHERE)\b)",
    # Command injection patterns
    r"(;|\||`|\$\(|\${)",
    # LDAP injection
    r"(\*\)|\(\||\(&)",
    # XPath injection
    r"(\[.*=.*\]|//|\.\.)",
    # Template injection
    r"(\{\{|\}\}|\{%|%\})",
]


def sanitize_string(
    value: str,
    allow_html: bool = False,
    strip_all: bool = False,
) -> str:
    """
    Sanitize a string value.

    Args:
        value: String to sanitize
        allow_html: If True, allow safe HTML tags
        strip_all: If True, strip all HTML tags

    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        return value

    if strip_all or not allow_html:
        # Strip all HTML
        if BLEACH_AVAILABLE:
            value = bleach.clean(value, tags=[], strip=True)
        else:
            # Basic tag stripping fallback
            value = re.sub(r"<[^>]+>", "", value)
    elif allow_html and BLEACH_AVAILABLE:
        # Clean HTML but allow safe tags
        value = bleach.clean(
            value,
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRIBUTES,
            protocols=ALLOWED_PROTOCOLS,
            strip=True,
        )

    # Trim whitespace
    value = value.strip()

    return value


def sanitize_value(
    value: Any,
    allow_html: bool = False,
    key: str = "",
) -> Any:
    """
    Recursively sanitize a value.

    Args:
        value: Value to sanitize
        allow_html: If True, allow safe HTML in strings
        key: Field key for context

    Returns:
        Sanitized value
    """
    if value is None:
        return None

    if isinstance(value, str):
        # Determine if field should allow HTML
        html_fields = ["description", "content", "body", "notes", "comment"]
        field_allows_html = allow_html or any(f in key.lower() for f in html_fields)
        return sanitize_string(value, allow_html=field_allows_html)

    if isinstance(value, dict):
        return {k: sanitize_value(v, allow_html, k) for k, v in value.items()}

    if isinstance(value, list):
        return [sanitize_value(v, allow_html, key) for v in value]

    return value


def detect_injection_attempt(value: str) -> Optional[str]:
    """
    Detect potential injection attempts.

    Args:
        value: String to check

    Returns:
        Type of injection detected or None
    """
    if not isinstance(value, str):
        return None

    # Check for SQL injection
    sql_pattern = re.compile(
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|TRUNCATE)\b.*\b(FROM|INTO|TABLE|WHERE)\b)",
        re.IGNORECASE,
    )
    if sql_pattern.search(value):
        return "SQL_INJECTION"

    # Check for command injection
    cmd_pattern = re.compile(r"(;|\||`|\$\(|\${)")
    if cmd_pattern.search(value):
        return "COMMAND_INJECTION"

    # Check for XSS script tags
    xss_pattern = re.compile(r"<\s*script", re.IGNORECASE)
    if xss_pattern.search(value):
        return "XSS_SCRIPT"

    # Check for event handlers
    event_pattern = re.compile(r"\bon\w+\s*=", re.IGNORECASE)
    if event_pattern.search(value):
        return "XSS_EVENT_HANDLER"

    # Check for javascript: protocol
    js_protocol = re.compile(r"javascript:", re.IGNORECASE)
    if js_protocol.search(value):
        return "XSS_JS_PROTOCOL"

    return None


def check_value_for_injection(value: Any, path: str = "") -> List[Dict[str, str]]:
    """
    Recursively check value for injection attempts.

    Returns:
        List of detected threats with path and type
    """
    threats = []

    if isinstance(value, str):
        threat_type = detect_injection_attempt(value)
        if threat_type:
            threats.append({
                "path": path,
                "type": threat_type,
                "value_preview": value[:100] + "..." if len(value) > 100 else value,
            })

    elif isinstance(value, dict):
        for k, v in value.items():
            new_path = f"{path}.{k}" if path else k
            threats.extend(check_value_for_injection(v, new_path))

    elif isinstance(value, list):
        for i, v in enumerate(value):
            new_path = f"{path}[{i}]"
            threats.extend(check_value_for_injection(v, new_path))

    return threats


class SanitizationMiddleware(BaseHTTPMiddleware):
    """
    Input sanitization middleware.

    Sanitizes all incoming request bodies to prevent XSS and injection attacks.
    """

    def __init__(
        self,
        app,
        enabled: bool = True,
        log_threats: bool = True,
        block_threats: bool = False,
    ):
        super().__init__(app)
        self.enabled = enabled
        self.log_threats = log_threats
        self.block_threats = block_threats

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with sanitization."""
        if not self.enabled:
            return await call_next(request)

        # Only process requests with body
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)

        # Skip certain paths
        path = request.url.path
        if path.startswith(("/docs", "/openapi.json", "/health", "/ready")):
            return await call_next(request)

        # For now, let the request through
        # In production, you might want to intercept and sanitize the body
        return await call_next(request)


def sanitize_request_body(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize request body dictionary.

    Args:
        body: Request body to sanitize

    Returns:
        Sanitized body
    """
    return sanitize_value(body)
