# IRDAI Insurance Vendor Security Assessment Checklist

Common security questionnaire items insurance companies send to technology vendors.
Load when user requests vendor self-assessment responses or questionnaire help.

---

## Section 1 — Data Handling & Protection

| Questionnaire Item | Suggested Answer | Our Check |
|-------------------|-----------------|-----------|
| Do you encrypt policyholder data at rest? | "Yes — AES-256 encryption for all PII fields (Aadhaar, PAN, vehicle data). Verified in Check 15." | Check 15 |
| Do you mask PII in application logs? | "Yes — phone numbers masked to last 4 digits, Aadhaar to last 4, PAN never logged. Enforced via logging policy. Evidence: grep results in VAPT report Section 8." | Check 8, 15 |
| How long do you retain audit logs? | "Minimum 180 days rolling — exceeds IRDAI requirement. Log rotation configured in [config file]. Evidence in VAPT report." | Check 8 |
| Do you transmit data over encrypted channels only? | "Yes — TLS 1.2+ enforced end-to-end. Internal service mTLS configured. Evidence: Check 14 results." | Check 14 |

---

## Section 2 — Access Control

| Questionnaire Item | Suggested Answer | Our Check |
|-------------------|-----------------|-----------|
| Do you enforce MFA for privileged access? | "Yes — MFA enforced for all admin and production access. Authentication evidence in VAPT Check 3." | Check 3 |
| Is access controlled by least privilege? | "Yes — IAM roles use minimal permissions. GCP service accounts have no Editor/Owner roles. Evidence: Check 10 results." | Check 10 |
| Do you have tenant isolation for multi-tenant data? | "Yes — all queries scoped by tenant_id with Row-Level Security. Evidence: Check 4, 13, 20 results." | Check 4, 13, 20 |
| How do you manage API access between your system and insurers? | "Webhook endpoints use HMAC signature verification. All insurer API calls use signed requests. Evidence: Check 20." | Check 20 |

---

## Section 3 — Encryption

| Questionnaire Item | Suggested Answer | Our Check |
|-------------------|-----------------|-----------|
| What encryption algorithms do you use? | "AES-256 at rest, TLS 1.2+ in transit. No MD5 or SHA1 for security-sensitive operations. Evidence: Check 5 results." | Check 5 |
| Do you use secure key management? | "Encryption keys managed via GCP Secret Manager / Cloud KMS. No hardcoded keys. Evidence: Check 1 results." | Check 1 |
| Is your TLS certificate management automated? | "Yes — certificate auto-renewal configured. No expired certs. Evidence: Check 14." | Check 14 |

---

## Section 4 — Incident Response

| Questionnaire Item | Suggested Answer | Our Check |
|-------------------|-----------------|-----------|
| Do you have an incident response plan? | "Yes — IR runbook documented. Error tracking (Sentry) and alerting (Cloud Monitoring) configured. Evidence: Check 17." | Check 17 |
| What is your notification timeline for data breaches? | "CERT-IN within 6 hours, insurance client within 24 hours — aligned with IRDAI requirements." | Check 17 |
| Do you have health monitoring and alerting? | "Yes — health check endpoints (/health, /ready) and Cloud Monitoring alerts configured. Evidence: Check 17." | Check 17 |

---

## Section 5 — BCP / Disaster Recovery

| Questionnaire Item | Suggested Answer | Our Check |
|-------------------|-----------------|-----------|
| Do you have automated database backups? | "Yes — Cloud SQL automated backups with encryption enabled. Retention: [N] days. Evidence: Check 18." | Check 18 |
| Is backup data encrypted? | "Yes — backup encryption enabled. Evidence: Check 18 results in VAPT report." | Check 18 |
| What is your RTO / RPO? | "[To be filled from DR runbook] — document reference: [link]" | Check 18 |

---

## Section 6 — Audit Logging

| Questionnaire Item | Suggested Answer | Our Check |
|-------------------|-----------------|-----------|
| Do you maintain audit trails for business operations? | "Yes — all job status transitions logged with user_id, tenant_id, job_id, old_status, new_status, timestamp. Evidence: Check 8." | Check 8 |
| Are audit logs tamper-evident? | "Logs written to Cloud Logging (append-only, tamper-evident). Evidence: infrastructure config review." | Check 8 |
| How do you handle log access control? | "Log access restricted to security team. Application does not have write-delete access to its own logs." | Check 8 |

---

## Section 7 — Change Management

| Questionnaire Item | Suggested Answer | Our Check |
|-------------------|-----------------|-----------|
| Do you enforce code review before production deployments? | "Yes — branch protection rules require minimum 1 reviewer. No direct push to main. Evidence: Check 19 results." | Check 19 |
| Is automated testing required before deployment? | "Yes — CI/CD pipeline requires test pass before merge. Evidence: Check 19." | Check 19 |
| How do you manage third-party dependencies? | "Automated dependency audit in CI pipeline (npm audit / pip-audit). CVE findings block deployment. Evidence: Check 7." | Check 7 |

---

## Generating Self-Assessment Responses

When generating vendor questionnaire responses:
1. Run the relevant checks from the VAPT report
2. Reference specific evidence: "Evidence: Section [N] of VAPT report dated [DATE]"
3. For gaps: "Gap identified — remediation planned by [DATE] per IRDAI 2-month timeline"
4. Never claim compliance for checks that have open findings
