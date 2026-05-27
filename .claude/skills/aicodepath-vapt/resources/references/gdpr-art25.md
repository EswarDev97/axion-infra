# GDPR Article 25 — Privacy by Design Code Reference

Regulation: EU 2016/679, Article 25 (Data Protection by Design and by Default)
Scope: Any application processing personal data of EU residents.

---

## Article 25(1) — Privacy by Design

Security measures must be determined **at the time of design** — not patched in after code is written.
This makes threat modeling and privacy impact assessments mandatory pre-implementation activities.

### Design-Phase Requirements

| Principle | Code-Level Implementation |
|-----------|--------------------------|
| **Data Minimisation** | Collect only fields strictly necessary for the declared purpose; remove optional fields never used; implement field-level access control |
| **Pseudonymisation** | Replace direct identifiers with tokens/pseudonyms in non-production environments; store mapping table separately with additional access controls |
| **Encryption** | Encrypt personal data at rest (AES-256 minimum); encrypt in transit (TLS 1.2+); document key management and rotation schedule |
| **Purpose Limitation** | Tag data with collection purpose; enforce purpose-based access in code; prevent cross-purpose reuse at the data layer |
| **Integrity & Confidentiality** | Access controls, logging, and integrity verification on all personal data stores |

## Article 25(2) — Privacy by Default

Default settings must be the most privacy-preserving option. Privacy-invasive features require explicit opt-in.

### Default Settings Checklist

- [ ] Analytics: opt-out by default (or not collected without opt-in)
- [ ] Marketing communications: opt-in required before sending
- [ ] Data sharing with third parties: off by default
- [ ] Profile visibility: private by default
- [ ] Data retention: shortest period by default, not maximum

---

## Code-Level GDPR Checks

### Data Minimisation
- Scan data models: are there fields with no documented purpose?
- Scan API responses: are responses returning fields not needed by the consumer?
- Scan analytics/tracking calls: is personal data included where aggregate data would suffice?

### Right to Erasure (Article 17)
```
/user/:id/delete must:
  1. Delete from primary database
  2. Delete from cache (Redis, Memcached)
  3. Delete from search index (Elasticsearch)
  4. Delete from analytics data store
  5. Flag backups for deletion on next rotation
  6. Return 204 No Content with deletion timestamp in audit log
```
Check: Is there a right-to-erasure endpoint? Does it propagate to ALL data stores including secondary stores?

### Data Subject Access Request (Article 15)
```
/user/:id/export must:
  1. Return all personal data held across all services
  2. Include metadata: when collected, for what purpose, who it was shared with
  3. Format: machine-readable JSON or human-readable (user's choice)
```
Check: Is there a DSAR endpoint? Does it aggregate from all data stores?

### Consent Management (Article 7)
- [ ] Consent recorded with: userId, timestamp, purpose, version of privacy notice consented to
- [ ] Consent withdrawal revokes processing immediately
- [ ] No dark patterns: consent UI is clear, equally prominent opt-in and opt-out

### Pseudonymisation in Non-Production
- [ ] Production personal data never copied to dev/staging environments
- [ ] Test data generators used for non-production environments
- [ ] Anonymisation is irreversible (not just renamed fields)

### Data Retention
- [ ] Automated retention policy: records older than retention period are flagged for deletion
- [ ] Deletion job runs on schedule and logs execution evidence
- [ ] Retention period documented per data category

---

## VAPT Finding → GDPR Control Mapping

| Finding | GDPR Article | Potential Fine |
|---------|-------------|---------------|
| No encryption at rest for personal data | Art. 25(1), Art. 32 | Up to €10M or 2% global turnover |
| TLS disabled | Art. 25(1), Art. 32 | Up to €10M or 2% global turnover |
| No right-to-erasure endpoint | Art. 17 | Up to €20M or 4% global turnover |
| No DSAR endpoint | Art. 15 | Up to €20M or 4% global turnover |
| PII in log files | Art. 5(1)(f) | Up to €20M or 4% global turnover |
| No consent mechanism | Art. 7 | Up to €20M or 4% global turnover |
| Data shared beyond stated purpose | Art. 5(1)(b) | Up to €20M or 4% global turnover |
| No data retention policy | Art. 5(1)(e) | Up to €10M or 2% global turnover |
| No privacy by default settings | Art. 25(2) | Up to €10M or 2% global turnover |
| Production PII in non-production | Art. 25(1) | Up to €10M or 2% global turnover |
