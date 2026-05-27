---
name: aicodepath-frontend-design-review
description: >
  Use when reviewing or validating frontend components, pages, or UI implementations — checks
  design system compliance, accessibility, and component structure. Adapts depth to user expertise:
  guided walkthroughs for beginners, targeted validation for intermediates, on-demand checks for experts.
  Triggered by: "review frontend", "review component", "check design system", "design system compliance",
  "validate component", "accessibility check", "a11y review", "is this component correct".
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: "[component-path]"
---

# Frontend Design Review

Review frontend components against design system standards, accessibility requirements, and structural conventions. Depth adapts to user expertise level.

## Step 1 — Detect Expertise Level

Infer expertise from the conversation context:
- **Beginner**: First time using design system, asking basic questions → guided walkthrough mode
- **Intermediate**: Familiar with the stack, wants targeted feedback → validation mode (default)
- **Expert**: Experienced, specific concerns → on-demand checks only

If unclear, ask: "Should I do a full guided review or just flag specific issues?"

## Step 2 — Locate the Component

If no path provided, search for it:
```bash
# Find component files
find . -name "*.tsx" -o -name "*.jsx" | grep -i "<component-name>" | head -10
```

Read the component file(s). Also read any associated:
- Style files (`.css`, `.module.css`, `.styled.ts`)
- Test files (`*.test.tsx`, `*.spec.tsx`)
- Story files (`*.stories.tsx`)

## Step 3 — Design System Compliance Check

Verify against project design system (look for `design-tokens.ts`, `theme.ts`, `constants/design.ts`, or similar):

**Colors**
- [ ] Uses design tokens/CSS variables — not hardcoded hex/rgb values
- [ ] Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (WCAG AA)

**Typography**
- [ ] Uses typography scale from design system — not arbitrary `font-size` values
- [ ] Line height appropriate for reading (1.4–1.6 for body text)

**Spacing**
- [ ] Uses spacing scale (4px grid or equivalent) — not arbitrary pixel values
- [ ] Consistent padding/margin with adjacent components

**Components**
- [ ] Uses existing design system components (Button, Input, Card, etc.) — not re-implementing them
- [ ] Props match design system component API (check component library source or Storybook)

## Step 4 — Accessibility (a11y) Check

```bash
# Check for common a11y issues
grep -n "onClick\|onKeyDown\|role=\|aria-\|tabIndex\|alt=" <component-file>
```

- [ ] Interactive elements have keyboard handlers (`onKeyDown` alongside `onClick` for non-button elements)
- [ ] Images have `alt` text (empty string `alt=""` for decorative images)
- [ ] Form inputs have associated `<label>` or `aria-label`
- [ ] Focus indicators visible (not `outline: none` without replacement)
- [ ] ARIA roles used correctly — prefer semantic HTML over ARIA where possible
- [ ] Dynamic content changes announced to screen readers (`aria-live`, `role="status"`)
- [ ] Color is not the only way to convey information

## Step 5 — Component Structure Check

- [ ] Single responsibility — component does one thing
- [ ] Props interface typed (TypeScript) with JSDoc for non-obvious props
- [ ] No hardcoded strings that should be i18n keys (if project uses i18n)
- [ ] Loading and error states handled
- [ ] Component is testable — no tight coupling to global state or DOM

## Step 6 — Report Findings

Format findings by severity:

```
## Review: <ComponentName>

### 🔴 Blocking Issues (must fix before merge)
- <finding with file:line reference>

### 🟡 Warnings (should fix)
- <finding with file:line reference>

### 🟢 Suggestions (nice to have)
- <finding with file:line reference>

### ✅ Passing
- Design tokens used correctly
- Accessibility: keyboard navigation works
- <other passing items>
```

## Beginner Mode (Full Guided Walkthrough)

When expertise = beginner, after each finding:
1. Explain WHY it matters (not just what's wrong)
2. Show the exact fix with a code snippet
3. Link to the relevant design system doc or a11y guideline

Example:
> ❌ `color: #2563eb` — hardcoded hex color
> ✅ Use `color: var(--color-primary-600)` instead
> **Why**: Design tokens ensure color consistency and make theming possible. When the design system updates the primary color, your component updates automatically.

## Expert Mode (On-Demand)

When expertise = expert, only flag issues the user explicitly asks about unless there is a Blocking Issue. For blocking issues, always report regardless of mode.

## NEVER

- **NEVER** skip the accessibility check because "it looks fine visually" — the most critical a11y violations (missing `aria-label`, absent keyboard handlers, poor contrast) are invisible to sighted reviewers. A visually clean component can be completely unusable for screen reader users or keyboard-only navigation. Run the a11y checklist steps regardless of how the component appears.
- **NEVER** approve hardcoded color hex values even in "just a prototype" — hardcoded colors are the most common source of design system drift. Once a hex value is committed, it gets copy-pasted into the next component, and the next. A design token change later has to hunt down 40 hardcoded instances instead of updating one variable. Flag it even early-stage.
- **NEVER** infer that a component "uses the design system" without verifying the component library source — a `<Button>` import might be from a local implementation, a third-party library, or the actual design system. Check the import path explicitly. Local re-implementations look identical but diverge from design system behavior over time.
- **NEVER** report findings without file:line references — "this component has poor contrast" gives the developer nothing to act on. "Button.tsx:23 — `color: #9ca3af` has a 2.1:1 contrast ratio against the white background, fails WCAG AA" is actionable. Every finding must have a precise location.
- **NEVER** apply expert mode to suppress accessibility or design token violations even when asked — these are not style preferences; they are measurable standards with user impact. Expertise level controls verbosity and explanation depth, not whether mandatory checks are reported.
