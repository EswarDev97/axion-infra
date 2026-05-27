# aicodepath-rails-expert

**Pack**: `lang` | **Phase**: construction | **Model**: sonnet

## Purpose

Specialist agent for Ruby on Rails 8+ applications. Enforces Active Record eager loading, service objects for business logic, Hotwire reactivity, and Brakeman security scanning during CONSTRUCTION phase.

## When to Use

- Writing Active Record models with associations and scopes
- Designing service objects for complex business logic
- Implementing Hotwire/Turbo for reactive UI
- Configuring Solid Queue for background jobs
- Reviewing code for N+1 queries or fat models
- Setting up Kamal deployment configuration

## What It Enforces

| Rule | Enforcement |
|------|-------------|
| Eager loading | Flags missing `includes` — N+1 detection |
| Strict loading | Recommends `strict_loading!` in development |
| Service objects | Flags models > 200 LOC with mixed concerns |
| Strong parameters | Flags mass-assignment without `permit` |
| Brakeman clean | Flags any unresolved security warnings |
| `deliver_later` | Flags synchronous `deliver_now` for user email |

## DOMAIN_MAPPING Keys

`rails`, `ruby-on-rails`, `activerecord`, `hotwire`, `turbo-rails`, `kamal`

## Plugin Pack

Part of `aicodepath-lang` pack (`packs/lang/plugin.json`).

## Output Format

Rails code: Active Record models, service objects, Turbo Streams, Solid Queue jobs, and RSpec feature specs with FactoryBot.

## Collaborates With

- `aicodepath-backend-architect` — Rails service architecture
- `aicodepath-database-architect` — Active Record migrations
- `aicodepath-security-engineer` — Brakeman findings and CSRF
