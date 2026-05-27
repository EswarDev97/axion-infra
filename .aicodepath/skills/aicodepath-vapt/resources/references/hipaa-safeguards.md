# HIPAA Technical Safeguards — Code-Level Reference

Regulation: 45 CFR §164.312
Scope: Any application that creates, receives, maintains, or transmits ePHI.

---

## 164.312(a)(1) — Access Control Standard

| Spec | Type | Code-Level Check |
|------|------|-----------------|
| Unique user identification | **Required** | Every user has a unique ID; no shared accounts; per-user auth at all application layers |
| Emergency access procedure | **Required** | Break-glass mechanism coded with full audit logging and retroactive review |
| Automatic logoff | Addressable | Session timeout after inactivity; token invalidation on expiry; `maxInactiveInterval` set |
| Encryption and decryption | Addressable | ePHI encrypted at rest using AES-256; key management separate from data storage |

**Evidence required:** Code showing unique user IDs enforced; session timeout config; encryption library usage.

## 164.312(b) — Audit Controls Standard

| Spec | Type | Code-Level Check |
|------|------|-----------------|
| Audit mechanisms | **Required** | Application-layer audit log records: userId, timestamp, action, ePHI resource ID, outcome for every ePHI access/modification |

**Evidence required:** Audit log implementation in code; log schema showing required fields; tamper-evident storage config.

## 164.312(c)(1) — Integrity Standard

| Spec | Type | Code-Level Check |
|------|------|-----------------|
| Authenticate ePHI | Addressable | HMAC or hash-based integrity checks on stored ePHI; checksums verified on retrieval; detect unauthorized alteration |

**Evidence required:** Integrity check implementation; error handling when integrity fails.

## 164.312(d) — Authentication Standard

| Spec | Type | Code-Level Check |
|------|------|-----------------|
| Person/entity authentication | **Required** | Identity verified before any ePHI access; MFA for remote access; time-limited tokens; auth state validated on every request |

**Evidence required:** Auth middleware applied to all ePHI routes; token expiry configuration; MFA integration code.

## 164.312(e)(1) — Transmission Security Standard

| Spec | Type | Code-Level Check |
|------|------|-----------------|
| Integrity controls | Addressable | TLS 1.2+ for all ePHI in transit; certificate validity verified in API calls; no `rejectUnauthorized: false` |
| Encryption | Addressable | End-to-end encryption for ePHI transmission; no ePHI in URL query strings; WSS for real-time features |

**Evidence required:** TLS configuration; HTTP → HTTPS enforcement; no ePHI in GET query parameters.

---

## Application-Level HIPAA Code Checks

| Category | Check |
|----------|-------|
| **Minimum Necessary** | API responses return only ePHI fields required for the requesting role — no over-fetching |
| **No ePHI in Logs** | Grep for health record fields (diagnosis, SSN, MRN, DOB) in log statements — none permitted |
| **No ePHI in URLs** | GET requests must not carry ePHI in query parameters (logged by servers, proxies, browsers) |
| **Input Validation** | All ePHI input fields validated server-side to prevent injection into health records |
| **RBAC Enforcement** | Role-based access aligned to minimum necessary standard; clinicians see only their patients' data |
| **Secure Deletion** | ePHI deletion routine purges from all stores: primary DB, cache, search index, backups flagged |
| **No Debug Exposure** | No ePHI in stack traces, debug output, or error responses |

---

## VAPT Finding → HIPAA Control Mapping

| Finding | HIPAA Control |
|---------|--------------|
| No session timeout | 164.312(a)(1) Automatic Logoff |
| No ePHI encryption at rest | 164.312(a)(1) Encryption |
| Missing audit log | 164.312(b) |
| No integrity checks on ePHI | 164.312(c)(1) |
| No MFA for remote access | 164.312(d) |
| TLS disabled / `rejectUnauthorized: false` | 164.312(e)(1) |
| ePHI in URL query params | 164.312(e)(1) |
| Hardcoded credentials | 164.312(a)(1) Unique User ID |
| No RBAC on ePHI endpoints | 164.312(a)(1) Access Control |
| ePHI in log files | 164.312(b) Audit Controls |
