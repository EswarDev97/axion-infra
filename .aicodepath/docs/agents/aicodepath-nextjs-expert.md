# aicodepath-nextjs-expert

**Pack**: `lang` | **Phase**: construction | **Model**: sonnet

## Purpose

Specialist agent for Next.js 14+ applications. Enforces App Router conventions, Server Components by default, Server Actions for mutations, and proper caching strategies during CONSTRUCTION phase.

## When to Use

- Building Next.js App Router routes and layouts
- Designing Server Component vs Client Component boundaries
- Implementing Server Actions for form mutations
- Configuring ISR/SSR/SSG caching with `revalidate`
- Optimizing Core Web Vitals (LCP, CLS, INP)
- Migrating Pages Router code to App Router

## What It Enforces

| Rule | Enforcement |
|------|-------------|
| App Router only | Flags `getServerSideProps`/`getStaticProps` (Pages Router) |
| Server Components default | Flags unnecessary `'use client'` on layouts/pages |
| Server Actions for mutations | Flags internal API routes used for data writes |
| Caching annotations | Flags fetch calls without `revalidate`/`cache` options |
| `next/image` | Flags raw `<img>` tags |
| `loading.tsx` + `error.tsx` | Flags routes missing these files |

## DOMAIN_MAPPING Keys

`nextjs`, `next-js`, `app-router`, `next-server-actions`, `next-config`, `next-image`

## Plugin Pack

Part of `aicodepath-lang` pack (`packs/lang/plugin.json`).

## Output Format

Next.js App Router files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, Server Actions, caching config, and Playwright E2E tests.

## Collaborates With

- `aicodepath-react-expert` — React patterns within Next.js
- `aicodepath-frontend-architect` — Page architecture and data flow
- `aicodepath-performance-engineer` — Core Web Vitals optimization
