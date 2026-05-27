# CERT-IN Comprehensive Cyber Security Audit Policy Guidelines 2025

**Issued:** July 25, 2025 by the Indian Computer Emergency Response Team (CERT-In)
**Purpose:** Standardized framework for cyber security audits — reference for CERT-In empanelled auditors and auditee organizations.

---

## Audit Scope & Coverage

The guidelines prescribe audits across 25+ categories. The `aicodepath-vapt` skill covers the following domains through static analysis (SAST):

| CERT-IN Audit Domain | Our Check(s) | Coverage |
|----------------------|--------------|----------|
| Application Security Testing | Checks 1–9 | SAST — source code patterns |
| Source Code Review | Checks 1–9 | Pattern matching + dependency audit |
| Network Infrastructure | Check 12 | API gateway config scan |
| Cloud Security Testing | Check 10 | GCP Terraform/config review |
| Container Security | Check 11 | Dockerfile / docker-compose review |
| Database Security | Check 13 | Connection string + RLS review |
| TLS/Certificate Config | Check 14 | Config file scan |
| Data Protection | Check 15 | PII grep + masking check |
| File/Storage Security | Check 16 | Upload endpoint review |
| Incident Response | Check 17 | Config file presence check |
| Change Management | Check 19 | CI/CD + branch protection |
| Third-Party / Supply Chain | Checks 7, 20 | Dependency audit + webhook review |
| API Security | Checks 4, 12 | Route auth + gateway config |
| Red Team Assessment | ❌ External only | Requires live infrastructure access |
| Mobile Security (APK/IPA) | ❌ External only | Requires reverse engineering |
| OT / ICS Security | ❌ External only | Requires network access |
| AI System Audits | ❌ Not in scope | Requires model access |
| Runtime DAST | ❌ External only | Requires live application |

**Skill coverage: ~60–65% of CERT-IN SAST-verifiable domains. Remaining 35–40% requires external empanelled auditor.**

---

## Required Testing Methodology

CERT-IN requires declaration of testing methodology in the audit report:

| Methodology | Description | Our Approach |
|-------------|-------------|--------------|
| Black-box | No prior knowledge of system | ❌ Not applicable (SAST requires code access) |
| Grey-box | Partial knowledge — architecture docs + API specs | Partial match |
| White-box | Full source code access | ✅ This skill — declare as White-box SAST |

**Report must declare:** "Testing methodology: White-box Static Application Security Testing (SAST)"

---

## Two-Cycle Testing Requirement

CERT-IN mandates a two-cycle model:
1. **Cycle 1 (Initial):** Full assessment — identify all findings
2. **Remediation period:** Organization fixes Critical within 1 month, Others within 2 months
3. **Cycle 2 (Retest):** Verify fixes, check for regressions, close findings

Use `--cycle 2` argument for retest mode. The two-cycle tracker (Report Section 10) is mandatory for CERT-IN submission.

---

## Report Format Requirements (CERT-IN)

CERT-IN requires findings to include:
- CVSS v3.1 base score and vector string (mandatory)
- EPSS score (optional — Exploit Prediction Scoring System)
- Proof of Concept (PoC) description or evidence snippet
- WSTG reference code (e.g., WSTG-INPV-05)
- Remediation guidance with effort estimate

---

## Gap Closure Timelines

| Severity | CERT-IN Mandate | SLA |
|----------|----------------|-----|
| Critical (CVSS 9.0–10.0) | 1 month from report delivery | Before next deployment |
| High (CVSS 7.0–8.9) | 2 months from report delivery | Within sprint |
| Medium (CVSS 4.0–6.9) | 2 months from report delivery | Within 30 days |
| Low (CVSS 0.1–3.9) | Risk-accepted or tracked | Backlog |

---

## Auditor Qualification Requirements

External CERT-IN empanelled auditors must have:
- Professional certification: CISA, CISSP, CEH, GPEN, or OSCP
- Minimum 3 years experience in penetration testing
- CERT-IN empanelment valid for 3 years (must be on current empanelled list)

Verify auditor empanelment at: https://www.cert-in.org.in (empanelled auditors section)

---

## Coverage Summary Matrix

| Requirement Category | Total Requirements | Skill-Verifiable | Needs External Auditor |
|---------------------|-------------------|-----------------|----------------------|
| Application SAST | 45 | 38 (84%) | 7 (16%) |
| Infrastructure Config | 25 | 18 (72%) | 7 (28%) |
| Network/Runtime | 20 | 0 (0%) | 20 (100%) |
| Mobile/OT/AI | 15 | 0 (0%) | 15 (100%) |
| Governance/Process | 10 | 6 (60%) | 4 (40%) |
| **Total** | **115** | **62 (54%)** | **53 (46%)** |

**This skill does NOT replace the CERT-IN empanelled auditor. It prepares the codebase and produces pre-audit evidence.**
