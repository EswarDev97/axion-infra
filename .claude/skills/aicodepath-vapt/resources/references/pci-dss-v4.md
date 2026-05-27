# PCI DSS v4.0 — Code-Level Controls Reference

Effective: March 2024 (full compliance deadline March 31, 2025)
Scope: Any application that stores, processes, or transmits cardholder data (CHD).

---

## Requirement 6 — Develop and Maintain Secure Systems and Software

| Req ID | Requirement | Code-Level Check |
|--------|-------------|-----------------|
| 6.2.1 | Bespoke software developed per secure development guidelines | Written secure coding standards covering OWASP Top 10 exist and are followed |
| 6.2.2 | Developers trained on security techniques relevant to their role | Training records exist; web devs trained on injection, XSS, auth flaws |
| 6.2.3 | Software reviewed prior to production release | SAST scan or peer code review with security focus — documented evidence required |
| 6.2.3.1 | Manual code reviews use a different, trained reviewer | Four-eyes principle enforced in source control (branch protection requiring reviewer) |
| 6.2.4 | Techniques to prevent OWASP Top 10 in bespoke software | Every OWASP Top 10 category addressed in code: parameterized queries, output encoding, RBAC, etc. |
| 6.3.2 | Inventory of bespoke software maintained | SBOM exists: `package-lock.json`, `requirements.txt`, or equivalent committed to source control |
| 6.3.3 | All system components protected from known vulnerabilities | No Critical/High CVEs in dependencies; patching SLA: Critical ≤30 days, High ≤90 days |
| 6.4.1 | Public-facing apps protected against attacks | WAF in place OR quarterly application penetration test documented |
| 6.4.2 | Automated solution to detect and prevent web-based attacks | WAF or RASP actively blocking (not just alerting) |
| 6.5.3 | Pre-production environments not used in production | No real cardholder data in dev/staging environments |
| 6.5.6 | All identified security vulnerabilities addressed | Findings tracked with CVSS scores; remediated or risk-accepted with compensating controls |

## Requirement 8 — Identify Users and Authenticate Access

| Req ID | Requirement | Code-Level Check |
|--------|-------------|-----------------|
| 8.2.1 | No generic/shared accounts | Every user has a unique identifier in the application; no shared service accounts in code |
| 8.2.2 | Passwords/credentials not hardcoded | No credentials in source code; all from env vars or secrets manager |
| 8.3.6 | Passwords ≥12 chars with complexity | Password policy enforced in application code |
| 8.4.2 | MFA for all non-console admin access | MFA enforced in code for admin/privileged operations |
| 8.6.1 | System/application accounts managed via policy | Service account credentials rotated; not stored in code |

## Requirement 10 — Log and Monitor All Access to System Components

| Req ID | Requirement | Code-Level Check |
|--------|-------------|-----------------|
| 10.2.1 | Log all individual user access to CHD | Application-layer audit log: userId, timestamp, action, resource accessed |
| 10.2.2 | Log all actions by individuals with root/admin privileges | All privileged operations logged with full identity context |
| 10.2.3 | Log access to all audit trails | Logs are append-only; access to log storage is itself logged |
| 10.2.5 | Log all invalid logical access attempts | Failed auth events logged with IP address |
| 10.2.7 | Log creation/deletion of system-level objects | Schema changes, user account changes logged |
| 10.3.2 | Audit log files protected from unauthorized modifications | Logs stored in tamper-evident storage; no application-level delete capability |

## Requirement 11 — Test Security of Systems and Networks Regularly

| Req ID | Requirement | Code-Level Check |
|--------|-------------|-----------------|
| 11.3.1 | Internal penetration testing annually | Annual application-layer pentest following PTES or OWASP methodology; documented report |
| 11.3.2 | External penetration testing annually | External pentest from internet-facing perspective; documented report |
| 11.4.7 | Multi-tenant service providers support customers' pentest | Pentest results shareable with customers on request |
| 11.6.1 | Tamper-detection for payment pages | Script integrity monitoring on checkout JS; SRI hashes or CSP nonces on payment page scripts |

## VAPT Finding → PCI DSS Control Mapping

| Finding | PCI DSS Control |
|---------|----------------|
| Hardcoded secret | 8.2.2, 6.2.4 |
| SQL Injection | 6.2.4 |
| Broken Authentication | 8.3.x, 8.4.2 |
| Missing MFA | 8.4.2 |
| Vulnerable dependency (Critical) | 6.3.3 |
| No code review process | 6.2.3 |
| Debug mode in production | 6.2.4 |
| No audit logging | 10.2.x |
| No penetration test evidence | 11.3.x |
| CORS wildcard | 6.2.4, 6.4.2 |
| Plaintext password storage | 8.2.2, 6.2.4 |
