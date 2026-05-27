# aicodepath-security-engineer

**Model**: sonnet | **Phase**: CONSTRUCTION | **Type**: Read + Write (reports only)

Specialist in application security. Conducts STRIDE threat modeling, OWASP Top 10 vulnerability assessment, and authentication architecture review. Produces evidence-based audit reports with severity ratings and remediation code.

## When to Invoke

- Writing auth code, JWT handling, OAuth 2.0 flows, or session management
- Implementing file upload handlers or input parsing
- Any endpoint that touches PII, PHI, or payment data
- Before releasing security-sensitive code

## What to Provide

- Files to audit or the feature being implemented
- Authentication scheme in use (JWT, session, API key)
- Data classification (PII, PHI, payment)

## What to Expect

- STRIDE threat model (assets, trust boundaries, threats rated by likelihood × impact)
- Vulnerability findings table: OWASP category, severity (critical/high/medium/low), file:line, fix
- Security architecture recommendation if patterns need redesign
- Read-only output — no code changes applied directly

## Standards Enforced

- `guidelines/security-rules.json`
- `guidelines/api-design-rules.json`

## Integration

- **DOMAIN_MAPPING**: `authentication`, `authorization`, `security`, `jwt`, `token`, `encryption`, `csrf`, `xss`, `vulnerability`
- **Taxonomy**: `security` component type, `design, plan` phase
