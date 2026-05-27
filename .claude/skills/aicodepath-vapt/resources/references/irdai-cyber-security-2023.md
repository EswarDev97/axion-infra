# IRDAI Information and Cyber Security Guidelines 2023

**Issued:** April 2023 by the Insurance Regulatory and Development Authority of India (IRDAI)
**Applicability:** All insurers (life, general, health), FRBs, intermediaries (brokers, TPAs, web aggregators, insurance marketing firms, repositories, surveyors, MISPs, CSCs), and Insurance Information Bureau of India.

---

## 24 Security Domains — Coverage Map

| # | IRDAI Domain | What Our Skill Verifies | What Needs Process/Physical Audit |
|---|-------------|------------------------|----------------------------------|
| 1 | Information Security Governance | ❌ Process only | CISO appointment, IS policy |
| 2 | Asset Management | Partial — Check 11 (containers) | Physical asset inventory |
| 3 | Human Resource Security | ❌ Process only | Background checks, training |
| 4 | Cryptographic Controls | ✅ Checks 5, 14 | Key management HSM |
| 5 | Network Security | ✅ Checks 12, 10 | Firewall rules on live infra |
| 6 | Data Classification | ✅ Check 15 (PII grep) | Data classification policy doc |
| 7 | Access Control | ✅ Checks 3, 4 | Privileged access review |
| 8 | Incident Management | ✅ Check 17 (readiness) | IR plan documentation, drills |
| 9 | BCP & DR | ✅ Check 18 (backup config) | DR drill, RTO/RPO validation |
| 10 | Third-Party Risk | ✅ Check 20 | Vendor contracts, assessments |
| 11 | Physical Security | ❌ External only | Data center access |
| 12 | Environmental Controls | ❌ External only | Power, cooling, fire |
| 13 | Supply Chain Security | ✅ Checks 7, 20 | Vendor security questionnaires |
| 14 | Vulnerability Management | ✅ Checks 7, 13, 16 | Patch management schedule |
| 15 | Security Testing | ✅ This skill (SAST) | Network pentest, DAST |
| 16 | Change Management | ✅ Check 19 | Change approval board |
| 17 | Configuration Management | ✅ Checks 10, 11 | Baseline config registry |
| 18 | Audit Logging | ✅ Check 8 | Log aggregation infrastructure |
| 19 | Backup & Recovery | ✅ Check 18 | Backup restoration test |
| 20 | Secure Development | ✅ Checks 1–9, 19 | SDLC policy documentation |
| 21 | Mobile Security | ❌ External only | Mobile app reverse engineering |
| 22 | Cloud Security | ✅ Checks 10, 11 | Cloud IAM live review |
| 23 | API Security | ✅ Checks 9, 12 | Runtime API fuzzing |
| 24 | Emerging Technology | ❌ Process only | AI governance, quantum readiness |

**Domain coverage: ~15 of 24 domains partially or fully verifiable via SAST. 9 domains require process audits or external testing.**

---

## VAPT Frequency Requirements

| System Criticality | VAPT Frequency |
|-------------------|----------------|
| Critical systems (core insurance, claims, policy, payment) | Annual |
| Non-critical systems | Biennial (every 2 years) |
| After significant change | Within 30 days of go-live |

**Two-cycle model:** Initial assessment → remediation → retesting. Both cycles required for IRDAI submission.

---

## Incident Notification Requirements

| Authority | Notification Window | What to Report |
|-----------|-------------------|----------------|
| CERT-IN | Within 6 hours of discovery | All cybersecurity incidents |
| IRDAI | Within 24 hours of discovery | Significant incidents affecting policyholder data |

**Critical:** Any breach of policyholder PII (Aadhaar, PAN, vehicle data) triggers mandatory reporting.

---

## Log Retention Requirements

- **Minimum:** 180-day rolling log retention (Check 8 validates this)
- **Recommended:** 1 year for audit trail
- **Audit trail must include:** user_id, tenant_id, action, resource, old_status, new_status, timestamp for all business operations (job creation, policy issuance, claims, payments)

---

## Insurance-Specific PII — Classification

Under IRDAI, the following are classified as sensitive PII for insurance vendors:

| Field | Classification | Required Control |
|-------|---------------|-----------------|
| `aadhaar_number` | Biometric-linked PII | Encrypt at rest, mask in transit (last 4 visible) |
| `pan_number` | Financial identifier | Encrypt at rest, never log |
| `vehicle_registration` | Vehicle PII | Mask in API responses (partial) |
| `chassis_number` | Vehicle PII | Encrypt at rest |
| `engine_number` | Vehicle PII | Encrypt at rest |
| `policy_number` | Insurance identifier | Mask in logs |
| `phone` / `mobile` | Contact PII | Mask in logs (last 4 digits) |
| `email` | Contact PII | Mask in logs (first 2 chars + domain) |
| GPS coordinates (from EXIF) | Location PII | Strip before storage (Check 16) |

---

## Gap Closure Timelines

| Severity | IRDAI Mandate |
|----------|--------------|
| Critical | Remediate within 1 month of audit report |
| Others (High, Medium) | Remediate within 2 months of audit report |
| Retest | Submit retested report to IRDAI within 30 days of remediation |

**Submission deadline:** 90 days post-FY end OR 30 days from audit completion (whichever is earlier).

---

## Annual Assurance Audit

Beyond VAPT, IRDAI requires an annual assurance audit covering:
- Adequacy of IS policies and procedures
- Effectiveness of technical controls
- Compliance with IRDAI IS Guidelines
- Third-party vendor risk assessments

The assurance auditor must be independent (cannot be the same team that developed the system).

---

## Coverage Summary for IRDAI Submission

| Section | Skill-Verified | Needs External |
|---------|---------------|----------------|
| Application security (SAST) | ✅ Checks 1–9 | Runtime DAST |
| Infrastructure config | ✅ Checks 10–14 | Live cloud IAM review |
| IRDAI compliance controls | ✅ Checks 15–20 | Process/physical controls |
| Network penetration testing | ❌ External | Full network pentest required |
| Social engineering | ❌ External | Phishing simulation |
| Physical security | ❌ External | On-site assessment |

**This skill provides pre-audit preparation and SAST evidence. The full CERT-IN empanelled audit is mandatory for IRDAI submission.**
