# NAMING.md — MindFlow
Version: 1.0
Status: ACTIVE — GOVERNED BY AGENT.md
Last Updated: 2026-01-12

════════════════════════════════════════════
NAMING IS A CONTRACT, NOT A CONVENIENCE
════════════════════════════════════════════

## 1. Core Naming Principles (NON-NEGOTIABLE)

1. Names define meaning, scope, and responsibility.
2. Once a name is approved, it is PERMANENT.
3. No name may be reinterpreted, shortened, pluralized, or aliased.
4. Consistency takes precedence over elegance or brevity.
5. If two names feel similar, one of them is wrong.

If uncertainty exists → STOP and ASK.

---

## 2. Product & Domain Terms

- Product Name: MindFlow (PascalCase)
- Domain terms must be:
  - Explicit
  - Descriptive
  - Unambiguous

❌ Forbidden:
- Synonyms
- Acronyms
- Contextual reinterpretation

---

## 3. Module Naming

Format: PascalCase  
Rule: Singular, responsibility-based

Examples:
- MindMap
- TaskManager
- TrainingHub
- ExpenseTracker
- ComplaintRegistry
- FoundationLayer

Rules:
- One module = one responsibility
- No overlapping scope between modules
- No plural module names
- No abbreviations

---

## 4. Submodule & Component Naming

Format: PascalCase  
Rule: Must include parent context

Examples:
- TaskManagerWorkflow
- TaskManagerPolicy
- ExpenseTrackerApproval

Rules:
- Submodules cannot exist without a parent module
- No generic names (Helper, Utils, Common)

---

## 5. File Naming

Format:
- lowercase
- kebab-case
- descriptive

Examples:
- task-approval-policy.md
- expense-validation-rules.php

Rules:
- Filenames must reflect responsibility
- No numbered files
- No temporary naming

---

## 6. API Naming

- REST only
- Versioned explicitly

Path format:
/api/v{version}/{resource}

Rules:
- kebab-case paths
- Noun-based resources
- No verbs in URLs

Example:
GET /api/v1/tasks

---

## 7. Database Naming

### Tables
- snake_case
- plural nouns

Example:
- tasks
- expense_claims

### Columns
- snake_case
- Explicit meaning

Boolean prefixes (mandatory):
- is_
- has_
- can_
- should_

---

## 8. Statuses, Enums & Constants

Format: UPPER_SNAKE_CASE

Rules:
- Status names must describe state, not action
- No overlapping or ambiguous statuses
- One status lifecycle per entity

Example:
- TASK_STATUS_PENDING_REVIEW
- EXPENSE_STATUS_APPROVED

---

## 9. UI & Workflow Labels

Rules:
- UI labels must map 1:1 with backend terms
- No UI-only terminology
- No marketing language in system labels

---

## 10. Prohibited Naming Behaviors

❌ Creative renaming  
❌ Alias creation  
❌ Silent casing changes  
❌ Context-based reinterpretation  
❌ “This means the same thing” assumptions  

---

## 11. Naming Conflict Resolution

If a naming conflict arises:
1. STOP work immediately
2. Document the conflict
3. Propose resolution options
4. WAIT for explicit approval

════════════════════════════════════════════
END OF NAMING.md
════════════════════════════════════════════
