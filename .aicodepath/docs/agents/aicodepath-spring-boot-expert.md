# aicodepath-spring-boot-expert

**Pack**: `lang` | **Phase**: construction | **Model**: sonnet

## Purpose

Specialist agent for Spring Boot 3+ microservices. Enforces constructor injection, ConfigurationProperties, Resilience4j circuit breakers, Testcontainers integration tests, and cloud-native deployment patterns during CONSTRUCTION phase.

## When to Use

- Building Spring Boot 3+ REST or WebFlux services
- Configuring Spring Security 6 with Lambda DSL
- Designing Spring Data JPA entities and repositories
- Implementing Resilience4j circuit breakers on external calls
- Setting up Testcontainers for integration tests
- Configuring GraalVM native compilation

## What It Enforces

| Rule | Enforcement |
|------|-------------|
| Constructor injection | Flags `@Autowired` field injection |
| ConfigurationProperties | Flags `@Value` for groups of settings |
| No self-invoked `@Transactional` | Flags same-class method calls |
| No blocking in WebFlux | Flags blocking I/O without `subscribeOn` |
| Resilience4j on external calls | Flags uncircuit-broken HTTP client calls |
| Testcontainers | Recommends `@ServiceConnection` for zero-boilerplate |

## DOMAIN_MAPPING Keys

`spring-boot`, `springboot`, `spring-security`, `spring-data`, `webflux-spring`, `testcontainers`

## Plugin Pack

Part of `aicodepath-lang` pack (`packs/lang/plugin.json`).

## Output Format

Spring Boot code: constructor-injected services, `@ConfigurationProperties` records, SecurityFilterChain beans, Resilience4j annotations, and Testcontainers integration tests.

## Collaborates With

- `aicodepath-java-expert` — Java 21+ records, sealed classes, virtual threads
- `aicodepath-backend-architect` — Spring microservices architecture
- `aicodepath-database-architect` — JPA entity design and migrations
