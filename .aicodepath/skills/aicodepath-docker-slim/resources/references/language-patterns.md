# Language-Specific Docker Image Optimization Patterns

Load this reference when the Dockerfile targets a specific language/framework.
Each section provides a SOTA (2025-2026) optimized Dockerfile pattern and key techniques.

---

## Python (uv + multi-stage)

**Target: 50-70 MB** (from ~1 GB with full python base)

```dockerfile
# === Build stage ===
FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# === Runtime stage ===
FROM python:3.13-slim
# Or: FROM cgr.dev/chainguard/python:latest  (50-60 MB, zero CVEs)

RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app
WORKDIR /app
COPY --from=builder --chown=app:app /app /app
USER app
ENV PATH="/app/.venv/bin:$PATH"

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["python", "-m", "myapp"]
```

### Key Techniques
- **uv over pip**: 10-100x faster resolution + install; `uv.lock` for reproducibility
- **UV_COMPILE_BYTECODE=1**: Pre-compiles .pyc at build time (no `__pycache__` generation at runtime)
- **UV_LINK_MODE=copy**: Files are copied not linked — required for multi-stage COPY
- **Cache mount**: `--mount=type=cache,target=/root/.cache/uv` — cache never enters image layers
- **--no-dev**: Excludes test/dev dependencies from production image
- **Chainguard python**: glibc-based (no musl wheel issues), ~50-60 MB, zero CVEs

### Common Mistakes
- Installing `gcc`, `build-essential` in runtime stage (only needed in builder)
- Forgetting `--no-cache-dir` with pip (uv handles this automatically)
- Copying entire `.venv` with pip-created symlinks that break across stages
- Using Alpine for Python (musl causes wheel compilation failures for numpy, pandas, etc.)

---

## Node.js (multi-stage + production deps)

**Target: 80-130 MB** (from ~1.1 GB with full node base)

```dockerfile
# === Build stage ===
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

# === Production deps ===
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# === Runtime ===
FROM gcr.io/distroless/nodejs22-debian12
# Or: FROM node:22-alpine (if shell needed)

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 3000
CMD ["dist/index.js"]
```

### Next.js Standalone Output
```javascript
// next.config.js
module.exports = { output: 'standalone' }
```
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```
Standalone bundles only the needed node_modules files — ~100-150 MB total vs ~500 MB+.

### pnpm Monorepo Pattern
```dockerfile
RUN pnpm deploy --filter=myapp --prod /deploy/myapp
COPY --from=builder /deploy/myapp /app
```
Copies only production deps for a single workspace package.

### Key Techniques
- **Separate build and prod dep stages**: Build tools don't leak into runtime
- **npm ci --omit=dev**: Skips devDependencies entirely
- **node-prune** (optional): `npx node-prune` removes docs, tests, .map files from node_modules (20-40% smaller)
- **distroless nodejs**: No shell, no package manager — smallest + most secure
- **Cache mount**: npm/pnpm/yarn caches never enter layers

### Common Mistakes
- `npm install` instead of `npm ci` (non-deterministic, includes dev deps)
- Copying `node_modules` from host (platform mismatch, includes dev deps)
- Missing `.dockerignore` for `node_modules/`, `.next/`, `.git/`

---

## Go (static binary + scratch)

**Target: 6-15 MB** (from ~800 MB with full golang base)

```dockerfile
# === Build stage ===
FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -trimpath \
    -o /app/server ./cmd/server

# === Runtime (zero-base) ===
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### With UPX Compression (optional, 3-8 MB)
```dockerfile
FROM alpine:3.21 AS compressor
RUN apk add --no-cache upx
COPY --from=builder /app/server /server
RUN upx --best --lzma /server

FROM scratch
COPY --from=compressor /server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/server"]
```
**Trade-off**: UPX adds ~100-200ms startup time and higher memory during decompression. Skip for latency-sensitive services.

### Key Techniques
- **CGO_ENABLED=0**: Pure Go static binary — no libc dependency, enables `scratch`
- **-ldflags="-s -w"**: Strip symbol table (-s) and debug info (-w) — ~30% smaller
- **-trimpath**: Remove filesystem paths from binary (reproducibility + slight size reduction)
- **scratch base**: Literally empty — 0 bytes. Binary IS the entire image
- **CA certificates**: Copy from builder if your app makes HTTPS calls
- **Cache mounts**: Separate mod download + build caches

### Common Mistakes
- Forgetting CA certs when using scratch (HTTPS calls fail silently)
- Not setting `CGO_ENABLED=0` (links against glibc, breaks scratch)
- Copying the entire source tree into the final image

---

## Rust (cargo-chef + musl + scratch)

**Target: 3-12 MB** (from ~1.4 GB with full rust base)

```dockerfile
# === Chef stage (dependency caching) ===
FROM rust:1.82-slim AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# === Build stage ===
FROM chef AS builder
RUN rustup target add x86_64-unknown-linux-musl

COPY --from=planner /app/recipe.json recipe.json
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    cargo chef cook --release --target x86_64-unknown-linux-musl --recipe-path recipe.json

COPY . .
RUN cargo build --release --target x86_64-unknown-linux-musl && \
    strip target/x86_64-unknown-linux-musl/release/myapp

# === Runtime ===
FROM scratch
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/myapp /myapp
EXPOSE 8080
ENTRYPOINT ["/myapp"]
```

### Cargo.toml Optimizations
```toml
[profile.release]
strip = true          # Strip debug symbols
lto = true            # Link-time optimization (smaller binary)
codegen-units = 1     # Better optimization (slower compile)
opt-level = "z"       # Optimize for size over speed
panic = "abort"       # No unwinding — smaller binary
```

### Key Techniques
- **cargo-chef**: Separates dependency compilation from app compilation — massive cache efficiency
- **musl target**: Static binary with no libc dependency → scratch base
- **strip**: Remove debug symbols (or `strip = true` in Cargo.toml)
- **LTO + codegen-units=1**: Better dead code elimination
- **opt-level="z"**: Optimize for size (slight runtime performance cost)

### Common Mistakes
- Not using cargo-chef (every source change recompiles all dependencies)
- Forgetting musl target (dynamically linked binary won't run on scratch)
- Using `opt-level="z"` for performance-critical services (use "3" instead and accept larger binary)

---

## Java (jlink / GraalVM native-image)

**Target: 50-150 MB** (from ~450 MB with full JDK base)

### Option A: jlink Custom JRE (reliable, broad compatibility)
```dockerfile
# === Build stage ===
FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /app
COPY . .
RUN ./gradlew build -x test

# Analyze module dependencies and create minimal JRE
RUN jdeps --print-module-deps --ignore-missing-deps \
    --multi-release 21 build/libs/app.jar > deps.txt && \
    jlink --add-modules $(cat deps.txt) \
    --strip-debug --compress zip-9 \
    --no-header-files --no-man-pages \
    --output /custom-jre

# === Runtime ===
FROM debian:bookworm-slim
COPY --from=builder /custom-jre /opt/java
COPY --from=builder /app/build/libs/app.jar /app/app.jar
ENV PATH="/opt/java/bin:$PATH"
EXPOSE 8080
CMD ["java", "-jar", "/app/app.jar"]
```
**Result**: ~100-150 MB (custom JRE ~40-60 MB + app + slim base)

### Option B: GraalVM Native Image (smallest, fastest startup)
```dockerfile
FROM ghcr.io/graalvm/native-image-community:21 AS builder
WORKDIR /app
COPY . .
RUN ./gradlew nativeCompile
# Or: native-image -jar app.jar -o app --no-fallback --static --libc=musl

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/build/native/nativeCompile/app /app
EXPOSE 8080
ENTRYPOINT ["/app"]
```
**Result**: 50-80 MB (native binary, no JVM)

### Key Techniques
- **jlink**: Creates a JRE with ONLY the modules your app uses (~40-60 MB vs ~300 MB full JRE)
- **jdeps**: Analyzes which Java modules your JAR actually needs
- **GraalVM native-image**: AOT compilation to native binary — no JVM at runtime
- **--compress zip-9**: Maximum compression for jlink output
- **Spring Boot 3.x / Quarkus / Micronaut**: First-class GraalVM native support
- **CDS (Class Data Sharing)**: `java -Xshare:dump` for faster startup (complements jlink)

### Trade-offs
- jlink: Works with all Java libraries, moderate size reduction
- GraalVM: Smallest image, fastest startup, BUT longer build time, reflection/JNI requires config, not all libraries compatible

---

## .NET (AOT + Ubuntu Chiseled)

**Target: 15-50 MB** (from ~220 MB with full aspnet base)

### Option A: Self-Contained Trimmed + Chiseled
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS builder
WORKDIR /app
COPY . .
RUN dotnet publish -c Release \
    -r linux-x64 \
    --self-contained true \
    /p:PublishTrimmed=true \
    /p:PublishSingleFile=true \
    -o /publish

FROM mcr.microsoft.com/dotnet/runtime-deps:9.0-noble-chiseled
COPY --from=builder /publish/myapp /app/myapp
EXPOSE 8080
ENTRYPOINT ["/app/myapp"]
```
**Result**: 30-50 MB

### Option B: Native AOT (smallest possible)
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS builder
WORKDIR /app
COPY . .
RUN dotnet publish -c Release \
    -r linux-x64 \
    /p:PublishAot=true \
    -o /publish

FROM mcr.microsoft.com/dotnet/runtime-deps:9.0-noble-chiseled
# Or: FROM scratch (if no runtime deps needed)
COPY --from=builder /publish/myapp /app/myapp
EXPOSE 8080
ENTRYPOINT ["/app/myapp"]
```
**Result**: 15-30 MB

### Key Techniques
- **Ubuntu Chiseled**: Canonical's ultra-minimal Ubuntu — no shell, no package manager (~6-13 MB)
- **PublishTrimmed**: IL Linker removes unused code (significant size reduction)
- **PublishAot**: Native AOT compilation — no .NET runtime needed
- **PublishSingleFile**: Single executable (cleaner COPY, no DLL scatter)
- **.NET 9+**: Improved trimming, better AOT support

### Trade-offs
- Trimmed: Some reflection-heavy libraries break (System.Text.Json works, Newtonsoft needs config)
- AOT: No dynamic assembly loading, no `System.Reflection.Emit`, faster startup but larger compile
