# aicodepath-javascript-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When writing modern JavaScript (ES2024+) for browser or Node.js — enforces async patterns, modules, performance optimization, and idiomatic ES patterns. Triggered by: `.js`/`.mjs` files, `package.json` without TypeScript, JavaScript questions.

## What It Does

- Enforces ES modules (`import`/`export`) — never CommonJS in new projects
- Requires `async/await` for all async operations (no `.then()` chains)
- Applies `structuredClone` for deep copies; `AbortController` for cancellation
- Configures Vitest with ES module support and 80%+ coverage
- Uses Vite/esbuild for bundling; `node:20-alpine` Docker base
- Flags `var`, `==`, argument mutation, unhandled promise rejections

## Key Standards

- ESLint `eslint:recommended` + `plugin:n/recommended`
- Prettier for formatting
- `guidelines/javascript-rules.json` — module style, async patterns

## Collaborates With

- `aicodepath-typescript-expert` — Migration path and gradual type adoption
- `aicodepath-backend-architect` — Node.js server patterns
- `aicodepath-frontend-architect` — Browser JavaScript and bundling
- `aicodepath-test-engineer` — Vitest/Jest configuration
