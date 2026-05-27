# Rust Testing

Reference guide for testing Rust code.

## Unit Tests (#[cfg(test)])

Place unit tests in the same file as the code:

```rust
pub fn add(a: i32, b: i32) -> i32 { a + b }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    #[should_panic(expected = "overflow")]
    fn test_overflow() {
        add(i32::MAX, 1);
    }
}
```

Run: `cargo test`

## Integration Tests

Place in `tests/` directory alongside `src/`:

```rust
// tests/integration_test.rs
use mylib::add;

#[test]
fn add_integration() {
    assert_eq!(add(10, 20), 30);
}
```

## Property Testing (proptest)

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn add_commutative(x in 0..100i32, y in 0..100i32) {
        assert_eq!(add(x, y), add(y, x));
    }
}
```

## Benchmarks (criterion)

```rust
use criterion::{criterion_group, criterion_main, Criterion};

fn bench_add(c: &mut Criterion) {
    c.bench_function("add", |b| b.iter(|| add(2, 3)));
}

criterion_group!(benches, bench_add);
criterion_main!(benches);
```

Run: `cargo bench`

## Mocking (mockall)

```rust
#[cfg_attr(test, mockall::automock)]
pub trait UserRepo { fn find(&self, id: u64) -> Option<User>; }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::MockUserRepo;

    #[test]
    fn test_service() {
        let mut mock = MockUserRepo::new();
        mock.expect_find().returning(|_| Some(User { id: 1 }));
        assert!(mock.find(1).is_some());
    }
}
```
