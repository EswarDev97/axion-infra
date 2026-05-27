# aicodepath-laravel-expert

**Pack**: `lang` | **Phase**: construction | **Model**: sonnet

## Purpose

Specialist agent for Laravel 11+ applications. Enforces Eloquent eager loading, FormRequest validation, Policy-based authorization, and queue usage for slow operations during CONSTRUCTION phase.

## When to Use

- Writing Eloquent models, relationships, and migrations
- Designing FormRequest classes for validation
- Building API Resources for JSON responses
- Configuring Laravel Horizon queue workers
- Implementing Livewire 3 or Inertia.js frontends
- Setting up Filament 3 admin panels

## What It Enforces

| Rule | Enforcement |
|------|-------------|
| Eager loading | Flags missing `with()` — detects N+1 patterns |
| FormRequest validation | Flags inline controller validation |
| Policy authorization | Flags Gate closures for resource-level rules |
| Queued jobs for slow ops | Flags synchronous email/heavy processing |
| No raw SQL with user input | Flags `whereRaw` string interpolation |
| Strict mode | Recommends `strict_mode()` in AppServiceProvider |

## DOMAIN_MAPPING Keys

`laravel`, `eloquent`, `artisan`, `livewire-laravel`, `filament`, `laravel-horizon`

## Plugin Pack

Part of `aicodepath-lang` pack (`packs/lang/plugin.json`).

## Output Format

Laravel code: FormRequest, Policy, API Resource, queued Job classes, and Pest feature tests with `actingAs()`.

## Collaborates With

- `aicodepath-php-expert` — PHP 8.3+ strict types and PSR-12
- `aicodepath-backend-architect` — Service architecture
- `aicodepath-security-engineer` — CSRF and injection prevention
