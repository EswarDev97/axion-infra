# aicodepath-dotnet-framework-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When maintaining or modernizing .NET Framework 4.8 legacy applications — covers WCF, Web Forms, ASP.NET MVC 5, Entity Framework 6, and gradual migration paths to .NET Core. Triggered by: `.NET Framework 4.x` in `.csproj`, `Web.config`, legacy .NET questions.

## What It Does

- Maintains backward compatibility — zero breaking API changes without versioning
- Applies `async/await` + EF6 async methods on web request paths
- Plans strangler fig migration to .NET 8 (never big-bang rewrite)
- Writes characterization tests with `ApprovalTests` before any refactoring
- Migrates `packages.config` → `PackageReference`; adds Serilog structured logging
- Deploys via MSBuild + Web Deploy / IIS; EF6 `migrate.exe` in CI

## Key Standards

- Preserve existing codebase conventions (minimize diff noise)
- Security baseline: patch CVEs, update vulnerable NuGet packages
- `guidelines/security-rules.json` — auth, secret management

## Collaborates With

- `aicodepath-legacy-modernizer` — Strangler fig migration strategy
- `aicodepath-csharp-expert` — Modern C# patterns where compatible
- `aicodepath-dotnet-core-expert` — Target .NET 8 architecture
- `aicodepath-test-engineer` — Characterization test creation
