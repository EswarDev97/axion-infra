# aicodepath-kotlin-expert

**Model**: claude-haiku-4-5-20251001 | **Phase**: CONSTRUCTION | **Type**: Code generator (Read + Write + Edit + Bash + Glob + Grep)

Specialist in Kotlin 2.x language features, coroutines, Flow, Kotlin Multiplatform (KMP), Jetpack Compose, and Arrow functional patterns.

## When to Invoke

- Writing or reviewing Kotlin source files (`.kt`, `build.gradle.kts`)
- Implementing coroutines with structured concurrency — `CoroutineScope`, `supervisorScope`, dispatcher selection
- Building reactive pipelines with `Flow`, `StateFlow`, or `SharedFlow`
- Setting up Kotlin Multiplatform (KMP) with `commonMain`/`androidMain`/`iosMain` source sets
- Writing Jetpack Compose UI with proper state hoisting, `LaunchedEffect`, and `derivedStateOf`
- Applying Kotlin 2.x features: sealed classes/interfaces, `@JvmInline value class`, data objects, context receivers
- Integrating Arrow for typed error handling (`Either`, `Raise` DSL, `Resource`)
- Writing Kotlin tests with Kotest, MockK, Turbine, and `runTest`
- Reviewing code for `GlobalScope` usage, `!!` assertions, blocking calls in coroutines

## Example Triggers

- "Write a Kotlin repository that fetches from a REST API and exposes a Flow"
- "Refactor this LiveData ViewModel to StateFlow"
- "Set up a KMP module with shared domain logic for Android and iOS"
- "Model this error hierarchy with sealed classes and Arrow Either"
- "Why is my coroutine cancelling unexpectedly?"
- "Write Turbine tests for this Flow"
- "Replace this companion object utility with idiomatic Kotlin"

## What It Produces

- Kotlin 2.x source with sealed classes, value classes, and idiomatic null safety
- Coroutine implementations with explicit scope management and cooperative cancellation
- Flow pipelines (cold `Flow`, `StateFlow`, `SharedFlow`) with correct operator chains
- KMP modules with `expect`/`actual` declarations and Gradle source-set configuration
- Jetpack Compose composables with hoisted state and correct side-effect APIs
- Arrow `Either`/`Raise` typed error layers replacing exception-driven control flow
- JUnit 5 / Kotest tests with MockK and Turbine assertions, `runTest` coroutine harness
- Inline rationale for every feature choice (why sealed vs enum, value class vs type alias, etc.)

## Key Capabilities

| Capability | Details |
|---|---|
| Coroutines | `CoroutineScope`, `supervisorScope`, `CoroutineExceptionHandler`, dispatcher selection, cancellation |
| Flow | Cold Flow, `StateFlow`, `SharedFlow`, `combine`/`flatMapLatest`/`buffer`/`conflate` |
| KMP | `expect`/`actual`, `commonMain`/`androidMain`/`iosMain`, Ktor client, SQLDelight, `kotlinx.serialization` |
| Jetpack Compose | State hoisting, `remember`/`rememberSaveable`, `LaunchedEffect`, `derivedStateOf`, slot APIs |
| Kotlin 2.x features | Sealed classes/interfaces, `@JvmInline value class`, data objects, context receivers, reified generics |
| Arrow | `Either`, `Option`, `Raise` DSL, `Resource`, optics (`Lens`, `Prism`) |
| Testing | Kotest assertions, MockK, Turbine, `runTest`, `TestDispatcher` |
| Anti-pattern detection | `GlobalScope`, `!!`, `LiveData`, blocking calls in coroutines, Java-style accessors |

## Tool Profile

| Tool | Used for |
|---|---|
| Read | Reading existing Kotlin source, `build.gradle.kts`, KMP config |
| Write | Creating new Kotlin classes, modules, test files |
| Edit | Modifying existing Kotlin source, migrating LiveData → Flow |
| Bash | Running `./gradlew test`, `detekt`, `kover` coverage reports |
| Glob | Locating `.kt`, `build.gradle.kts`, KMP source-set files |
| Grep | Finding anti-patterns (`GlobalScope`, `!!`, `LiveData`), class hierarchies |

## Integration

- **DOMAIN_MAPPING**: `kotlin`, `coroutine`, `kmp`, `kotlin-multiplatform`, `jetpack-compose`, `flow-kotlin`
- **Taxonomy**: `all` component type, `construction` phase
- **plugin_pack**: `lang`

## Collaborates With

- `aicodepath-android` (skill) — Android lifecycle, Compose navigation, Material 3
- `aicodepath-mobile-architect` — KMP architecture, shared-logic boundaries, offline-first patterns
- `aicodepath-java-expert` — JVM interop, `@JvmStatic`/`@JvmOverloads`, Java-to-Kotlin migration
- `aicodepath-backend-architect` — Ktor service design, API contract definition
- `aicodepath-test-engineer` — Kotest, MockK, and Turbine test strategy
