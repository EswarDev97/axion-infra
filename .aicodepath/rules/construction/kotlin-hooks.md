# Kotlin Hook Automation

Per-file post-edit quality checks for Kotlin files.

## Commands

| Tool | Command | Purpose |
|------|---------|---------|
| Format | `./gradlew ktlintFormat` | Applies ktlint style |
| Static analysis | `./gradlew detekt` | Detekt code smell detection |
| Tests | `./gradlew test` | JUnit 5 + MockK tests |

## CI Mode (non-modifying)

```bash
./gradlew ktlintCheck   # fails if formatting differs — does NOT modify files
./gradlew detekt        # fails CI on detekt violations
./gradlew test          # run all tests
```

## ktlint Configuration

```kotlin
// build.gradle.kts
plugins { id("org.jlleitschuh.gradle.ktlint") version "12.1.0" }

ktlint {
    version.set("1.2.1")
    android.set(false)
}
```

## detekt Configuration

```yaml
# detekt.yml
complexity:
  LongMethod:
    threshold: 40
  CyclomaticComplexMethod:
    threshold: 10
```

Run: `./gradlew detekt --auto-correct` for auto-fixable issues.
