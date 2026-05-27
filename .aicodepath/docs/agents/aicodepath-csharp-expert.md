# aicodepath-csharp-expert

**Pack**: `lang` | **Phase**: construction | **Model**: sonnet

## Purpose

Specialist agent for C# 12+ and .NET 8+ development. Enforces nullable reference types, records, primary constructors, async/await correctness, and ASP.NET Core minimal API patterns during CONSTRUCTION phase.

## When to Use

- Writing C# classes, records, or interfaces
- Building ASP.NET Core minimal API endpoints
- Designing Entity Framework Core schemas and migrations
- Enforcing nullable reference types and eliminating NRT warnings
- Reviewing C# code for `.Wait()`/`.Result` deadlock risks
- Implementing Blazor Server or WebAssembly components

## What It Enforces

| Rule | Enforcement |
|------|-------------|
| Nullable reference types | Flags `#nullable disable` without justification |
| No `.Wait()`/`.Result` | Deadlock risk — flags in synchronization contexts |
| EF Core `.AsNoTracking()` | Flags read-only queries without tracking disabled |
| No `async void` | Flags except for event handlers |
| `DateTime.UtcNow` | Flags `DateTime.Now` usage |
| Records for DTOs | Flags mutable classes used as data transfer objects |

## DOMAIN_MAPPING Keys

`csharp`, `dotnet`, `asp-net-core`, `entity-framework`, `blazor`, `nuget`

## Plugin Pack

Part of `aicodepath-lang` pack (`packs/lang/plugin.json`).

## Output Format

C# code with nullable types enabled, records for DTOs, async/await throughout, xUnit + FluentAssertions tests, and XML documentation on public API members.

## Collaborates With

- `aicodepath-backend-architect` — ASP.NET Core service architecture
- `aicodepath-database-architect` — EF Core schema and migration design
- `aicodepath-performance-engineer` — Hot path optimization with BenchmarkDotNet
