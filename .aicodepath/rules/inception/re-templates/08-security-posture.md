# Security Posture — RE Template

## Route Gate

**Included in routes**:
- `greenfield`: SKIP — no existing codebase to analyze
- `brownfield-shallow`: SKIP — shallow route covers docs 1–5 only
- `brownfield-deep`: INCLUDE

If `re_route` = `greenfield`: stop here, do not generate this document.
If `re_route` = `brownfield-shallow`: stop here, do not generate this document.

---

## Frontmatter

When generating output, populate this frontmatter:

```yaml
---
repo: <git remote name or directory name>
repo_url: <git remote url>
branch: <current branch>
commit: <HEAD short hash>
generated_at: <ISO timestamp>
data_source: graph|llm-only
route: <re_route value>
---
```

---

## Instructions

Output file: `aicodepath-docs/inception/reverse-engineering/08-security-posture.md`

> **Important**: This document identifies security patterns in the code for RE purposes only. Do NOT output specific secret values, credential strings, or private key material. Reference config key names and locations only.

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__callers_of` and `mcp__aicodepath-code-graph__search_entities` are available, call:

```
mcp__aicodepath-code-graph__callers_of(qualified_name="<auth middleware or authenticate function>", max_depth=1)
mcp__aicodepath-code-graph__search_entities(query="auth authenticate authorize permission role jwt token", limit=20)
mcp__aicodepath-code-graph__search_entities(query="encrypt decrypt hash bcrypt argon scrypt", limit=20)
mcp__aicodepath-code-graph__search_entities(query="csrf cors helmet sanitize validate escape", limit=20)
```

Use `callers_of` on the auth middleware to discover which endpoints apply authentication and which may be unprotected.

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Authentication Mechanisms [DATA SOURCE: graph|llm-only]

**Graph path**: From `callers_of` on auth middleware and `search_entities` auth results, identify how authentication is implemented and where it is applied.

**LLM-only path**: Scan for auth library imports and patterns:
- JWT: `jsonwebtoken`, `pyjwt`, `jose`, `dgrijalva/jwt-go` — token generation, validation, expiry
- Session: `express-session`, `flask-session`, cookie-based session patterns
- OAuth2/OIDC: `passport`, `authlib`, `golang.org/x/oauth2`, identity provider configs
- API keys: header extraction patterns (`X-API-Key`, `Authorization: Bearer`)
- Basic auth: `Authorization: Basic` handling

For each auth mechanism:
```
**Mechanism: <name>**
- Library/approach: <specific package and version if found>
- Token storage: <cookie/header/localStorage hint from code>
- Token expiry: <configured TTL>
- Refresh token support: <yes/no>
- Applied to: <which routes/endpoints>
```

---

#### Section 2: Authorization Model [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities` for permission/role/authorize patterns, identify the authorization model.

**LLM-only path**: Identify authorization approach:
- **RBAC** (Role-Based): role checks in middleware or decorators (`@roles('admin')`, `hasRole(user, 'editor')`)
- **ABAC** (Attribute-Based): policy checks against resource attributes
- **ACL**: per-resource permission lists
- **Ownership checks**: `if resource.owner_id !== user.id` patterns

List all roles/permissions found in code. Note any endpoints that perform state-modifying operations without authorization checks.

---

#### Section 3: Sensitive Data Handling [DATA SOURCE: llm-only]

Identify how sensitive data is managed:

**Passwords**: Look for password hashing (bcrypt, argon2, scrypt, pbkdf2). Flag any SHA1/MD5 usage for password hashing (insecure). Note salting strategy.

**PII / Personal Data**: Look for fields named `email`, `phone`, `ssn`, `dob`, `address`, `credit_card`. Note whether they are encrypted at the field level, masked in logs, or redacted in responses.

**Secrets management**: Check how secrets are loaded:
- Environment variables (`os.environ`, `process.env`) — acceptable
- Config files checked into git (`.env` committed, `config.py` with hardcoded secrets) — risk
- Secret managers (AWS Secrets Manager, Vault, GCP Secret Manager) — ideal

**Logging safety**: Scan logging statements for potential PII leakage (logging request bodies, logging user objects).

---

#### Section 4: Input Validation and Injection Prevention [DATA SOURCE: llm-only]

Assess protection against common injection attacks:

- **SQL injection**: Are all queries parameterized? Search for f-string/concatenated SQL patterns. Raw query strings without parameter binding are high-risk.
- **XSS**: Are HTML responses escaped? Template auto-escaping configured? `dangerouslySetInnerHTML` usage?
- **Command injection**: `subprocess`, `os.system`, `exec`, `shell=True` with user input? Flag each occurrence.
- **Path traversal**: File operations using user-supplied filenames without sanitization?
- **SSRF**: HTTP client calls where URL is derived from user input?

For each vulnerability pattern found, record:
| Vulnerability | File | Line Pattern | Severity (High/Med/Low) | Recommendation |
|--------------|------|-------------|------------------------|---------------|

---

#### Section 5: Security Headers and Transport [DATA SOURCE: llm-only]

Check for:
- **HTTPS enforcement**: Redirect HTTP → HTTPS, HSTS header configuration
- **Security headers**: `helmet.js`, `django-csp`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`
- **CORS configuration**: Allowed origins — wildcard `*` is a risk for authenticated APIs
- **CSRF protection**: CSRF tokens for state-changing form/API calls
- **Rate limiting**: Request rate limiting middleware (`express-rate-limit`, `slowapi`, `rack-attack`)

---

#### Section 6: Security Posture Summary

Rate overall security posture: **Strong** / **Adequate** / **Needs Attention** / **Critical Gaps**

Provide a prioritized remediation list:
| Priority | Finding | File/Location | Effort | Risk if Unaddressed |
|----------|---------|--------------|--------|-------------------|

Note which issues must be resolved before any new feature development proceeds (P0 blockers).

Set `data_source` in frontmatter to `graph` if MCP auth entity search was used, otherwise `llm-only`.
