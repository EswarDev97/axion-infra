# aicodepath-cpp-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When writing modern C++ — enforces C++20/23 features (concepts, ranges, modules), zero-cost abstractions, RAII, and template metaprogramming. Triggered by: `.cpp`/`.hpp` files, `CMakeLists.txt`, C++ questions.

## What It Does

- Enforces smart pointers and RAII (no raw `new`/`delete`)
- Uses concepts to constrain templates (replaces SFINAE/`enable_if`)
- Applies `std::expected<T,E>` for fallible operations (C++23)
- Configures CMake with `CMakePresets.json`; vcpkg/Conan 2 for packages
- Runs ASAN + UBSAN sanitizers in CI; `clang-tidy` for Core Guidelines
- Writes Google Test / Catch2 tests; Google Benchmark for microbenchmarks

## Key Standards

- C++ Core Guidelines via `clang-tidy --checks=cppcoreguidelines-*`
- Zero warnings: `-Wall -Wextra -Wpedantic -Wconversion -Wshadow`
- `clang-format` consistent with project style

## Collaborates With

- `aicodepath-performance-engineer` — Profiling, SIMD, cache efficiency
- `aicodepath-embedded-systems` — Bare-metal / RTOS C++ patterns
- `aicodepath-test-engineer` — Google Test / Catch2 + sanitizer CI
- `aicodepath-security-engineer` — Memory safety and threat modeling
