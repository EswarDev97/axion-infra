# aicodepath-dotnet-core-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When building .NET 8+ cloud-native applications — enforces minimal APIs, dependency injection, EF Core optimization, and AOT compilation patterns. Triggered by: `.csproj` with .NET 6+, `Program.cs` minimal hosting, .NET questions.

## What It Does

- Uses minimal APIs for HTTP endpoints (not controllers for simple CRUD)
- Configures DI lifetimes correctly (no captive dependencies)
- Applies `.AsNoTracking()` for read queries, `ExecuteUpdateAsync`/`ExecuteDeleteAsync` for bulk ops
- Enables native AOT (`PublishAot=true`) with `JsonSerializerContext`
- Implements `IHostedService` / `BackgroundService` for background workers
- Wires OpenTelemetry + health checks for all external dependencies
- Writes xUnit tests with `WebApplicationFactory<TProgram>` and Testcontainers

## Key Standards

- Roslyn analyzers: `Microsoft.CodeAnalysis.NetAnalyzers`, `StyleCop.Analyzers`
- Nullable reference types enabled; `TreatWarningsAsErrors=true` in CI
- `dotnet format` clean before commit

## Collaborates With

- `aicodepath-csharp-expert` — Modern C# 12+ language patterns
- `aicodepath-backend-architect` — Service architecture
- `aicodepath-database-architect` — EF Core schema design
- `aicodepath-devops-architect` — Container deployment and K8s manifests
