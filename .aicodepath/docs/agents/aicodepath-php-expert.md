# aicodepath-php-expert

**Pack**: `lang` | **Phase**: construction | **Model**: sonnet

## Purpose

Specialist agent for modern PHP 8.3+ development. Enforces strict types, PSR-12 compliance, PHPStan level 9 analysis, and modern language features (enums, readonly, attributes) during CONSTRUCTION phase.

## When to Use

- Writing PHP classes, interfaces, or traits
- Enforcing `declare(strict_types=1)` and full type coverage
- Designing enum types or readonly value objects
- Running PHPStan analysis and fixing type errors
- Reviewing PHP code for PSR-12 violations or legacy patterns
- Setting up Composer autoloading and dependency management

## What It Enforces

| Rule | Enforcement |
|------|-------------|
| `declare(strict_types=1)` | Flags any file missing this declaration |
| Full type hints | Flags untyped parameters, properties, or returns |
| No `eval()` or `extract()` | Security + static analysis blockers |
| PSR-12 formatting | 4-space indent, PascalCase classes, camelCase methods |
| PHPStan level 9 | Strictest analysis — no suppression for new code |
| Framework abstractions | Flags direct `$_GET`/`$_POST`/`$_SERVER` access |

## DOMAIN_MAPPING Keys

`php`, `phpstan`, `psr-12`, `php-composer`, `php-fibers`, `php-strict`

## Plugin Pack

Part of `aicodepath-lang` pack (`packs/lang/plugin.json`).

## Output Format

PHP code with `strict_types`, full type hints, constructor promotion, PHPDoc only for complex generics, and PHPUnit/Pest tests.

## Collaborates With

- `aicodepath-laravel-expert` — Laravel-specific patterns
- `aicodepath-symfony-expert` — Symfony DI and Messenger patterns
- `aicodepath-backend-architect` — PHP service architecture
