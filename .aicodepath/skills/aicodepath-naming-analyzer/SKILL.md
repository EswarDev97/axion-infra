---
name: aicodepath-naming-analyzer
description: >
  Use when variable, function, or class names are unclear, inconsistent, or don't follow conventions — analyzes naming across files and suggests improvements aligned with AICodePath coding standards. Triggered by: "analyze naming", "fix names", "naming conventions", "rename suggestions", "review variable names", inconsistent naming in code review.
tags:
  - naming
  - conventions
  - code-quality
  - refactoring
  - standards
user-invocable: true
allowed-tools: Read, Glob, Grep
argument-hint: "[path]"
---

# AICodePath Naming Analyzer

Analyze and suggest better variable, function, and class names based on language conventions and aicodepath coding standards.

## Quick Start

```
analyze naming in src/
check naming conventions
review variable names in UserService.js
```

This skill integrates with **aicodepath coding-standards.json** to validate naming patterns and provide actionable recommendations.

---

## Integration with AICodePath

- **Reading coding-standards.json**: Loads naming rules from `.aicodepath/guidelines/coding-standards.json`
- **Validating against guidelines**: Checks code against `class-pascal-case`, `function-camel-case`, `no-single-letter-vars`, etc.
- **Providing actionable fixes**: Suggests specific improvements with rationale
- **Supporting GICL loop**: Helps iterate on code quality during Construction phase

| Phase | Use Case |
|-------|----------|
| **Construction** | Before code commits, review naming for consistency |
| **Validation** | Part of GICL loop — ensure names meet standards |
| **Refactoring** | Identify unclear names that hurt maintainability |
| **Code Review** | Generate naming analysis report for PRs |

---

## Triggers

| Trigger | Example |
|---------|---------|
| Analyze naming | "analyze naming in src/", "check naming conventions" |
| Review specific file | "review naming in UserService.js" |
| Fix naming issues | "fix naming violations", "rename variables" |
| Show conventions | "show naming conventions for TypeScript" |

---

## Instructions

When invoked:

1. **Load AICodePath Guidelines**: Read `coding-standards.json` from `.aicodepath/guidelines/`. Extract naming rules: `class-pascal-case`, `interface-pascal-case`, `constant-screaming-snake`, `function-camel-case`, `no-single-letter-vars`. Use as authoritative validation patterns.

2. **Analyze Existing Names**: Variables, constants, functions, methods, classes, interfaces, types, files/directories, DB tables (if applicable).

3. **Identify Issues**: Unclear/vague names, obscuring abbreviations, inconsistent conventions, misleading names, single-letter variables outside loops, violations of coding-standards.json patterns.

4. **Check Conventions**: Language-specific (camelCase, snake_case, PascalCase), framework conventions (React components, Vue props), project-specific patterns from coding-standards.json. See **`references/conventions.md`** for per-language rules and common issue patterns.

5. **Provide Actionable Suggestions**: Better alternative names with reasoning, consistency improvements, references to specific coding-standards.json rules violated.

---

## Language Conventions & Issue Patterns

For naming conventions by language (JS/TS, Python, Java, Go), common naming issue patterns with code examples, full report format template, naming decision tree, and implementation notes for loading coding-standards.json, read:
**`references/conventions.md`**

---

## Report Format

Use this structure for all naming analysis reports:

```
# Naming Analysis Report

## Summary
- Items analyzed: N
- Issues found: N — Critical: N | Major: N | Minor: N
- AICodePath Guidelines: N violations

## Critical Issues / Major Issues / Minor Issues
[file:line] Current → Suggestion — Reason — Guideline violated (if any)

## AICodePath Guideline Violations
[Guideline ID] — [rule text] — N violations with file:line list

## Suggested Renaming (by priority)
- High: misleading or critical semantic issues
- Medium: clarity + guideline violations
- Low: convention only
```

---

## NEVER

- **NEVER** report a naming issue without a `file:line` reference — "there are vague names in this file" is unactionable. Every finding must point to an exact location so the developer can navigate, understand context, and rename safely.
- **NEVER** flag single-letter variables in loop counters as violations — `i`, `j`, `k` in `for` loops are universally understood conventions. Flagging them as `no-single-letter-vars` violations erodes trust in the report.
- **NEVER** suggest a rename without noting that all call sites need updating — a renamed function with 47 callers that aren't also renamed breaks the codebase. Always include "update all references" or offer a refactoring script.
- **NEVER** classify a misleading function name (behavior doesn't match name) as a convention violation — `getUser()` that updates lastLogin is a semantic mismatch (Critical), not a convention violation (Minor). Wrong severity causes the wrong urgency and order of fixes.
- **NEVER** propose renames for framework-convention names — React component names like `UserList`, Django models like `UserProfile`, and ORM fields matching database columns follow external conventions. Renaming for internal style preferences breaks framework magic.

---

## Best Practices

- Use full words over abbreviations
- Be specific and descriptive; context matters (loop counters `i`, `j`, `k` are fine)
- Well-known abbreviations are acceptable (`html`, `api`, `url`, `id`)
- Consistency within a project is more important than perfect naming
- Use IDE rename refactoring to safely update all references
- Always reference coding-standards.json when available, link violations to specific guideline IDs

---

## Comparison with coding-standards.json

| Aspect | coding-standards.json | aicodepath-naming-analyzer |
|--------|----------------------|---------------------------|
| **Pattern matching** | Regex-based validation | Context-aware semantic analysis |
| **Suggestions** | Error messages only | Specific alternative names with rationale |
| **Semantic checks** | Limited (pattern-only) | Detects misleading names, vague terms, abbreviations |
| **Language support** | Limited per rule | Comprehensive multi-language conventions |
| **Report format** | Pass/fail per rule | Prioritized report with refactoring plan |

**Use both together**: Run coding-standards.json validation (automated) → invoke naming-analyzer for detailed guidance on violations → fix and re-validate.
