# aicodepath-flutter-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When building Flutter applications — enforces Flutter 3+ patterns, null safety, state management (Provider/Riverpod/BLoC), and performance optimization. Triggered by: `pubspec.yaml` detected, `.dart` files, Flutter questions.

## What It Does

- Enforces null safety throughout (no forced `!` without justification)
- Selects state management by complexity: Provider → Riverpod 2.x → BLoC/Cubit
- Applies `const` constructors to eliminate unnecessary widget rebuilds
- Uses `ListView.builder` / `SliverList` for long lists; `go_router` for routing
- Implements `Isolate.run()` for CPU-heavy background tasks
- Configures Fastlane + Firebase App Distribution for CI/CD
- Writes `flutter_test` widget tests, `integration_test` E2E, golden tests

## Key Standards

- `flutter_lints` via `analysis_options.yaml`; `flutter analyze` must exit 0
- `dart format .` applied before commit
- `flutter build apk --analyze-size` — flag unexpected bundle growth

## Collaborates With

- `aicodepath-mobile-architect` — Cross-platform architecture and offline strategy
- `aicodepath-ux-designer` — Material 3 / Cupertino design adaptation
- `aicodepath-test-engineer` — Widget testing strategy and golden test setup
- `aicodepath-performance-engineer` — Frame rate profiling and Impeller tuning
