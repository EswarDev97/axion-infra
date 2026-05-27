# aicodepath-symfony-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When writing Symfony code — enforces Symfony 6+/7+/8+ patterns, Doctrine ORM, Messenger async, API Platform, and dependency injection container. Triggered by: `symfony.lock` detected, `symfony/*` in composer, Symfony questions.

## What It Does

- Uses Doctrine PHP 8 attribute mapping (no XML/YAML); custom repository QueryBuilder methods
- Applies autowiring throughout with `#[Autowire]` and tagged iterators
- Implements Messenger handlers with retry strategies and failure transport
- Uses API Platform 3 state providers/processors for REST/JSON-LD endpoints
- Enforces `Voter` classes for authorization; Form types with CSRF protection
- Configures `doctrine:migrations:migrate` in CI; `composer audit` for CVEs

## Key Standards

- PSR-12 via PHP CS Fixer `@Symfony` ruleset; `php-cs-fixer check --diff` in CI
- `symfony check:security` in CI pipeline

## Collaborates With

- `aicodepath-php-expert` — PHP 8.3+ language patterns
- `aicodepath-backend-architect` — Service architecture and CQRS
- `aicodepath-database-architect` — Doctrine schema design
- `aicodepath-api-designer` — API Platform and OpenAPI spec
