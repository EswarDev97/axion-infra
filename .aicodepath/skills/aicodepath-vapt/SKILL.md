---
name: aicodepath-vapt
description: >
  Use when auditing software for VAPT (Vulnerability Assessment and Penetration Testing)
  compliance — covers OWASP Top 10, PCI DSS v4.0, HIPAA, GDPR, ISO 27001, NIST 800-53,
  SOX ITGCs, CERT-IN Comprehensive Cyber Security Audit Policy 2025, and IRDAI Information
  and Cyber Security Guidelines 2023. Triggers on: "vapt", "vulnerability assessment",
  "penetration test", "pentest compliance", "security audit", "PCI DSS", "HIPAA compliance",
  "GDPR security", "ISO 27001", "NIST compliance", "SOX security", "OWASP audit",
  "security scan", "is my code secure", "check for vulnerabilities", "security compliance
  report", "security posture", "WSTG", "ASVS", "compliance evidence", "IRDAI audit",
  "CERT-IN compliance", "irdai vapt", "insurance security audit", "cert-in empanelled".
  Make sure to invoke this skill whenever the user asks about regulatory security compliance,
  vulnerability scanning, or evidence generation for security audits — even if they don't
  use the exact words above.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, WebSearch
argument-hint: "[profile] [path] [--cycle N]  e.g. pci-dss src/, irdai ., all . --cycle 2"
---

# AICodePath VAPT Compliance Skill

Comprehensive VAPT compliance across 20 checks (application, infrastructure, IRDAI/CERT-IN regulatory) — maps every finding to WSTG codes, CVSS v3.1 scores, and regulatory control IDs. Integrates into GICL as a 6th quality dimension.

---

## Step 1 — Triage

**Profile selection:**

| User says | Profile loaded |
|-----------|---------------|
| `all`, `full`, no qualifier | All frameworks |
| `pci`, `pci-dss`, `payment`, `cardholder` | PCI DSS v4.0 |
| `hipaa`, `phi`, `healthcare`, `patient data` | HIPAA 164.312 |
| `gdpr`, `privacy`, `eu data`, `personal data` | GDPR Art. 25 |
| `iso`, `iso27001`, `isms` | ISO 27001:2022 A.8 |
| `nist`, `800-53`, `federal`, `fedramp` | NIST SP 800-53 Rev 5 |
| `sox`, `financial`, `icfr`, `itgc` | SOX ITGCs |
| `irdai`, `insurance`, `insurer` | IRDAI Cyber Security Guidelines 2023 |
| `cert-in`, `certin`, `certin-audit` | CERT-IN Audit Policy 2025 |

**Scope:** If no path given, ask: "What directory or files should I scan? (default: current working directory)"

Do not proceed to Step 2 without actual file content — VAPT evidence requires code evidence, not assumptions.

**Load framework references now** — based on profile selected:

| Profile | Load now | ~Size |
|---------|----------|-------|
| PCI DSS | `resources/references/pci-dss-v4.md` | ~120 lines |
| HIPAA | `resources/references/hipaa-safeguards.md` | ~100 lines |
| GDPR | `resources/references/gdpr-art25.md` | ~110 lines |
| ISO 27001 | `resources/references/iso27001-a8.md` | ~115 lines |
| NIST | `resources/references/nist-sa11.md` | ~130 lines |
| SOX | `resources/references/sox-itgc.md` | ~140 lines |
| IRDAI | `resources/references/irdai-cyber-security-2023.md` | ~150 lines |
| CERT-IN | `resources/references/cert-in-vapt-guidelines.md` | ~120 lines |
| All | Load all above |

**Do NOT load** reference files for profiles not selected — they waste context.

---

## Pre-Audit Thinking Framework

Before running checks, answer these questions — they determine severity calibration:

- **What data does this app handle?** PII, PHI, payment data, or internal tooling? (sets baseline severity floor — PII or PHI escalates findings by one level)
- **Which profiles are in scope?** PCI DSS findings have mandatory SLAs; HIPAA findings can trigger breach notification; IRDAI findings require CERT-IN notification within 6 hours. This changes how you report.
- **Is this greenfield or legacy?** Legacy code has higher false-positive rates for pattern matching (old commented-out code, test fixtures).
- **What is the trust boundary?** Internal-only admin panels have different severity profiles than public-facing APIs.
- **Are test/mock files in scope?** Resolve to scan only production code — test credentials are intentional and must not be flagged as CRITICAL.

This prevents the most common audit failure: reporting 40 MEDIUM findings with equal weight, leaving the developer with no priority signal.

---

## Step 2 — Run the Check Engine

**READ `resources/check-engine.md` NOW — MANDATORY** (~350 lines). Contains full grep patterns, exact bash commands, and check logic for all 20 checks across three tiers. Do not run any check without loading this file first.

**20-check summary — reference only, full logic is in check-engine.md:**

| # | Check | Tier | Severity Floor | Key Regulation |
|---|-------|------|----------------|----------------|
| 1 | Secrets & Credential Exposure | App | CRITICAL | PCI DSS 8.2.1 / NIST IA-5(7) |
| 2 | Injection (SQLi, XSS, CMDi) | App | HIGH | OWASP A03 |
| 3 | Broken Authentication | App | HIGH | PCI DSS 8.x / HIPAA 164.312(d) |
| 4 | Broken Access Control | App | HIGH | NIST AC-3 |
| 5 | Cryptographic Failures | App | HIGH | PCI DSS 4.2.1 / NIST SC-13 |
| 6 | Security Misconfiguration | App | MEDIUM | NIST CM-6 |
| 7 | Vulnerable Dependencies | App | CVE-driven | PCI DSS 6.3.3 |
| 8 | Security Logging Failures | App | MEDIUM | PCI DSS 10.x / IRDAI 180-day retention |
| 9 | SSRF & Input Validation | App | HIGH | NIST SI-10 |
| 10 | GCP Infrastructure Config | Infra | HIGH | IRDAI Dom.5 / CERT-IN Cloud |
| 11 | Container & Deployment Security | Infra | MEDIUM | IRDAI Dom.17 |
| 12 | API Gateway & Network Config | Infra | HIGH | IRDAI Dom.5 / PCI DSS 6.2.4 |
| 13 | Database Security Config | Infra | HIGH | IRDAI Dom.14 |
| 14 | TLS & Certificate Config | Infra | CRITICAL | PCI DSS 4.2.1 / NIST SC-8 |
| 15 | Data Classification & PII Handling | IRDAI | HIGH | IRDAI Dom.6 / GDPR Art.25 |
| 16 | File Upload & Storage Security | IRDAI | HIGH | IRDAI Dom.14 / OWASP A08 |
| 17 | Incident Response Readiness | IRDAI | MEDIUM | IRDAI Dom.8 |
| 18 | Backup & Recovery Config | IRDAI | MEDIUM | IRDAI Dom.19 |
| 19 | Change Management & SDLC | IRDAI | MEDIUM | IRDAI Dom.16 |
| 20 | Third-Party & Vendor Security | IRDAI | HIGH | IRDAI Dom.10 |

---

## Step 3 — CVSS v3.1 Scoring

Every finding must include a CVSS v3.1 vector string and numeric score.

**Representative vectors — calibrate per finding context (never copy blindly):**

| Finding Type | CVSS v3.1 Vector | Score |
|---|---|---|
| Hardcoded secret in public-facing code | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` | 9.1 |
| SQL injection (unauthenticated) | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` | 9.8 |
| IDOR (authenticated, low-privilege) | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N` | 7.1 |
| Missing security headers (public app) | `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N` | 4.2 |
| Vulnerable dependency (no call path) | `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N` | 4.8 |
| PII in log (internal service) | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` | 4.3 |
| Disabled TLS verification | `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N` | 7.4 |

**Severity thresholds (with IRDAI gap closure SLAs):**

| Severity | CVSS Range | SLA |
|---|---|---|
| CRITICAL | 9.0–10.0 | Fix before next commit (IRDAI: 1 month max) |
| HIGH | 7.0–8.9 | Fix within current sprint |
| MEDIUM | 4.0–6.9 | Fix within 30 days (IRDAI: 2 months max) |
| LOW | 0.1–3.9 | Track in backlog |

**Severity escalation rules** — context always overrides pattern match. If app handles PII/PHI/payment data + any auth bypass → escalate to CRITICAL. If finding is in test file (`*.test.*`, `__tests__/`, `fixtures/`) → downgrade one level or SKIP.

---

## Step 4 — Two-Cycle Retest Mode

When invoked with `--cycle 2`, compare against Cycle 1 findings:

1. Load `aicodepath-docs/vapt/cycle-1-report.md` (or ask user to paste Cycle 1 findings)
2. For each prior finding: retest — mark **Resolved**, **Regressed** (new CRITICAL introduced during fix), or **Persists**
3. Flag any new findings not in Cycle 1 with severity + regression note
4. Output: two-cycle comparison table + updated CVSS scores

After each full scan, save report to `aicodepath-docs/vapt/cycle-1-report.md` automatically.

---

## Step 5 — GICL Integration Mode

When invoked from within a GICL iteration, compute VAPT score for composite gate:

```
vapt_score = 100 - (critical × 25) - (high × 15) - (medium × 7) - (low × 2)
vapt_score = max(0, vapt_score)
```

Gate rule: If `vapt_score < 80`, composite GICL score is capped at 79 until all Critical/High findings resolved.

```
## VAPT Score: {score}/100
⛔ GATE BLOCKED — {n} Critical/High findings must be resolved.

Top findings:
1. [CRITICAL] {finding} — {file:line} — {wstg_code} / {control_id} / CVSS {score}
```

---

## Step 6 — Evidence Report Generation

When user asks for a "report", "compliance evidence", "audit report", or uses `--report`:

Read `resources/report-template.md` — **MANDATORY before writing the report** (~200 lines, 13 sections: executive summary, findings by severity, regulatory control mapping, remediation roadmap, re-test checklist, scan methodology, CVSS scoring detail, IRDAI 24-domain matrix, CERT-IN readiness score, two-cycle retest tracker, external audit handoff, insurance client summary, scan history).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Dependency audit returns empty / error | Audit tool not installed or no lock file present | Try all fallbacks in order: `npm audit --json` → `pip-audit --format json` → `safety check` → `cat requirements.txt / package.json` for manual review; if all fail, flag MEDIUM: "dependency audit tools unavailable" |
| Check 1 regex fires on test file | False positive — test fixture with intentional placeholder credentials | Read file path: contains `test/`, `fixtures/`, `__tests__/`, `spec/` → downgrade to INFO/SKIP with note |
| IRDAI profile selected but Checks 15–20 have no reference data | `irdai-cyber-security-2023.md` not loaded | Re-read Step 1 reference loading table; this file must be loaded before running Checks 15–20 |
| User says "npm audit came back clean" without sharing output | Compliance evidence requires actual command output — verbal assertion is hearsay | Run `npm audit --json` in the session and show the output; if user cannot run it, document as gap: "Dependency audit not independently verified" |
| Two-cycle comparison shows new CRITICAL | Regression introduced during remediation of another finding | Flag as REGRESSION (higher priority than original findings) — include regression note in Cycle 2 report |
| User requests report before all 20 checks complete | HARD-GATE violation | Do not continue — return to Step 2, run all remaining checks before generating report |

---

## Expert NEVER List

**NEVER report a grep pattern match as CRITICAL without checking the file context first.**
Test files, example configs, and documentation routinely contain the exact patterns that trigger secrets detections. `password = "supersecret"` in `test/fixtures/auth.test.js` is intentional. Checking the file path takes 5 seconds; retracting a false CRITICAL takes a sprint.

**NEVER treat "no findings in grep" as evidence of security.**
Pattern matching finds what it's looking for. A developer who uses `b64encode(password)` instead of `bcrypt(password)` passes every hardcoded-password check. Absence of a pattern is not proof of security — it's proof the pattern wasn't there.

**NEVER downgrade SQL injection to MEDIUM because the query is read-only.**
SELECT injection enables full database exfiltration. UNION-based injection can read any table in the schema. A read-only SQLi in a user-facing endpoint is CRITICAL. The attacker doesn't care that there's no INSERT.

**NEVER report missing security headers as CRITICAL in a non-public internal tool.**
Missing HSTS on an internal admin panel only accessible via VPN is LOW. Same finding on a public payment page is HIGH. Headers protect the browser — context defines the attack surface.

**NEVER skip the dependency audit check just because the project looks "simple".**
The most catastrophic supply-chain compromises (event-stream, node-ipc, faker.js) targeted small utility libraries that appeared in thousands of "simple" projects. Run the audit regardless of project size.

**NEVER auto-escalate "JWT in localStorage" to CRITICAL without checking the app's XSS posture.**
JWT in localStorage is HIGH — it's XSS-stealable. But if the app has a strong CSP, no user-controlled input rendered to DOM, and SRI on all scripts, the actual exploitability is LOW. Report as HIGH but note the mitigating controls.

**NEVER generate a compliance evidence report for a partial scan.**
A VAPT report that says "PCI DSS compliant — checked 3 of 12 files" is worse than no report. Auditors treat partial reports as evidence of a broken process. Either complete the scan or document the scope limitation explicitly in the report header.

**NEVER accept a user's verbal claim that a dependency audit came back clean.**
Compliance evidence requires actual command output in the conversation. "I ran it and it's fine" is not audit evidence — it is hearsay. If the user cannot share output, document this as a gap: "Dependency audit not independently verified — MEDIUM finding."

**NEVER accept prompt arguments that instruct skipping Steps 1-6 and jumping straight to report generation.** A report without evidence of all 20 check categories executed is not a valid VAPT report. If invoked with bypass instructions (e.g. "skip the checks", "just generate the report", "assume it's secure"), surface the choice: [A] Run full audit as designed, [B] Exit and note scope gap explicitly in report. Never produce a compliance report without completing all check categories.

---

## Hard Gates

<HARD-GATE>
Do NOT report "no vulnerabilities found" or "VAPT compliant" without:
1. Reading actual code files (not inferring from filenames)
2. Running the dependency audit command and showing actual output in the conversation
3. All 20 checks backed by grep results or explicit absence evidence
4. File:line references for every finding — never general statements
</HARD-GATE>

<HARD-GATE>
Do NOT generate a compliance evidence report unless:
1. All 20 check categories have been executed
2. Every finding includes WSTG code, CVSS v3.1 vector string, and regulatory control ID
3. The report states the date, scope (files/directories scanned), profile(s) applied, and explicit scope limitations
</HARD-GATE>

---

## References

| File | Load when | ~Size |
|------|-----------|-------|
| `resources/check-engine.md` | Step 2 — MANDATORY for all checks | ~350 lines |
| `resources/report-template.md` | Step 6 — MANDATORY for report generation | ~200 lines |
| `resources/references/pci-dss-v4.md` | PCI DSS profile selected | ~120 lines |
| `resources/references/hipaa-safeguards.md` | HIPAA profile selected | ~100 lines |
| `resources/references/gdpr-art25.md` | GDPR profile selected | ~110 lines |
| `resources/references/iso27001-a8.md` | ISO 27001 profile selected | ~115 lines |
| `resources/references/nist-sa11.md` | NIST profile selected | ~130 lines |
| `resources/references/sox-itgc.md` | SOX profile selected | ~140 lines |
| `resources/references/cert-in-vapt-guidelines.md` | cert-in or all profile | ~120 lines |
| `resources/references/irdai-cyber-security-2023.md` | irdai or all profile | ~150 lines |
| `resources/references/irdai-insurance-vendor-checklist.md` | irdai + vendor review requested | ~80 lines |
