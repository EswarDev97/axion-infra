# PM Toolkit — Templates & Frameworks

## PM Resume Review

Evaluate the resume against 10 best practices:

```markdown
## Resume Review — [Name]

### Scoring (1-5 per criterion)

| # | Criterion | Score | Finding |
|---|-----------|-------|---------|
| 1 | **XYZ+S formula** — "Accomplished X by doing Y, measured by Z, using skill S" | /5 | |
| 2 | **Impact quantified** — Every bullet has a number or % | /5 | |
| 3 | **PM keywords** — Product strategy, roadmap, stakeholders, discovery, OKRs, A/B testing | /5 | |
| 4 | **Outcome-focused** — Bullets show results, not just responsibilities | /5 | |
| 5 | **Tailored to level** — Senior PM language vs APM language | /5 | |
| 6 | **Formatting** — Scannable in 6 seconds, consistent, 1-2 pages | /5 | |
| 7 | **Company context** — Brief description for less-known companies | /5 | |
| 8 | **Summary/headline** — Concise, differentiated, keyword-rich | /5 | |
| 9 | **Education & certifications** — Relevant to target role | /5 | |
| 10 | **No red flags** — No gaps unexplained, no overuse of "I", no typos | /5 | |

**Total: [X]/50**

### Top 3 Improvements (prioritized)
1. [Most impactful change with example]
2. [Second change]
3. [Third change]

### Rewritten examples
**Original:** "[Bullet as written]"
**Improved:** "[Rewritten with XYZ+S formula]"
```

---

## NDA (Non-Disclosure Agreement)

Generate an NDA for `$ARGUMENTS` (specify: mutual or one-way, jurisdiction, purpose):

```markdown
# NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of [DATE] between:

**Disclosing Party:** [Name], [Address]
**Receiving Party:** [Name], [Address]

## 1. Definition of Confidential Information
"Confidential Information" means any non-public information disclosed by the Disclosing Party
to the Receiving Party, including but not limited to: business plans, technical data, product
designs, financial information, customer lists, and trade secrets.

Excluded from Confidential Information: information that is (a) publicly known without breach
of this Agreement; (b) rightfully received from a third party without restriction;
(c) independently developed without use of Confidential Information;
(d) required to be disclosed by law or court order (with prior notice to Disclosing Party).

## 2. Obligations
The Receiving Party agrees to:
(a) Hold Confidential Information in strict confidence;
(b) Not disclose to third parties without prior written consent;
(c) Use only for the Purpose described in Section 3;
(d) Limit access to employees with need-to-know who are bound by similar obligations.

## 3. Purpose
This Agreement is entered into for the purpose of: [PURPOSE — e.g., evaluating a potential
business partnership / employment discussions / vendor evaluation].

## 4. Term
This Agreement shall remain in effect for [2 years / 5 years] from the date of execution.
Obligations regarding trade secrets shall survive termination indefinitely.

## 5. Return of Materials
Upon request or termination, the Receiving Party shall promptly return or destroy all
Confidential Information and certify destruction in writing.

## 6. Remedies
The parties acknowledge that breach of this Agreement may cause irreparable harm for which
monetary damages would be inadequate. Either party may seek injunctive relief without
posting a bond.

## 7. Governing Law
This Agreement shall be governed by the laws of [JURISDICTION — e.g., State of California,
United States / England and Wales / Singapore], without regard to conflict of law provisions.

## 8. Miscellaneous
This Agreement constitutes the entire agreement regarding confidentiality between the parties.
Any amendments must be in writing and signed by both parties.

**DISCLOSING PARTY**
Signature: _________________ Date: _________
Name: _________________

**RECEIVING PARTY**
Signature: _________________ Date: _________
Name: _________________
```

*Note: This is a template for general reference. Have legal counsel review before use in commercial contexts.*

---

## Privacy Policy (GDPR + CCPA)

Generate a privacy policy for `$ARGUMENTS` (company name, product type, data collected):

```markdown
# Privacy Policy

Last updated: [DATE]

## 1. Who We Are
[Company Name] ("we", "us", "our") operates [product/service]. Contact: [privacy@company.com]

## 2. Data We Collect
| Category | Examples | Source | Purpose |
|----------|---------|--------|---------|
| Identity | Name, email | You provide | Account creation |
| Usage | Pages visited, features used | Automatically | Product improvement |
| Device | IP address, browser type | Automatically | Security, analytics |
| Payment | Card type, last 4 digits | Payment processor | Billing |

We do NOT collect: [e.g., Social Security numbers, precise location without consent]

## 3. How We Use Your Data
- Provide and improve our services
- Send transactional emails (account, billing)
- Send marketing communications (with your consent)
- Comply with legal obligations

## 4. Legal Basis for Processing (GDPR)
- **Contract:** Processing necessary to deliver our service
- **Legitimate interests:** Analytics, fraud prevention, security
- **Consent:** Marketing emails, cookies (you can withdraw at any time)
- **Legal obligation:** Tax records, court orders

## 5. Data Sharing
We share data with:
- **Service providers** (processors): hosting, analytics, payments — bound by data processing agreements
- **Legal authorities:** When required by law
We do NOT sell your personal data.

## 6. Your Rights
**EU/UK residents (GDPR):** Access, rectification, erasure, portability, restriction, objection, withdraw consent
**California residents (CCPA):** Know, delete, opt-out of sale, non-discrimination

To exercise rights: [privacy@company.com] — we respond within 30 days.

## 7. Data Retention
We retain your data for [X years] after account closure, then delete or anonymize it.
Exception: legal obligations may require longer retention.

## 8. International Transfers
Data is processed in [countries]. Transfers outside the EEA use Standard Contractual Clauses (SCCs).

## 9. Cookies
We use essential cookies (required), analytics cookies (opt-in), and marketing cookies (opt-in).
Manage preferences: [Cookie settings link]

## 10. Security
We use encryption at rest and in transit, access controls, and regular security assessments.
No system is 100% secure — notify us at [security@company.com] if you discover a vulnerability.

## 11. Changes
We'll notify you of material changes via email or in-app notice 30 days before they take effect.

## 12. Contact
Data Controller: [Company Name], [Address]
DPO (if applicable): [dpo@company.com]
```

---

## Grammar & Logic Check

For `$ARGUMENTS` (text to review):

```markdown
## Review — [Document Title]

### Grammar Errors
| # | Original | Issue | Correction |
|---|----------|-------|-----------|

### Logical Errors
| # | Original | Issue | Suggested fix |
|---|----------|-------|--------------|

### Flow Issues
| # | Location | Issue | Suggestion |
|---|----------|-------|-----------|

### Summary
[Overall quality assessment + top 3 priorities]
```

Categories:
- **Grammar**: Subject-verb agreement, tense consistency, article usage, punctuation
- **Logic**: Contradictions, unsupported claims, circular reasoning, ambiguous referents
- **Flow**: Abrupt transitions, paragraph structure, repetition, passive voice overuse
