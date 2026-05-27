# Rust Patterns

Reference guide for idiomatic Rust patterns used in construction-phase development.

## Ownership & Borrowing

Every value has exactly one owner. Borrowing grants temporary access without transfer.
Rule: at any time, either one `&mut` reference OR any number of `&` references.

```rust
// Move semantics
let s = String::from("hello");
let t = s;  // s moved — compiler error if s is used after

// Borrowing
fn read_len(s: &str) -> usize { s.len() }
let s = String::from("hello");
println!("{}", read_len(&s));  // s still valid
```

## Error Handling with thiserror & anyhow

Use `thiserror` for library errors; `anyhow` for application errors:

```rust
#[derive(Debug, thiserror::Error)]
pub enum MyError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}
```

## Traits

Define interfaces as traits; use generics for zero-cost polymorphism:

```rust
pub trait Notify {
    fn send(&self, msg: &str) -> Result<(), MyError>;
}
```

## Builder Pattern

```rust
#[derive(Default)]
pub struct QueryBuilder {
    table: Option<String>,
    limit: Option<usize>,
}

impl QueryBuilder {
    pub fn table(mut self, t: &str) -> Self { self.table = Some(t.into()); self }
    pub fn limit(mut self, n: usize) -> Self { self.limit = Some(n); self }
}
```

## Newtype Pattern

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UserId(u64);
```

Prevents mixing semantically distinct IDs at compile time.

## Async with Tokio

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let data = tokio::fs::read_to_string("config.toml").await?;
    println!("{data}");
    Ok(())
}
```
