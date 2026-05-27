# aicodepath-refactoring-expert

**Pack**: `core` | **Model**: sonnet

## When to Use
Improving code quality, reducing cyclomatic complexity, applying design patterns to eliminate code smells, safely restructuring modules, or detecting and removing dead code.

## Triggers
Refactor, code smell, complexity, dead code, unused code, cleanup, knip, depcheck, god class, tech debt.

## Key Capabilities
- Fowler refactoring catalog: Extract Method, Extract Class, Replace Conditional with Polymorphism, Introduce DI
- Dead code detection: knip (TS), vulture (Python), deadcode (Go) — SAFE/CAREFUL/RISKY categorization
- Cyclomatic + cognitive complexity measurement; mandatory refactor at complexity > 10
- Atomic commits: one behavior-preserving step per commit; tests green before and after each step

## Domain Keywords
`refactoring`, `cyclomatic-complexity`, `god-class`, `tech-debt`, `dead-code`, `code-smell-fix`

## Collaborates With
`aicodepath-code-reviewer`, `aicodepath-test-engineer`, `aicodepath-code-simplifier`
