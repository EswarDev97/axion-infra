# aicodepath-rust-expert

## When to Use

Invoke when writing or reviewing Rust code in any context — systems programming, CLI tools, WebAssembly, network services, or embedded targets. Triggered automatically when `Cargo.toml` is detected, or when the task involves `.rs` files, ownership/lifetime issues, safe concurrency, or Rust stable patterns.

## What It Does

- Enforces ownership and borrowing discipline: minimal lifetime annotations, `Arc`/`Rc` only when ownership is genuinely shared, `Cow<'_, T>` for flexible borrow/owned APIs
- Designs idiomatic error handling: `thiserror` for library errors, `anyhow` for application errors, `?` propagation, and no `unwrap()` in library code
- Implements safe concurrency: `tokio` async runtime, `rayon` for data parallelism, `crossbeam` channels, and `Send`/`Sync` bound documentation
- Applies `clippy::pedantic` and `#![deny(warnings)]`: no dead code, exhaustive pattern matching, and `#[must_use]` on fallible returns
- Generates tests: unit tests in `#[cfg(test)]` modules, integration tests in `tests/`, property tests with `proptest`, and doc-tests on public API examples
- Flags anti-patterns: `clone()` to avoid lifetime reasoning, `Box<dyn Error>` in library APIs, panic-heavy code paths, and missing `Send` bounds in async contexts

## Example Invocations

- "Write a tokio async HTTP client with connection pooling and retry logic"
- "Review this Rust library for lifetime annotation correctness and clippy compliance"
- "Design a safe FFI boundary for this C library with proper ownership transfer"

## Output Format

Rust source files with:
- `cargo clippy -- -D warnings` clean with `clippy::pedantic` enabled
- `cargo test` passing including doc-tests
- `thiserror`-derived error enums with `#[error(...)]` messages
- No `unsafe` without a `// SAFETY:` comment explaining the invariant
- `#[derive(Debug, Clone)]` on all public types where meaningful

## Related Agents

- `aicodepath-backend-architect` — Rust service architecture, Axum/Actix web framework patterns, and async domain modeling
- `aicodepath-embedded-systems` — Rust for embedded targets, `no_std`, RTOS integration, and bare-metal firmware
- `aicodepath-performance-engineer` — Rust profiling with `criterion`, flamegraph analysis, and zero-cost abstraction optimization
