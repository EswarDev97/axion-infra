# aicodepath-elixir-expert

**Pack**: `lang` | **Phase**: construction | **Model**: sonnet

## Purpose

Specialist agent for Elixir/OTP systems. Enforces proper supervision tree design, GenServer patterns, Phoenix LiveView best practices, and Ecto schema conventions during CONSTRUCTION phase.

## When to Use

- Designing OTP supervision trees and process hierarchies
- Implementing GenServer, Agent, or Task processes
- Building Phoenix LiveView real-time UI
- Writing Ecto schemas, changesets, and queries
- Debugging Elixir concurrency or process lifecycle issues
- Reviewing code for defensive error handling (anti-pattern)

## What It Enforces

| Rule | Enforcement |
|------|-------------|
| "Let it crash" philosophy | Flags `try/rescue` defensive error handling |
| Supervision for all processes | Flags unsupervised `spawn` calls |
| GenServer minimal state | Flags GenServer state > reasonable complexity |
| Ecto changesets for validation | Flags validation outside changesets |
| Pattern matching over conditionals | Flags `if/cond` where function heads apply |
| Dialyzer `@spec` on public APIs | Flags missing type specs on public functions |

## DOMAIN_MAPPING Keys

`elixir`, `otp`, `genserver`, `phoenix-framework`, `ecto`, `phoenix-liveview`

## Plugin Pack

Part of `aicodepath-lang` pack (`packs/lang/plugin.json`).

## Output Format

Elixir modules with supervision tree design, GenServer with `@spec`, Ecto schemas + changesets, ExUnit tests with `async: true`.

## Collaborates With

- `aicodepath-backend-architect` — Phoenix service architecture
- `aicodepath-database-architect` — Ecto schema and query design
- `aicodepath-sre-engineer` — Distributed Erlang reliability
