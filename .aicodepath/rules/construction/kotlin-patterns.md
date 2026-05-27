# Kotlin Patterns

Reference guide for idiomatic Kotlin patterns used in construction-phase development.

## Coroutines

Use `suspend` functions for async I/O; `coroutineScope` for structured concurrency. Kotlin coroutines are lightweight — each one uses ~1 KB stack vs ~1 MB for a thread:

```kotlin
suspend fun fetchUser(id: String): User = coroutineScope {
    val profile = async { profileService.get(id) }
    val prefs = async { prefsService.get(id) }
    User(profile.await(), prefs.await())
}
```

Never use `runBlocking` in production coroutine context — it blocks the thread.

## Sealed Classes

Model exhaustive state with sealed classes:

```kotlin
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    data class Failure(val error: Throwable) : Result<Nothing>()
}
```

## Scope Functions

| Function | Receiver | Returns | Use for |
|----------|----------|---------|---------|
| `let` | `it` | lambda result | null checks, transform |
| `run` | `this` | lambda result | init + compute |
| `apply` | `this` | receiver | builder-style config |
| `also` | `it` | receiver | side effects |

## DSL Builders

```kotlin
fun buildQuery(init: QueryBuilder.() -> Unit): Query {
    return QueryBuilder().apply(init).build()
}

val q = buildQuery {
    table = "users"
    where { "active = true" }
}
```

## Extension Functions

Extend existing types without subclassing:

```kotlin
fun String.toSlug(): String =
    lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
```

## Null Safety

```kotlin
val name: String? = user?.profile?.displayName ?: "Anonymous"
user?.let { sendWelcome(it) }
```
