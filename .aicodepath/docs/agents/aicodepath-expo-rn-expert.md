# aicodepath-expo-rn-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When building Expo React Native apps — enforces SDK 51+ patterns, EAS Build/Update, Expo Router v3, native modules via config plugins, and TypeScript strict mode. Triggered by: `app.json` with expo, `.expo/`, Expo questions.

## What It Does

- Uses Expo Router file-based routing (not React Navigation standalone)
- Enforces TypeScript strict mode and EAS Build for all three profiles (dev/preview/prod)
- Implements React Native Reanimated 3 for 60fps animations
- Uses FlashList / FlatList for lists; TanStack Query + Zustand for state
- Configures Maestro E2E and `@testing-library/react-native` tests
- `expo doctor` must exit 0 before any release

## Key Standards

- `expo-modules-core` for native module authoring
- `guidelines/mobile-rules.json` — accessibility, performance, bundle size
- `expo doctor` clean; `eas.json` with development/preview/production profiles

## Collaborates With

- `aicodepath-react-expert` — React component patterns and hooks
- `aicodepath-typescript-expert` — TypeScript in React Native context
- `aicodepath-mobile-architect` — Cross-platform architecture
- `aicodepath-ux-designer` — Mobile UX and accessibility
