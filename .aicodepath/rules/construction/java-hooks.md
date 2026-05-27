# Java Hook Automation

Per-file post-edit quality checks for Java files.

## Commands

| Tool | Command | Purpose |
|------|---------|---------|
| Format | `./gradlew spotlessApply` | Applies Google Java Format |
| Full check | `./gradlew check` | Runs tests + PMD + Checkstyle |
| Tests only | `./gradlew test` | Unit and integration tests |

## CI Mode (non-modifying)

```bash
./gradlew spotlessCheck   # fails if formatting differs — does NOT modify files
./gradlew check           # full quality gate
```

## Spotless (Google Java Format)

```kotlin
// build.gradle.kts
plugins { id("com.diffplug.spotless") version "6.25.0" }

spotless {
    java {
        googleJavaFormat()
        removeUnusedImports()
    }
}
```

## gradle check Pipeline

`./gradlew check` runs in order:
1. `compileJava` — compilation errors
2. `test` — JUnit tests
3. `pmdMain` — PMD static analysis
4. `checkstyleMain` — Checkstyle style rules

Fix compilation errors first, then test failures, then lint.
