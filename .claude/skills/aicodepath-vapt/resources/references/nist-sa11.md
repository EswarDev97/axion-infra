# NIST SP 800-53 Rev 5 — Application Security Controls Reference

Standard: NIST Special Publication 800-53 Revision 5
Applicable Baselines: Low, Moderate, High impact systems
Most Relevant Families: SA (System & Services Acquisition), SI (System & Info Integrity), CA, SC, AC

---

## SA Family — System and Services Acquisition

### SA-11: Developer Testing and Evaluation ⭐ Most Important for VAPT

SA-11 explicitly requires developers to perform security testing — not just the security team.

| Sub-Control | Requirement | Evidence Required |
|-------------|-------------|------------------|
| **SA-11** | Developer test/eval plan; flaw remediation process | Written testing plan; tracked vulnerabilities; remediation records |
| **SA-11(1)** | Static Code Analysis (SAST) | SAST tool integrated into CI/CD; scan reports archived |
| **SA-11(2)** | Threat Modeling / Vulnerability Analysis | Threat model document per feature; STRIDE/PASTA analysis |
| **SA-11(3)** | Independent Verification | Independent team/agent reviews security-critical components |
| **SA-11(4)** | Manual Code Reviews | Security-focused code review by trained reviewer; separate from author |
| **SA-11(5)** | Penetration Testing | Annual app-layer pentest; documented report; findings tracked to closure |
| **SA-11(8)** | Dynamic Code Analysis (DAST) | DAST tool (ZAP, Burp) in CI/CD; reports archived |

### SA-3: System Development Life Cycle

- Security roles defined in SDLC
- Security phase gates at: design, code, test, deploy
- Security impact assessment for significant changes

### SA-8: Security and Privacy Engineering Principles

Apply these 8 principles in code:
1. **Least Privilege** — components request only permissions they need
2. **Fail-Safe Defaults** — default to deny, not permit
3. **Complete Mediation** — check authorization on every access, not just login
4. **Separation of Privilege** — require multiple conditions for sensitive operations
5. **Economy of Mechanism** — keep security mechanisms simple
6. **Least Common Mechanism** — minimize shared state between users
7. **Open Design** — security must not rely on secrecy of mechanism
8. **Psychological Acceptability** — security controls must not obstruct legitimate use

### SA-10: Developer Configuration Management

- All source code in version control
- Developer access controls enforced via repo permissions
- All changes tracked; baseline defined for each release

---

## SI Family — System and Information Integrity

| Control | Name | Code-Level Check |
|---------|------|-----------------|
| **SI-2** | Flaw Remediation | Critical flaws: ≤30 days; High: ≤90 days; tracked in issue tracker with CVE reference |
| **SI-3** | Malicious Code Protection | Input validation preventing code injection; SCA scanning; container image scanning |
| **SI-7** | Software Integrity | Integrity verification on deployable artifacts; detect unauthorized code changes; code signing |
| **SI-10** | Information Input Validation | Server-side validation on ALL inputs: accuracy, completeness, validity, authenticity |
| **SI-16** | Memory Protection | ASLR, stack canaries, compiler memory protections enabled in build |

---

## CA Family — Assessment and Authorization

| Control | Name | Code-Level Check |
|---------|------|-----------------|
| **CA-2** | Control Assessments | Security control assessment includes code review + app security testing; documented results |
| **CA-7** | Continuous Monitoring | SAST/DAST on every build; CVE monitoring for dependencies; automated alerting |
| **CA-8** | Penetration Testing | App-layer pentest; industry-standard methodology; all findings addressed |
| **CA-8(1)** | Independent Penetration Agent/Team | Independent team — not the development team — performs pentest |

---

## SC Family — System and Communications Protection

| Control | Name | Code-Level Check |
|---------|------|-----------------|
| **SC-8** | Transmission Confidentiality | TLS 1.2+ for all data in transit; HSTS implemented; cert management documented |
| **SC-13** | Cryptographic Protection | FIPS 140-2/140-3 validated modules; AES-256, RSA-2048+, SHA-256+ only |
| **SC-28** | Protection of Information at Rest | Sensitive data encrypted at rest at application layer, not just infrastructure |
| **SC-39** | Process Isolation | App processes isolated; containers with appropriate security contexts; no privilege escalation |

---

## AC Family — Access Control

| Control | Name | Code-Level Check |
|---------|------|-----------------|
| **AC-3** | Access Enforcement | RBAC/ABAC enforced on every resource request; deny-by-default |
| **AC-6** | Least Privilege | Components have minimum permissions needed; no global admin service accounts |
| **AC-17** | Remote Access | MFA for all remote access; encrypted remote sessions |

---

## VAPT Finding → NIST 800-53 Control Mapping

| Finding | NIST Control |
|---------|-------------|
| No SAST in CI/CD | SA-11(1) |
| No DAST | SA-11(8) |
| No penetration test | SA-11(5), CA-8 |
| No threat model | SA-11(2) |
| No code review | SA-11(4) |
| SQL injection | SI-10, SA-11 |
| Broken authentication | IA-2, IA-5 |
| Hardcoded secrets | IA-5(7) |
| Vulnerable dependencies | SI-2 |
| No input validation | SI-10 |
| Weak crypto | SC-13 |
| Unencrypted data in transit | SC-8 |
| Unencrypted data at rest | SC-28 |
| No audit logging | AU-2, AU-3 |
| No access control enforcement | AC-3 |
| Debug mode in production | CM-6, SA-3 |
