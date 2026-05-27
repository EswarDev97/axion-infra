# Claude Code Efficiency Patterns: Permutation Frameworks

**Source**: https://claudefa.st/blog/guide/performance/efficiency-patterns
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM]

## Problem & Quick Win

**Problem**: Building similar features one by one wastes time and creates inconsistent code
patterns.

**Quick Win**: Add this to your `CLAUDE.md`:

```
# Component Generation Framework

When creating new [cards/forms/modals], follow the pattern in /components/examples/:

1. Copy the closest existing example
2. Replace data fields (keep structure identical)
3. Update types to match new data model
4. Run existing tests as template for new tests
```

This eliminates Claude's tendency to reinvent patterns that already exist in your codebase.

## What Are Permutation Frameworks?

A structured approach where you build 10+ similar features manually, then create a `CLAUDE.md`
template that lets Claude generate the 11th, 12th, 13th variations reliably. Instead of coding
each feature from scratch, you establish the pattern once and let Claude fill in the
variations. Shifts your role from implementation to orchestration.

## Three-Phase Development

### Phase 1: Manual Foundation Building

Implement 8–12 similar features by hand. Document every decision, pattern, and constraint.

```
# Track your patterns
mkdir patterns/user-interfaces
# Build: LoginForm, SignupForm, ProfileForm, etc.
# Document decisions in each component
```

Example: building UsersTable, OrdersTable, InvoicesTable, ProductsTable. Build the first three
manually. Notice the same decisions recurring: column definition format, sort handler shape,
pagination component, empty state layout, loading skeleton structure. By the third table you
can articulate exactly what **varies** (column definitions, data types, API endpoint) and what
**stays constant** (table wrapper, pagination logic, sort state management, row selection).

**Before (building each table from scratch):**

```
// Each table re-implements pagination, sorting, selection...
// UsersTable: 180 lines
// OrdersTable: 195 lines (slightly different pagination)
// InvoicesTable: 210 lines (different sort logic)
```

**After (pattern extracted):**

```
// Shared DataTable component: 120 lines
// UsersTable config: 35 lines (just column definitions + endpoint)
// OrdersTable config: 40 lines
// InvoicesTable config: 38 lines
```

### Phase 2: Pattern Recognition and Templating

Analyze manual implementations to identify:

- Common code structures that repeat
- Variable elements that change
- Constraints that ensure quality (type safety, accessibility, test coverage)
- Success criteria for validating each variation

Be concrete. **Weak:**

```
Create new table components following existing patterns.
```

**Strong:**

```
# Data Table Framework

Reference: /components/tables/UsersTable.tsx (canonical)

To create a new [Entity]Table:

1. Props: { columns: ColumnDef<Entity>[], endpoint: string, defaultSort: SortConfig }
2. Use DataTable wrapper from /components/shared/DataTable.tsx
3. Column definitions follow the format in UsersTable lines 12-28
4. Include loading skeleton matching the column count
5. Empty state uses /components/shared/EmptyState.tsx with entity-specific message
6. Tests: copy UsersTable.test.tsx, replace User fixtures with [Entity] fixtures
```

The strong version points Claude to exact files, line numbers, and shared components. Claude
doesn't guess; it follows a verified path.

### Phase 3: Automated Generation

First generation: compare output line-by-line against your manual implementations. Find 1–2
places where instructions weren't specific enough. Fix and regenerate. After 3–4 iterations,
framework produces consistent output that passes review without manual adjustment.

## Framework Refinement Strategies

### Constraint-Based Quality Control

```
CONSTRAINTS:

- All components must include PropTypes / TypeScript interfaces
- Use established naming conventions (camelCase for props)
- Include accessibility attributes (aria-label, role, tabIndex)
- Follow existing file structure in /components/
- Every new component gets a co-located test file
```

### Variance Testing

Generate 5–10 variations and analyze consistency. Example: adding the single constraint
"All endpoints return `{ data: T, error: null }` or `{ data: null, error: ErrorShape }`"
eliminated response-shape variance across subsequent generations.

### Iterative Improvement

Each iteration should improve Claude's adherence AND your understanding of what creates
reliable AI-generated code.

## Permutation Framework in Action

```
# Card Component Framework

Reference: /components/cards/UserCard.tsx (canonical example)

To create a new [Entity]Card:

1. Props: { data: [Entity], onClick?: () => void, variant?: 'compact' | 'full' }
2. Structure: Avatar/Icon + Title + Subtitle + Action buttons
3. Styling: Use existing Tailwind classes from UserCard
4. Tests: Copy UserCard.test.tsx, replace User with [Entity]
```

Now "create a SubscriptionCard" produces a component indistinguishable from one you built by
hand.

## Common Patterns

- **API endpoints** — consistent error handling, validation, response shapes (Zod schema, error
  format, middleware chain).
- **UI components** — cards, modals, forms, list items, detail views. Anything in 3+ variations
  is a framework candidate.
- **Database operations** — CRUD with consistent transaction handling, query builder,
  pagination, soft-delete.

## When NOT to Optimize

- **Only 1–2 examples** — you'll over-fit. Need 3+ to separate variance from constants.
- **One-off features** — framework overhead with no payoff.
- **Patterns not stabilized** — first month of a new project means constant rework. Wait until
  8–10 manual builds have settled the pattern.
- **Over-constraining** — if framework is too rigid, you fight it more than it saves you.

## Success Metrics

- **Consistency score** — do generated variations use same imports, prop patterns, file structure?
- **Implementation speed** — well-tuned framework measurably reduces request-to-feature time.
- **Review time** — should decrease as the framework matures.
- **Bug frequency** — good framework reduces bugs because it encodes battle-tested patterns.

## From Linear to Exponential Scaling

Traditional development scales linearly. Permutation frameworks change the economics: one
framework generates multiple feature variations. Compound effect — frameworks across
components + API + database layers make full-stack features assemble in a fraction of the
time.

## Next Actions

1. **Today**: Find 3 similar components in your codebase.
2. **This week**: Build your first framework.
3. Master `CLAUDE.md` techniques for framework documentation.
4. Use planning modes to structure complex framework requests.
5. Apply model selection strategies to balance cost and quality.
6. Set up feedback loops for continuous improvement.
7. Run systematic tests to validate output quality.
