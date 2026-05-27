# VAPT Compliance Evidence Report

**Report Date:** {DATE}
**Scan Scope:** {SCOPE_PATHS}
**Compliance Profile(s):** {PROFILES}
**Conducted by:** AICodePath VAPT Skill v2.0
**Testing Methodology:** White-box Static Application Security Testing (SAST)
**OWASP Testing Guide Version:** WSTG v4.2
**ASVS Assurance Level:** {ASVS_LEVEL}
**Cycle:** {CYCLE_NUMBER} of {TOTAL_CYCLES}
**CERT-IN Readiness Score:** {CERTIN_SCORE}/100

---

## Executive Summary

| Metric | Value |
|--------|-------|
| VAPT Compliance Score | {SCORE}/100 |
| Critical Findings | {CRITICAL_COUNT} |
| High Findings | {HIGH_COUNT} |
| Medium Findings | {MEDIUM_COUNT} |
| Low Findings | {LOW_COUNT} |
| Files Scanned | {FILE_COUNT} |
| Dependencies Audited | {DEP_COUNT} |

### Compliance Status by Framework

| Framework | Status | Blocking Findings |
|-----------|--------|------------------|
| PCI DSS v4.0 | {PCI_STATUS} | {PCI_BLOCKERS} |
| HIPAA 164.312 | {HIPAA_STATUS} | {HIPAA_BLOCKERS} |
| GDPR Art. 25 | {GDPR_STATUS} | {GDPR_BLOCKERS} |
| ISO 27001:2022 | {ISO_STATUS} | {ISO_BLOCKERS} |
| NIST 800-53 Rev 5 | {NIST_STATUS} | {NIST_BLOCKERS} |
| SOX ITGCs | {SOX_STATUS} | {SOX_BLOCKERS} |
| IRDAI Cyber Security 2023 | {IRDAI_STATUS} | {IRDAI_BLOCKERS} |
| CERT-IN Audit Policy 2025 | {CERTIN_STATUS} | {CERTIN_BLOCKERS} |

**Status key:** ✅ Compliant | ⚠️ Partial | ❌ Non-compliant | — Not in scope

---

## Findings by Severity

### CRITICAL — Fix Before Next Commit

{CRITICAL_FINDINGS_LIST}

Each entry format:
```
#### [CRIT-001] {FINDING_TITLE}
- **File:** {file:line}
- **Evidence:** {CODE_SNIPPET}
- **WSTG Code:** {WSTG-XXXX-XX}
- **Control IDs:** {PCI_REQ} | {NIST_CTL} | {ISO_CTL}
- **Fix:** {REMEDIATION}
- **Effort:** {XS/S/M/L}
```

---

### HIGH — Fix Within Current Sprint

{HIGH_FINDINGS_LIST}

---

### MEDIUM — Fix Within 30 Days

{MEDIUM_FINDINGS_LIST}

---

### LOW — Track in Backlog

{LOW_FINDINGS_LIST}

---

## Regulatory Control Mapping

### PCI DSS v4.0

| Finding ID | PCI DSS Control | Requirement Text | Status |
|------------|----------------|-----------------|--------|
| {FINDING_ID} | {REQ_ID} | {REQ_TEXT} | ❌ Failing |

### HIPAA Technical Safeguards

| Finding ID | 45 CFR Section | Safeguard | Type | Status |
|------------|---------------|-----------|------|--------|
| {FINDING_ID} | {SECTION} | {SAFEGUARD} | Required/Addressable | ❌ Failing |

### GDPR Article 25

| Finding ID | Article | Principle | Max Fine | Status |
|------------|---------|-----------|---------|--------|
| {FINDING_ID} | {ART} | {PRINCIPLE} | {FINE} | ❌ Failing |

### ISO 27001:2022

| Finding ID | Control ID | Control Name | Status |
|------------|-----------|-------------|--------|
| {FINDING_ID} | {A.X.XX} | {NAME} | ❌ Failing |

### NIST SP 800-53 Rev 5

| Finding ID | Control ID | Family | Status |
|------------|-----------|--------|--------|
| {FINDING_ID} | {XX-XX} | {FAMILY} | ❌ Failing |

### SOX ITGCs

| Finding ID | ITGC Domain | Control Area | Risk Level | Status |
|------------|------------|-------------|-----------|--------|
| {FINDING_ID} | {DOMAIN} | {AREA} | {RISK} | ❌ Failing |

---

## Remediation Roadmap

### Immediate (Before Next Commit)
| # | Finding | Fix | Owner | Effort |
|---|---------|-----|-------|--------|
| 1 | {FINDING} | {FIX} | Dev | {EFFORT} |

### Sprint-Level (Within 14 Days)
| # | Finding | Fix | Owner | Effort |
|---|---------|-----|-------|--------|

### Planned (Within 30 Days)
| # | Finding | Fix | Owner | Effort |
|---|---------|-----|-------|--------|

---

## Re-Test Checklist

After remediation, verify each finding is resolved:

- [ ] All CRITICAL findings confirmed fixed with code evidence
- [ ] All HIGH findings confirmed fixed or risk-accepted with documentation
- [ ] Dependency audit re-run: `npm audit` / `pip-audit` shows no Critical/High CVEs
- [ ] SAST re-scan shows no new Critical/High findings
- [ ] Auth endpoints tested: login lockout, session expiry, MFA enforcement
- [ ] Logging verified: auth events, access control failures captured in logs
- [ ] No secrets in source control (scan full git history with GitLeaks/TruffleHog)
- [ ] TLS configuration verified: TLS 1.2+ only, no `rejectUnauthorized: false`
- [ ] Security headers verified in HTTP responses

---

## Scan Methodology

This report was produced using:
- **Static Analysis**: Pattern matching against OWASP WSTG v4.2 test categories
- **Dependency Audit**: npm audit / pip-audit against NVD CVE database
- **Configuration Review**: Security header and TLS configuration analysis
- **Framework Mapping**: Finding-to-control mapping per PCI DSS v4.0, HIPAA 164.312, GDPR Art. 25, ISO 27001:2022 A.8, NIST 800-53 Rev 5, SOX ITGCs

**Limitations:** This automated assessment does not replace manual penetration testing. Business logic flaws, chained exploits, and context-dependent vulnerabilities require human expert testing. For PCI DSS Requirement 11.3 and NIST CA-8 compliance, an independent annual penetration test is still required.

---

## Section 7 — CVSS v3.1 Scoring Detail

For each finding, provide full CVSS v3.1 breakdown:

| Finding ID | CVSS Score | Vector String | CWE | WSTG | CERT-IN Domain | IRDAI Domain | file:line | Business Impact | Fix | Effort |
|------------|-----------|---------------|-----|------|----------------|-------------|-----------|----------------|-----|--------|
| {FIND_ID} | {SCORE} | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` | CWE-{N} | WSTG-{CODE} | {CERT_DOMAIN} | Dom.{N} | {file:line} | {IMPACT} | {FIX} | {XS/S/M/L} |

---

## Section 8 — IRDAI 24-Domain Compliance Matrix

| # | Domain | Status | Findings | Skill-Verified | Needs External |
|---|--------|--------|----------|----------------|----------------|
| 1 | Information Security Governance | — | 0 | No | Yes (process) |
| 2 | Asset Management | {STATUS} | {COUNT} | Partial | Yes |
| 3 | Human Resource Security | — | 0 | No | Yes (process) |
| 4 | Cryptographic Controls | {STATUS} | {COUNT} | Yes | Partial |
| 5 | Network Security | {STATUS} | {COUNT} | Yes | Partial |
| 6 | Data Classification | {STATUS} | {COUNT} | Yes | No |
| 7 | Access Control | {STATUS} | {COUNT} | Yes | No |
| 8 | Incident Management | {STATUS} | {COUNT} | Partial | Yes |
| 9 | BCP & DR | {STATUS} | {COUNT} | Partial | Yes |
| 10 | Third-Party Risk | {STATUS} | {COUNT} | Yes | Partial |
| 11 | Physical Security | — | 0 | No | Yes |
| 12 | Environmental Controls | — | 0 | No | Yes |
| 13 | Supply Chain Security | {STATUS} | {COUNT} | Yes | Partial |
| 14 | Vulnerability Management | {STATUS} | {COUNT} | Yes | Partial |
| 15 | Security Testing | {STATUS} | {COUNT} | Yes (SAST) | Yes (DAST) |
| 16 | Change Management | {STATUS} | {COUNT} | Yes | No |
| 17 | Configuration Management | {STATUS} | {COUNT} | Yes | No |
| 18 | Audit Logging | {STATUS} | {COUNT} | Yes | No |
| 19 | Backup & Recovery | {STATUS} | {COUNT} | Partial | Yes |
| 20 | Secure Development | {STATUS} | {COUNT} | Yes | No |
| 21 | Mobile Security | — | 0 | No | Yes |
| 22 | Cloud Security | {STATUS} | {COUNT} | Yes | Partial |
| 23 | API Security | {STATUS} | {COUNT} | Yes | Partial |
| 24 | Emerging Technology | — | 0 | No | Yes (process) |

**Status:** ✅ Pass | ⚠️ Partial | ❌ Fail | — Process/Physical (out of scope)

---

## Section 9 — CERT-IN Audit Readiness Score

Weighted score across 6 categories (total 100):

| Category | Weight | Raw Score | Weighted |
|----------|--------|-----------|---------|
| Application Security (Checks 1–9) | 30% | {SCORE}/100 | {WEIGHTED} |
| Infrastructure Config (Checks 10–14) | 20% | {SCORE}/100 | {WEIGHTED} |
| Dependency Health (Check 7) | 15% | {SCORE}/100 | {WEIGHTED} |
| Logging & Monitoring (Check 8) | 10% | {SCORE}/100 | {WEIGHTED} |
| Data Protection (Checks 15–16) | 15% | {SCORE}/100 | {WEIGHTED} |
| Process & Governance (Checks 17–20) | 10% | {SCORE}/100 | {WEIGHTED} |
| **CERT-IN Readiness Score** | **100%** | | **{TOTAL}/100** |

**Thresholds:** 90+ = Audit-ready | 70–89 = Mostly ready | 50–69 = Significant gaps | <50 = Not ready

---

## Section 10 — Two-Cycle Retest Tracker

| Finding ID | Severity | Cycle 1 Status | Fix Commit | Cycle 2 Result |
|------------|---------|----------------|------------|----------------|
| {FIND_ID} | {SEV} | Open | {COMMIT_HASH} | ✅ Passed / ❌ Failed / ⚠️ Regressed |

**Required for IRDAI submission:** Both cycles completed, all Critical findings resolved.

---

## Section 11 — External Audit Handoff

**Already verified by this skill (SAST evidence available):**
- Application source code: Checks 1–9 complete with file:line evidence
- Infrastructure config: Checks 10–14 (Terraform/YAML review)
- IRDAI compliance controls: Checks 15–20

**Requires independent testing by CERT-IN empanelled auditor:**
- Network penetration testing (live infrastructure)
- Dynamic Application Security Testing (DAST) on running application
- Mobile application reverse engineering (APK/IPA)
- SSL/TLS live validation with qualys SSL Labs
- Cloud IAM live review (not config-only)
- Social engineering assessment
- Physical security audit

**Scope limitation statement:** "This report covers White-box SAST of source code and configuration files. It does not constitute a full VAPT certificate. An external CERT-IN empanelled auditor must complete network, runtime, and mobile testing before submission to IRDAI."

---

## Section 12 — Insurance Client Summary

**For sharing with insurance company clients (non-technical)**

| Area | Status | Evidence |
|------|--------|---------|
| Policyholder data protection | {STATUS} | PII encrypted at rest, masked in logs (Check 15) |
| Access control | {STATUS} | Multi-tenant isolation, MFA enforced (Checks 3, 4) |
| Encryption | {STATUS} | TLS 1.2+, no weak algorithms (Checks 5, 14) |
| IRDAI compliance domains covered | {N}/24 domains verified | See Section 8 |
| CERT-IN readiness score | {SCORE}/100 | See Section 9 |
| Recommendation | {READY / GAPS REMAIN} | {SUMMARY} |

---

## Section 13 — Scan History & Trend

Appended after each full scan to `aicodepath-docs/vapt/scan-history.json`.

| Scan Date | Profile | VAPT Score | Critical | High | Medium | Low | CERT-IN Score |
|-----------|---------|-----------|---------|------|--------|-----|---------------|
| {DATE} | {PROFILE} | {SCORE}/100 | {N} | {N} | {N} | {N} | {SCORE}/100 |

---

*Generated by AICodePath VAPT Skill v2.0 — Evidence artifact for compliance records*
*Testing Methodology: White-box SAST | Does not replace CERT-IN empanelled external audit*
