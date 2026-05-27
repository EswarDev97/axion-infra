# aicodepath-golang-expert

## When to Use

Invoke when writing or reviewing Go code in any context — new services, CLI tools, gRPC servers, Kubernetes operators, or library packages. Triggered automatically when `go.mod` is detected in the project or when the task involves goroutines, channels, Go modules, concurrency patterns, or Go 1.22+ language features.

## What It Does

- Enforces idiomatic Go: explicit error handling with `%w` wrapping, `errors.Is`/`errors.As` checking, and no silently ignored errors
- Reviews and designs safe concurrency patterns: goroutine lifecycle management, `context.Context` propagation, `sync.WaitGroup`/`errgroup`, and channel-based shutdown
- Generates table-driven tests with `t.Run()` subtests, benchmarks, and race-detector-compatible test suites
- Flags anti-patterns: goroutine leaks, naked returns, `panic()` in library code, interface pollution, and shared mutable state without synchronization
- Configures Go toolchain quality gates: `go vet`, `staticcheck`, `golangci-lint`, and multi-stage Docker builds for Go services

## Example Invocations

- "Write a concurrent worker pool in Go with graceful shutdown"
- "Review this Go HTTP handler for idiomatic error handling and context propagation"
- "Set up golangci-lint and write table-driven tests for this Go package"

## Output Format

Go source files with:
- Explicit error handling on every function that returns `error`
- `context.Context` as the first parameter for all I/O functions
- Table-driven tests colocated in `*_test.go` files
- Godoc-format comments on all exported types and functions
- `go vet` and `staticcheck` clean, race-detector-free

## Related Agents

- `aicodepath-backend-architect` — Go service architecture, API design, and domain modeling
- `aicodepath-devops-architect` — Go service containerization, multi-stage Dockerfiles, and Kubernetes deployment
