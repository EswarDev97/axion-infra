# aicodepath-swift-expert

## When to Use

Invoke when writing or reviewing Swift code for any Apple platform — iOS apps, macOS utilities, watchOS complications, tvOS interfaces, visionOS experiences, or Swift Package Manager libraries. Triggered automatically when `.swift` files, `Package.swift`, or an `.xcodeproj`/`.xcworkspace` is detected, or when the task involves async/await, actors, SwiftUI, SwiftData, Combine, or Swift 5.9+ language features.

## What It Does

- Enforces Swift 5.9+ structured concurrency: async/await for all async operations, actors for shared mutable state, `Sendable` conformance on cross-actor types, and `@MainActor` on all UI-bound code
- Reviews and writes SwiftUI views as small composable structs with `@Observable` view models (iOS 17+) or `ObservableObject`/`@Published` for iOS 16 and below
- Implements SwiftData (`@Model`, `ModelContainer`, `ModelContext`) for new persistence layers and Core Data for existing or pre-iOS-17 projects
- Flags anti-patterns: force unwraps without justification, data races from missing `Sendable`, completion handlers in new async code, `DispatchQueue.main.async` where `@MainActor` suffices, and massive view structs
- Generates XCTest and Swift Testing (`@Test`, `@Suite`) suites with async support, XCUITest page-object UI tests, and snapshot tests via `swift-snapshot-testing`
- Configures Swift Package Manager (`Package.swift`) with multi-platform targets, versioned dependencies, and `swift-format`/SwiftLint quality gates

## Example Triggers

- "Write a SwiftUI view with an async data-loading pattern and error handling"
- "Refactor this completion-handler networking layer to async/await with actors"
- "Set up SwiftData for a to-do app targeting iOS 17"
- "Add XCTest unit tests for this Swift service with 80%+ coverage"
- "Review this Swift code for data races and Sendable issues"
- "Create a Swift Package for a shared networking module used across iOS and macOS targets"
- "Migrate this ObservableObject view model to use @Observable"

## What It Produces

Swift source files with:
- Structured concurrency: `async`/`await`, `actor` types, `@MainActor` annotations, `Sendable` conformances
- SwiftUI views as composable structs with `@Observable` view models (iOS 17+)
- SwiftData `@Model` classes with `ModelContainer`/`ModelContext` setup
- Protocol-first design — concrete types conforming to named protocols, no unnecessary subclassing
- XCTest or Swift Testing suites colocated in `Tests/` with async test support
- `Package.swift` with explicit platform minimums, product/target/dependency declarations
- Documentation comments (`/// ...`) on all public and `internal` API
- Zero SwiftLint warnings and zero `swift build` warnings

## Related Agents

- `aicodepath-mobile-architect` — iOS/macOS architecture, module boundaries, and offline-first patterns
- `aicodepath-ux-designer` — iOS/macOS Human Interface Guidelines compliance and accessibility
- `aicodepath-test-engineer` — XCTest patterns, coverage strategy, and CI integration
- `aicodepath-security-engineer` — Keychain Services, CryptoKit, and biometric authentication (Face ID / Touch ID)
- `aicodepath-performance-engineer` — Instruments profiling, memory graph debugging, and Swift performance tuning
