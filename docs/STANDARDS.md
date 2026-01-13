# STANDARDS.md — MindFlow
Version: 1.0
Status: ACTIVE — GOVERNED BY AGENT.md
Last Updated: 2026-01-12

════════════════════════════════════════════
STANDARDS EXIST TO PREVENT ENTROPY
════════════════════════════════════════════

## 1. Foundational Philosophy

- Explicit is better than implicit
- Stable is better than clever
- Traceable is better than fast
- Governance is a feature

---

## 2. Documentation-First Rule

No work may begin unless the following are defined:
- Purpose
- Inputs
- Outputs
- Failure modes
- Ownership

If any are missing → STOP.

---

## 3. Single Responsibility Enforcement

Every module, workflow, and component must:
- Do ONE thing
- Own its data
- Expose explicit interfaces

No shared ownership allowed.

---

## 4. Boundary & Dependency Rules

- No circular dependencies
- No implicit cross-module access
- All dependencies must be documented

Violations are INVALID.

---

## 5. Standards Gate (MANDATORY)

Before generating:
- Code
- APIs
- Schemas
- Workflows
- UI logic

Claude MUST:
1. Validate AGENT.md
2. Validate NAMING.md
3. Validate SDLC phase alignment
4. Validate boundary compliance

If any check fails → REFUSE.

---

## 6. Change & Evolution Control

- Backward compatibility preferred
- Breaking changes require:
  - Justification
  - Migration plan
  - Explicit approval

---

## 7. Error & Exception Discipline

- No silent failures
- All errors must be named
- All errors must be documented
- Recovery strategy required

---

## 8. Security & Compliance Defaults

- Least privilege by default
- Explicit access control
- No hardcoded secrets
- Auditability is mandatory

---

## 9. Testing & Validation

- Each module must have validation logic
- Edge cases must be identified
- No placeholder tests

---

## 10. Performance & Optimization

- No premature optimization
- Performance changes require measurement
- Trade-offs must be documented

---

## 11. Output Declaration Rule

Every output must clearly state:
- What it introduces
- What it modifies
- What it depends on
- What it explicitly does NOT change

---

## 12. Drift Prevention

The following are forbidden:
❌ Duplicate workflows  
❌ Parallel status systems  
❌ Overlapping responsibilities  
❌ Hidden dependencies  

════════════════════════════════════════════
END OF STANDARDS.md
════════════════════════════════════════════
