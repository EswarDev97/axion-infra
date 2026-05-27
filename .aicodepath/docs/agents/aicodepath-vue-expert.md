# aicodepath-vue-expert

**Pack**: `lang` | **Phase**: construction | **Model**: sonnet

## Purpose

Specialist agent for Vue 3 applications. Enforces Composition API patterns, Pinia state management, Nuxt 3 conventions, and Vue 3.4+ features throughout CONSTRUCTION phase.

## When to Use

- Writing `.vue` SFC components with `<script setup>`
- Designing Pinia stores and composables
- Building Nuxt 3 SSR/SSG applications
- Debugging Vue reactivity issues (ref vs reactive, toRefs)
- Reviewing Vue code for Options API remnants or reactivity pitfalls
- Integrating Vue Router 4 with typed routes

## What It Enforces

| Rule | Enforcement |
|------|-------------|
| `<script setup>` syntax only | Flags Options API (`data()`, `methods`, computed object) |
| Pinia for global state | Flags Vuex usage |
| Typed props/emits | Requires `defineProps<T>()` and `defineEmits<T>()` |
| Composable extraction | Flags logic repeated 3+ times without extraction |
| No reactivity loss | Flags destructuring of reactive objects without `toRefs` |
| `v-for` keys | Flags missing `key` attributes |

## DOMAIN_MAPPING Keys

`vue`, `vuejs`, `nuxt`, `pinia`, `composition-api`, `vue-router`, `vue-sfc`

## Plugin Pack

Part of `aicodepath-lang` pack (`packs/lang/plugin.json`).

## Output Format

Vue 3 SFCs: `<script setup lang="ts">`, typed props/emits, Pinia stores, composables, Vitest test files.

## Collaborates With

- `aicodepath-frontend-architect` — Component architecture decisions
- `aicodepath-typescript-expert` — TypeScript in Vue context
- `aicodepath-performance-engineer` — Bundle optimization
