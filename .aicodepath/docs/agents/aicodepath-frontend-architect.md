# aicodepath-frontend-architect

**Model**: sonnet | **Phase**: INCEPTION/CONSTRUCTION | **Type**: Read + Write (docs) | **Pack**: design

Specialist in React/Vue/Angular component hierarchies, state management, data fetching strategies, bundle optimization, micro-frontends, and Core Web Vitals.

## When to Invoke

- Building or reorganizing a component hierarchy for a new feature or app
- Designing state management strategy (Redux Toolkit, Zustand, Pinia, NgRx, Context API)
- Choosing a data fetching and caching approach (TanStack Query, SWR, tRPC, Apollo)
- Auditing bundle size or defining performance budgets
- Planning micro-frontend splits with Module Federation
- Reviewing TypeScript strict patterns across a frontend codebase
- Optimizing Core Web Vitals (LCP, INP, CLS)
- Choosing between CSR, SSR, SSG, RSC, or islands architecture
- CSS architecture decisions (CSS Modules, Tailwind, CSS-in-JS, Griffel)

## What to Provide

- Framework in use (React / Vue / Angular) and version
- Key user flows and screen count
- Bundle size budget or existing bundle analysis output
- Whether SSR/SSG/ISR/RSC is in scope
- Team size and micro-frontend requirements (if any)

## What to Expect

- Component hierarchy recommendation with folder structure and ownership
- State management strategy with rationale per state category
- Data fetching architecture with caching configuration, stale times, and error handling
- Bundle optimization recommendations with estimated savings (table format)
- Core Web Vitals baseline assessment and improvement plan
- TypeScript patterns suited to the identified domain

## Standards Enforced

- `guidelines/fluent-design-rules.json` — JSX pragma, assertSlots, no inline styles on Fluent components
- `guidelines/architecture-rules.json` — component responsibility boundaries, no circular imports
- `guidelines/coding-standards.json` — TypeScript strict mode, naming conventions, import ordering
- Core Web Vitals budgets: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Bundle size budget: < 200KB gzipped initial JavaScript

## Integration

- **DOMAIN_MAPPING keys**: `component`, `react`, `vue`, `angular`, `svelte`, `css`, `style`, `responsive`, `accessibility`, `a11y`, `animation`, `theme`, `state`, `redux`, `dom`, `render`, `webpack`, `vite`, `bundler`, `design-system`, `navigation`, `form`, `frontend`, `ui`, `micro-frontend`, `module-federation`, `web-vitals`, `hydration`, `server-components`, `zustand`, `swr`
- **Taxonomy**: `frontend` component type, `design/construction` phase

## Collaborates With

- `aicodepath-ui-designer` — Design tokens, component specs, Figma-to-code handoff
- `aicodepath-api-designer` — Data contracts, OpenAPI schemas, tRPC router design
- `aicodepath-performance-engineer` — Bundle optimization, rendering profiling, Lighthouse CI
- `aicodepath-ux-designer` — Interaction patterns, user flows, accessibility requirements
