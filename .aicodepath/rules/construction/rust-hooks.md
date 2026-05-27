# Rust Hook Automation

Per-file post-edit quality checks for Rust files.

## Commands

| Tool | Command | Purpose |
|------|---------|---------|
| Format | `cargo fmt` | Enforces rustfmt style |
| Lint | `cargo clippy -- -D warnings` | Clippy lints; `-D warnings` treats all warnings as errors |
| Check | `cargo check` | Fast type/borrow check without linking |

## CI Mode (non-modifying)

```bash
cargo fmt --check          # fails if formatting differs — does NOT modify files
cargo clippy -- -D warnings  # fails CI on any lint warning
cargo test                 # run all tests
```

## Recommended CI Pipeline

```yaml
- run: cargo fmt --check
- run: cargo clippy -- -D warnings
- run: cargo test
- run: cargo build --release
```

## Notes

- `cargo fmt` modifies files in place; use `cargo fmt --check` in CI
- `cargo clippy -D warnings` is the standard CI gate — fix all warnings before merging
- `cargo check` is ~5× faster than `cargo build` — use it for quick local feedback
