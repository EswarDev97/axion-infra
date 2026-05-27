# aicodepath-angular-expert

## When to Use

Invoke when writing or reviewing Angular code in any context — new components, services, NgRx stores, routing configuration, or Angular Material UI. Triggered automatically when `angular.json` is detected in the project, when `.component.ts` files are modified, or when the task involves Angular 15+ standalone components, signals, NgRx state management, RxJS operator chains, or deferrable views.

## What It Does

- Generates standalone components with `ChangeDetectionStrategy.OnPush` and `inject()` function-based dependency injection — no constructor injection, no NgModules in new code
- Applies Angular signals (`signal()`, `computed()`, `effect()`) for reactive state and flags `BehaviorSubject` patterns where signals apply
- Enforces new Angular control flow syntax (`@if`, `@for`, `@switch`, `@defer`) over legacy structural directives (`*ngIf`, `*ngFor`)
- Designs NgRx state slices using `signalStore()` (NgRx 17+) or classic `createReducer`/`createSelector` with memoized selectors and typed state interfaces
- Reviews RxJS pipelines for correctness: enforces `switchMap`/`combineLatest`/`takeUntilDestroyed` and flags nested `subscribe()` calls, manual `unsubscribe()` in `ngOnDestroy`, and memory leaks
- Configures lazy-loaded routes with `loadComponent`/`loadChildren`, route-level `provideState()`/`provideEffects()`, and typed `Route[]` arrays
- Writes tests using `TestBed.configureTestingModule`, `@testing-library/angular`, and marble testing for RxJS streams with >85% coverage target

## Example Invocations

- "Write an Angular standalone component for a product list with NgRx signals store"
- "Review this Angular service for RxJS subscription management and memory leaks"
- "Convert this NgModule-based component to standalone with signals and OnPush"
- "Set up lazy-loaded feature routes with NgRx state and effects"
- "Add deferrable views to this Angular page for above-the-fold optimization"

## Output Format

Angular source files with:
- `standalone: true` and `ChangeDetectionStrategy.OnPush` on every component
- `inject()` for dependency injection (no constructor injection)
- Signals for local reactive state; NgRx signalStore for shared state
- New control flow syntax (`@if`, `@for`, `@defer`) throughout templates
- `takeUntilDestroyed()` on all RxJS subscriptions
- Colocated `*.spec.ts` tests using `@testing-library/angular`
- Lazy-loaded routes with `loadComponent` and typed `Route[]`

## Patterns Enforced

| Pattern | Enforced Behavior |
|---------|------------------|
| Standalone components | No `NgModule` declarations in new code |
| Change detection | `OnPush` on every component |
| Dependency injection | `inject()` function — not constructor parameters |
| Reactive state | `signal()` / `computed()` for local state; NgRx signalStore for shared |
| Template control flow | `@if`/`@for`/`@switch`/`@defer` — not `*ngIf`/`*ngFor` |
| Subscription management | `takeUntilDestroyed()` or `async` pipe — no manual `unsubscribe()` |
| Route lazy loading | `loadComponent` / `loadChildren` on all feature routes |
| Template expressions | No function calls in templates — use signals or pipes |

## Integration With Other Agents

- `aicodepath-typescript-expert` — TypeScript strict mode, generic constraints, and utility types used in Angular services and stores
- `aicodepath-frontend-architect` — Component hierarchy decisions, state topology (local vs shared), and feature module boundaries
- `aicodepath-ui-designer` — Angular Material 3 theming, design tokens, and custom component styling with `@angular/material`
- `aicodepath-test-engineer` — Component testing strategy, TestBed configuration, and coverage gate enforcement
- `aicodepath-performance-engineer` — OnPush optimization, `trackBy` / `track` in `@for`, bundle analysis with `@angular/build`
