# aicodepath-java-expert

**Model**: sonnet | **Phase**: CONSTRUCTION | **Type**: Code generator (Read + Write + Edit + Bash)

Specialist in Java 21+ language features, Spring Boot 3+ conventions, and enterprise architecture patterns.

## When to Invoke

- Writing or reviewing Java source files (`.java`)
- Building Spring Boot 3+ services — controllers, services, repositories
- Implementing Java 21+ features: virtual threads (Project Loom), records, sealed classes, pattern matching
- Setting up Maven or Gradle builds with dependency management BOMs
- Writing JUnit 5 tests with Mockito and Testcontainers
- Configuring GraalVM native-image compilation for startup-critical services
- Enforcing constructor injection and eliminating field injection (`@Autowired`)

## What to Provide

- Java version (must be 21+)
- Spring Boot version (preferably 3.x)
- Build tool: Maven (`pom.xml`) or Gradle (`build.gradle`)
- Architecture style: layered, hexagonal, or DDD
- Target environment: JVM or GraalVM native

## What to Expect

- Java source with records, sealed classes, and virtual threads applied where appropriate
- Constructor-injected Spring beans — no `@Autowired` on fields
- JUnit 5 tests with `@Nested`, `@DisplayName`, and AssertJ assertions
- Inline rationale for each language-feature choice (record vs POJO, virtual thread vs reactive)
- Anti-patterns flagged: raw types, `Optional` misuse, god classes >500 LOC, mutable DTOs

## Tool Profile

| Tool | Used for |
|------|----------|
| Read | Reading existing Java source, pom.xml, build.gradle |
| Write | Creating new Java classes, test files, config |
| Edit | Modifying existing Java source |
| Bash | Running `mvn test`, `gradle build`, `spotbugs`, `jacoco` reports |
| Glob | Locating `.java`, `pom.xml`, `build.gradle` files |
| Grep | Finding anti-patterns, injection points, class hierarchies |

## Standards Enforced

- `guidelines/java-rules.json` — naming, patterns, Spring conventions
- `guidelines/code-quality-rules.json` — complexity, file length, coverage thresholds

## Integration

- **DOMAIN_MAPPING**: `java`, `spring`, `maven`, `gradle`, `jvm`, `springboot`, `junit`, `hibernate`
- **Taxonomy**: `all` component type, `construction` phase
- **plugin_pack**: `lang`

## Collaborates With

- `aicodepath-backend-architect` — service architecture and API contract design
- `aicodepath-database-architect` — JPA entity modeling and repository patterns
- `aicodepath-test-engineer` — testing strategy and Testcontainers setup
- `aicodepath-devops-architect` — GraalVM native builds and Docker containerization
