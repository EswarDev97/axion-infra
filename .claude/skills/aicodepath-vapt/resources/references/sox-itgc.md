# SOX IT General Controls (ITGCs) — Code-Level Reference

Regulation: Sarbanes-Oxley Act, Section 404 (Management Assessment of Internal Controls)
Scope: All IT systems that support financial reporting (general ledger, ERP, reporting tools, data pipelines).

---

## ITGC Domain 1 — Change Management Controls

These are the most code-relevant SOX controls. Auditors look for:

| Control Area | Code-Level Requirement | Audit Evidence |
|-------------|----------------------|---------------|
| **Segregation of Duties** | Developers cannot promote their own code to production; separate developer, reviewer, and deployer roles enforced in CI/CD pipeline permissions | Branch protection rules requiring reviewer approval; CI/CD deploy permissions restricted to ops role |
| **Change Authorization** | All code changes to financial systems require documented approval before deployment | Pull request approval audit trail; CAB approval records for significant changes |
| **Four-Eyes on Financial Logic** | Peer review mandatory for all changes to: GL interfaces, financial calculations, reporting engines, audit trail components | Code review history showing second reviewer for financial code |
| **Regression Testing** | Documented test results for all changes to financial systems; automated test suite must pass before production deployment | CI/CD pipeline logs showing test execution; test result archives |
| **Emergency Change Procedure** | Break-glass emergency change with retroactive authorization; full audit trail of who changed what and why | Emergency change log; post-hoc review records |
| **Version Control** | All source code in version control with tagged releases; ability to roll back any change | Git history; tagged releases; rollback procedure tested |

---

## ITGC Domain 2 — Logical Access Controls

| Control Area | Code-Level Requirement | Audit Evidence |
|-------------|----------------------|---------------|
| **User Access Management** | Application enforces RBAC; access reviews conducted every 90 days; automated deprovisioning when users leave | RBAC implementation in code; access review records; offboarding automation |
| **Privileged Access** | Separate privileged accounts for admin functions; no shared admin credentials; all privileged access logged | Admin account separation in code; privileged action audit log |
| **Password Controls** | Application enforces: minimum 12 chars, complexity, history (5+ previous), expiry (90 days max) | Password policy code; policy enforcement tests |
| **MFA for Financial Systems** | MFA required for all access to financial applications and reporting systems | MFA integration code; enforcement verification |

---

## ITGC Domain 3 — Computer Operations Controls

| Control Area | Code-Level Requirement | Audit Evidence |
|-------------|----------------------|---------------|
| **Batch Job Integrity** | Automated financial processes have: execution logs, exception handling, completion notification, reconciliation checks | Batch job code with logging; exception handler tests |
| **Backup and Recovery** | Financial data backup procedures; tested restoration; RTO/RPO met by application design | Backup procedure docs; restore test records |
| **Incident Management** | Security incidents affecting financial data trigger SOX incident response; audit trail preserved | Incident response procedure; drill records |

---

## ITGC Domain 4 — IT Security Controls

| Control Area | Code-Level Requirement | Audit Evidence |
|-------------|----------------------|---------------|
| **Audit Logging** | All access to financial data logged with: userId, timestamp, action, record affected; logs immutable and retained per policy (typically 7 years) | Audit log implementation; retention policy |
| **Encryption** | Financial data encrypted at rest and in transit; key management documented and tested | Encryption config; key rotation procedure |
| **Vulnerability Management** | Regular scanning of financial application components; patch management with documented SLAs | Scan reports; patch records |
| **Penetration Testing** | Annual application penetration test of financial systems; findings tracked to remediation | Pentest report; remediation records |

---

## SOX-Specific Code Anti-Patterns

These patterns will fail a SOX audit:

```
❌ Developer merges their own PR to main (no reviewer)
❌ Same person has deploy access and write access to main branch
❌ Financial calculation changes deployed without test evidence
❌ No audit log on financial record modifications
❌ Admin user can disable audit logging in the application
❌ Emergency change made with no documented reason
❌ Hardcoded financial thresholds changed without change ticket
❌ Shared service account used for financial system access
```

---

## VAPT Finding → SOX ITGC Control Mapping

| Finding | SOX ITGC Domain | Impact |
|---------|----------------|--------|
| No branch protection / no reviewer required | Change Management — Segregation of Duties | Material weakness risk |
| Developer has production deploy access | Change Management — Segregation of Duties | Material weakness risk |
| No audit log on financial data | IT Security — Audit Logging | Significant deficiency |
| Shared admin credentials | Logical Access — Privileged Access | Significant deficiency |
| No MFA for financial system | Logical Access — MFA | Significant deficiency |
| No test evidence for financial changes | Change Management — Regression Testing | Significant deficiency |
| Hardcoded credentials in financial app | IT Security | Material weakness risk |
| No user access review process | Logical Access — User Access Management | Significant deficiency |
| Debug mode exposes financial data | IT Security | Significant deficiency |
| No incident response for financial breaches | Computer Operations | Significant deficiency |
