# VAPT Check Engine — All 20 Checks

Loaded at Step 2. Contains full grep patterns, bash commands, and check logic.
Do NOT load unless running checks — this file is context-heavy.

---

## Tier 1 — Application Security (Checks 1–9)

### Check 1 — Secrets & Credential Exposure
**WSTG-CONF-05 | OWASP A02 | PCI DSS 8.2.1 | NIST IA-5(7)**

Grep for:
- Hardcoded passwords: `password\s*[:=]\s*['"][^'"$]{8,}['"]`
- API keys: `(api_key|apiKey|API_KEY)\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]`
- AWS credentials: `(AKIA|ASIA)[A-Z0-9]{16}`
- JWT secrets: `(jwt_secret|JWT_SECRET)\s*[:=]\s*['"][^'"]{20,}['"]`
- DB connection strings: `(postgres|mysql|mongodb)://[^:]+:[^@]+@`
- Private keys: `-----BEGIN.*PRIVATE KEY-----`
- GCP service account JSON: `"type"\s*:\s*"service_account"`

Escape hatch: `# vapt: allow-secret` on same line = intentional test fixture, skip.

Severity: **CRITICAL** for any match in production code.

### Check 2 — Injection Vulnerabilities
**WSTG-INPV-05 (SQLi), WSTG-INPV-01 (XSS), WSTG-INPV-12 (CMDi) | OWASP A03**

- **SQL Injection**: string-concatenated SQL — template literals or `+` in queries
  Pattern: `` `SELECT|INSERT|UPDATE|DELETE`.*\$\{ `` or `"SELECT" + variable`
- **Command Injection**: `exec|spawn|execSync` with template literals or user input
- **XSS**: `.innerHTML =`, `document.write(`, `dangerouslySetInnerHTML` without sanitization
- **Template Injection**: Jinja2/Twig `{{user_input}}` patterns
- **NoSQL Injection**: MongoDB `$where`, unvalidated `req.body` passed to `find()`

Check: Are all DB queries using parameterized statements / ORM methods?
Check: Is all user input sanitized before rendering to DOM?

### Check 3 — Broken Authentication
**WSTG-ATHN-01 to -10 | OWASP A07 | PCI DSS 8.x | HIPAA 164.312(d)**

- Password storage: Is bcrypt/argon2/scrypt used? Flag MD5, SHA1, or plaintext storage
- Session cookies: `secure: true`, `httpOnly: true`, `sameSite` all required
- JWT: algorithm pinned (not `alg: none`), expiry set, signature verified
- Token storage: JWTs in `localStorage` = HIGH risk (XSS-stealable); flag and recommend httpOnly cookies
- Brute force: Is rate limiting / lockout implemented on auth endpoints?
- MFA: Is MFA enforced for privileged access? (Required: PCI DSS 8.4, HIPAA addressable)
- Session timeout: Is `maxInactiveInterval` configured?

### Check 4 — Broken Access Control
**WSTG-AUTHZ-01 to -04 | OWASP A01 | NIST AC-3 | PCI DSS 6.2.4**

- IDOR: Are resource IDs validated against the authenticated user's ownership before returning data?
- Role trust: Is `role` or `isAdmin` ever read from `req.body`? (BLOCK — must come from token/DB)
- Mass assignment: Is `req.body` passed directly to `Model.create()` or `Model.update()`?
- Deny-by-default: Do protected routes have explicit auth middleware?
- Sequential IDs: Exposed integer IDs on user-facing resources enable enumeration — recommend UUIDs

### Check 5 — Cryptographic Failures
**WSTG-CRYP-01 to -04 | OWASP A02 | PCI DSS 4.2.1 | NIST SC-13 | ISO A.8.24**

- Weak algorithms: MD5 or SHA1 for security-sensitive hashing = BLOCK
- Hardcoded IV: `iv = "fixed_value"` = ERROR (must be randomly generated)
- Disabled TLS: `rejectUnauthorized: false` or `NODE_TLS_REJECT_UNAUTHORIZED=0` = CRITICAL
- HTTP for sensitive routes: `http://` on login/token/payment endpoints = CRITICAL
- Weak ciphers: DES, RC4, 3DES in cipher suite configs = ERROR
- Custom crypto: Any homemade encryption/hashing = BLOCK

### Check 6 — Security Misconfiguration
**WSTG-CONF-01 to -11 | OWASP A05 | NIST CM-6**

- Missing security headers (scan HTTP server config files):
  - `Strict-Transport-Security` — required
  - `Content-Security-Policy` — required (no `unsafe-inline` without nonce)
  - `X-Frame-Options: DENY` — required
  - `X-Content-Type-Options: nosniff` — required
  - `Referrer-Policy` — recommended
- CORS wildcard `*` with credentials = CRITICAL
- Debug mode enabled: `DEBUG=true`, `FLASK_DEBUG=1` in non-dev config = ERROR
- Stack traces returned to clients: `res.json(err.stack)` = ERROR
- Privileged containers: `privileged: true` in Docker/K8s config = ERROR
- Default credentials in config files = CRITICAL

### Check 7 — Vulnerable Dependencies
**WSTG-CONF-09 | OWASP A06 | PCI DSS 6.3.3 | NIST SI-2 | ISO A.8.8**

Run dependency audit — try all fallbacks before reporting as clean:
```bash
# Node.js (try in order, use first that succeeds)
npm audit --json 2>/dev/null | head -100
# fallback if no npm:
cat package.json 2>/dev/null | grep -E '"[^"]+"\s*:\s*"[*^~]' | head -20

# Python (try in order)
pip-audit --format json 2>/dev/null | head -100 || \
  safety check 2>/dev/null | head -30 || \
  cat requirements.txt 2>/dev/null | head -30
```

**CRITICAL:** Show actual command output in the conversation — never accept verbal claims that it came back clean.

If ALL audit commands fail: report "dependency audit tools unavailable — manual SCA scan required" as MEDIUM. Never silently skip this check.

Flag: any dependency with CVE severity Critical or High.
Check: Is there an SBOM (`package-lock.json`, `requirements.txt`, `go.sum`) committed?
Check: Any unpinned wildcard versions (`"*"`, `"latest"`) in package manifests?

### Check 8 — Security Logging Failures
**WSTG-ERRH-01 to -02 | OWASP A09 | PCI DSS 10.x | HIPAA 164.312(b) | NIST AU-2 | IRDAI 180-day retention**

- Are auth events (login, logout, failed login) logged?
- Are access control failures logged?
- Is PII / sensitive data excluded from logs? Grep: `log.*password`, `log.*token`, `log.*ssn`, `log.*aadhaar`, `log.*pan_number`, `log.*phone`
- Are log entries structured (JSON) with: userId, timestamp, action, resource, outcome?
- IRDAI requirement: Business operation audit trails must be retained 180 days minimum. Check for log rotation config — flag anything below 180 days.
- Are stack traces returned to clients (audit response handlers for `.stack` exposure)?

### Check 9 — SSRF & Input Validation
**WSTG-INPV-19 (SSRF) | OWASP A10 | NIST SI-10 | PCI DSS 6.2.4**

- SSRF: Is `fetch(userInput)` or `axios.get(req.body.url)` used without URL allowlist validation?
- Cloud metadata: Is access to `169.254.169.254` (GCP/AWS metadata) blocked?
- File upload: Are file type restrictions enforced? Executable uploads blocked?
- Deserialization: `pickle.loads`, `ObjectInputStream`, `yaml.load` without SafeLoader = ERROR
- Server-side input validation: Is all input validated server-side (not just client-side)?

---

## Tier 2 — Infrastructure & Platform Security (Checks 10–14)

### Check 10 — GCP Infrastructure Config
**IRDAI Domain 5 (Network Security) | CERT-IN Cloud Security**

Scan Terraform / deployment YAML / GCP config files:
- Storage bucket ACLs: `allUsers` or `allAuthenticatedUsers` read/write access = CRITICAL
- Cloud SQL: SSL enforcement disabled (`require_ssl: false`) = HIGH
- VPC firewall rules: `0.0.0.0/0` ingress on non-443/80 ports = HIGH
- IAM roles: `roles/owner` or `roles/editor` granted to service accounts = HIGH (prefer minimal roles)
- Cloud Run / App Engine: secrets in environment variables (not Secret Manager) = HIGH
- Audit logging disabled on projects = MEDIUM

### Check 11 — Container & Deployment Security
**IRDAI Domain 17 (Configuration Management) | CERT-IN Container Security**

Scan Dockerfiles, docker-compose.yml, Cloud Run YAML:
- Dockerfile: `USER root` with no subsequent `USER` switch = HIGH
- Base image unpinned (using `latest` tag) = MEDIUM
- Secrets in `ARG` or `ENV` instructions = CRITICAL
- docker-compose: `privileged: true` = CRITICAL; exposed sensitive ports (5432, 6379, 27017 on `0.0.0.0`) = HIGH
- No resource limits (`mem_limit`, `cpus`) = MEDIUM (DoS risk)
- Security contexts missing in K8s / Cloud Run (`runAsNonRoot: true` not set) = MEDIUM

### Check 12 — API Gateway & Network Config
**IRDAI Domain 5 (Network Security) | PCI DSS 6.2.4**

Scan Kong config files, nginx/Caddy configs, API spec:
- Rate limiting: not configured on public-facing endpoints = HIGH
- Auth plugins: no auth plugin on routes that handle PII = CRITICAL
- TLS termination: HTTP (non-TLS) upstream from gateway = HIGH
- CORS: wildcard `*` with `credentials: true` = CRITICAL
- API versioning: no version in path (`/api/v1/`) = MEDIUM
- Request size limits not set (potential DoS / file upload bypass) = MEDIUM

### Check 13 — Database Security Config
**IRDAI Domain 14 (Vulnerability Management) | CERT-IN Database Security**

Scan SQLAlchemy DSNs, migration files, DB config:
- Connection string: no SSL mode (`?sslmode=require` missing for Cloud SQL) = HIGH
- Row-Level Security (RLS): multi-tenant tables without RLS policies = CRITICAL
- Migration files: columns storing PII without encryption annotation = HIGH
- Backup config: no reference to automated backup or backup encryption = MEDIUM
- DB user: application using `root` or superuser credentials = HIGH

### Check 14 — TLS & Certificate Config
**PCI DSS 4.2.1 | IRDAI Domain 4 (Cryptographic Controls) | NIST SC-8**

Scan service configs, nginx/Caddy, Cloud Run settings:
- TLS minimum version: TLSv1.0 or TLSv1.1 allowed = HIGH (require TLS 1.2+ minimum)
- `rejectUnauthorized: false` in any service-to-service call = CRITICAL
- Internal service mTLS: services calling each other over plain HTTP = HIGH
- HTTP→HTTPS redirect: not enforced in load balancer / ingress = HIGH
- Certificate pinning: hardcoded certificate hashes (brittle, rotation breaks app) = MEDIUM note

---

## Tier 3 — IRDAI Compliance & Process (Checks 15–20)

### Check 15 — Data Classification & PII Handling
**IRDAI Domain 6 (Data Classification) | GDPR Art. 25**

Grep for PII fields in code — flag any that appear in logs, API responses without masking, or error messages:
- Insurance PII: `vehicle_registration`, `chassis_number`, `engine_number`, `policy_number`
- Personal identifiers: `aadhaar`, `pan_number`, `driving_license`, `passport_number`
- Contact: `phone`, `mobile`, `email` (mask in logs — last 4 digits / first 2 chars)

Check:
- Encrypted at rest: columns storing above fields should have encryption annotation or use encrypted column type
- Masked in logs: grep `log.*aadhaar`, `log.*pan`, `logger.*phone` — any match = HIGH
- Masked in API responses: fields like `aadhaar` should never be returned in full in list endpoints
- Present in error messages: `except.*aadhaar`, `raise.*phone` — any match = HIGH

### Check 16 — File Upload & Storage Security
**IRDAI Domain 14 | OWASP A08**

Scan file upload endpoints and storage config:
- File type validation: extension-only check (`.jpg`) without magic byte validation = HIGH
- Size limits: no `MAX_CONTENT_LENGTH` or equivalent = MEDIUM
- Virus scanning: no reference to ClamAV, VirusTotal, or cloud malware scanning = MEDIUM
- Bucket permissions: Cloud Storage bucket with public read = CRITICAL
- Signed URL expiry: signed URLs with no expiry or expiry > 1 hour = MEDIUM
- EXIF stripping: photo uploads without EXIF metadata stripping before storage — GPS coordinates leak in inspection photos = HIGH (IRDAI PII concern)

### Check 17 — Incident Response Readiness
**IRDAI Domain 8 (Incident Management)**

Check for presence of:
- Error reporting service: Sentry, Rollbar, or equivalent configured = PASS; absent = MEDIUM
- Health check endpoints: `/health`, `/ready` endpoint present = PASS; absent = MEDIUM
- Circuit breaker: `tenacity`, `resilience4j`, `hystrix`, or `opossum` in dependencies = PASS; absent = MEDIUM
- Alerting config: references to PagerDuty, Opsgenie, Cloud Monitoring alerts = PASS; absent = MEDIUM

Flag absence of all four as HIGH — IRDAI requires documented incident response capability.
IRDAI notification requirement: CERT-IN within 6 hours, IRDAI within 24 hours of incident discovery.

### Check 18 — Backup & Recovery Config
**IRDAI Domain 19 (Backup) | IRDAI Domain 9 (BCP/DR)**

Scan for:
- DB backup: Cloud SQL automated backup enabled in Terraform/config = PASS; absent = MEDIUM
- Backup encryption: backup encryption enabled = PASS; absent = HIGH
- Retention policy: backup retention < 30 days = MEDIUM; no reference = MEDIUM
- DR documentation: reference to DR runbook or RTO/RPO in codebase = PASS; absent = LOW

### Check 19 — Change Management & SDLC
**IRDAI Domain 16 (Change Management) | CERT-IN Governance**

Scan `.github/`, CI/CD config files:
- Branch protection: `main`/`master` branch protection rules (require PR, no direct push) = PASS; absent = MEDIUM
- CI/CD pipeline: test stage required before merge = PASS; absent = MEDIUM
- Automated tests before merge: `required_status_checks` including test run = PASS; absent = MEDIUM
- Code review enforcement: `required_reviewers >= 1` on main = PASS; absent = MEDIUM
- No secrets in CI env: grep CI config for hardcoded API keys = CRITICAL if found

### Check 20 — Third-Party & Vendor Security
**IRDAI Domain 10 (Third-Party Risk) | IRDAI Domain 13 (Supply Chain)**

Scan external API calls, webhook handlers, payment integrations:
- External HTTP calls: no timeout configured (`axios.get(url)` without `timeout`) = MEDIUM
- Webhook endpoints: no signature verification (HMAC) on incoming webhooks = HIGH
- Payment gateway: Razorpay webhook — `validateWebhookSignature()` called before processing = PASS; absent = CRITICAL
- Franchisee / tenant data: multi-tenant queries without `tenant_id` filter = CRITICAL (data leak between tenants)
- Insurance insurer webhooks: no HMAC signing on insurer callback endpoints = HIGH
- Third-party SDK: SDK initialized with hardcoded API key vs environment variable = CRITICAL

---

## OWASP ASVS Assurance Level Mapping

| Check Category | ASVS L1 | ASVS L2 | ASVS L3 |
|----------------|---------|---------|---------|
| Secrets in code (Check 1) | ✓ | ✓ | ✓ |
| SQL Injection (Check 2) | ✓ | ✓ | ✓ |
| Broken Auth (Check 3) | ✓ | ✓ | ✓ |
| IDOR / BAC (Check 4) | ✓ | ✓ | ✓ |
| Weak Crypto (Check 5) | ✓ | ✓ | ✓ |
| Security Headers (Check 6) | ✓ | ✓ | ✓ |
| Vulnerable Deps (Check 7) | ✓ | ✓ | ✓ |
| Logging Failures (Check 8) | — | ✓ | ✓ |
| SSRF (Check 9) | — | ✓ | ✓ |
| Infrastructure (Checks 10–14) | — | ✓ | ✓ |
| IRDAI Compliance (Checks 15–20) | — | — | ✓ |
| Threat Modeling Evidence | — | — | ✓ |
| Penetration Test Evidence | — | ✓ | ✓ |
