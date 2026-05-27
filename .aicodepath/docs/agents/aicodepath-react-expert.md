# aicodepath-react-expert

## When to Use

Invoke when writing or reviewing React components, pages, or hooks. Triggered automatically when React imports are detected, or when the task involves `.jsx`/`.tsx` component files, React 18+ patterns (Server Components, Suspense, concurrent features), or hook composition.

## What It Does

- Enforces React 18+ patterns: Server Components vs. Client Components boundary, `use client` directive placement, and concurrent rendering safety
- Designs composable hook architecture: custom hooks with single responsibility, `useCallback`/`useMemo` with correct dependency arrays, and `useReducer` for complex state
- Implements performance optimization: `React.memo` with stable prop references, code splitting with `React.lazy`/`Suspense`, and avoiding unnecessary re-renders
- Applies accessibility: semantic HTML, ARIA attributes, keyboard navigation, and focus management in interactive components
- Generates co-located tests: React Testing Library with `userEvent`, `screen` queries by role/label, and no implementation detail assertions
- Flags anti-patterns: prop drilling beyond 2 levels, direct DOM mutation, missing `key` props, and Effect cleanup gaps

## Example Invocations

- "Write a React 18 Server Component for a paginated data table with streaming"
- "Review this component for unnecessary re-renders and hook dependency issues"
- "Add React Testing Library tests for this form with validation"

## Output Format

React source files with:
- Clear Server/Client Component boundary with `'use client'` only where necessary
- Custom hooks extracted to `hooks/use*.ts` with JSDoc
- RTL tests in `*.test.tsx` using `screen` + `userEvent`
- No inline styles — CSS modules or Tailwind only
- TypeScript props interface with `React.FC` avoided (plain function signature preferred)

## Related Agents

- `aicodepath-typescript-expert` — TypeScript strict typing for React props, generics, and discriminated unions
- `aicodepath-nextjs-expert` — Next.js App Router, Server Actions, ISR/SSR strategies built on React
- `aicodepath-frontend-architect` — Component hierarchy, state management architecture, and bundle optimization
