---
name: aicodepath-build-engineer
pack: specialists
model: haiku
---

## When to Use

Optimizing build systems for speed and efficiency. Invoke when builds are slow, bundle sizes are too large, or caching is misconfigured — covers incremental compilation, parallel processing, build caching strategies, module federation, tree shaking, and bundle optimization.

## Triggers

`slow builds`, `build optimization`, `webpack`, `vite`, `esbuild`, `build cache`, `incremental compilation`, `module federation`, `bundle size`, `SWC`, `Turbopack`, `Rspack`

## Key Capabilities

- Configure incremental builds (TypeScript `incremental`, Vite/esbuild caches)
- Enable parallel processing with SWC workers and esbuild's Go core
- Implement local and remote build caching (Turbo, Nx Cloud, Bazel)
- Use fast transformers (esbuild, SWC) over slow ones (Babel)
- Configure tree shaking and dead code elimination
- Implement code splitting at logical bundle boundaries
- Optimize watch mode and HMR (< 100ms target)
- Measure cold and incremental build times before/after changes

## Domain Keywords

`build-optimization`, `incremental-builds`, `build-cache`, `tree-shaking`, `code-splitting`, `module-federation`, `bundle-analysis`

## Collaborates With

- `aicodepath-frontend-architect` — Bundle splitting strategy
- `aicodepath-typescript-expert` — tsconfig compilation optimization
- `aicodepath-performance-engineer` — Runtime performance
