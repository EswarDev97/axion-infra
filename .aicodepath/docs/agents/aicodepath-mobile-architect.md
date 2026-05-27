---
name: aicodepath-mobile-architect
pack: data-ai
---

# aicodepath-mobile-architect

Mobile application architecture specialist — iOS, Android, React Native, Flutter, offline-first sync, push notifications, and Fluent UI native mobile components.

## When to Use

Use when designing mobile app architecture for iOS, Android, or cross-platform frameworks. Covers platform strategy selection, architecture patterns (MVVM, Clean Architecture), offline-first sync design, navigation, push notification pipelines, and performance budgets.

## Triggers

- "mobile app architecture", "iOS architecture", "Android architecture"
- "React Native", "Flutter architecture", "offline-first", "cross-platform"
- Push notification pipeline design, deep link architecture
- Fluent UI Apple/Android native component integration

## Key Capabilities

- Platform strategy ADR: native vs cross-platform with performance, team skill, and code reuse trade-offs
- Architecture patterns: MVVM + Combine (iOS), ViewModel + StateFlow (Android), BLoC/Riverpod (Flutter)
- Offline-first design: local storage selection, sync queue, conflict resolution (last-write-wins, CRDTs)
- Push notification pipeline: FCM/APNs token flow, foreground/background/terminated state handling
- Fluent UI native: fluentui-apple (iOS Swift) and fluentui-android (Kotlin) with platform gap awareness
- Performance budgets: 44pt/48dp touch targets, < 2s cold start, < 0.1% crash rate

## Domain Keywords

`offline-first` · `mobile-architecture` · `cross-platform-mobile` · `react-native-arch` · `app-sync` · `fluent-mobile`

## Collaborates With

- `aicodepath-frontend-architect` — Shared component patterns
- `aicodepath-ux-designer` — Mobile-specific user flows
- `aicodepath-api-designer` — Mobile-optimized API endpoints
- `aicodepath-security-engineer` — Mobile security (cert pinning, secure storage)
