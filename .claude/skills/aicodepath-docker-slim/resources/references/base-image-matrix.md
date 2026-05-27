# Base Image Decision Matrix

Load this reference when choosing a base image for the runtime stage of a multi-stage Docker build.

## Full Comparison Matrix

| Base Image | Compressed Size | CVEs (typical) | Shell | Package Mgr | libc | Best For |
|------------|----------------|----------------|-------|-------------|------|----------|
| `scratch` | 0 KB | 0 | No | No | None | Go/Rust static binaries |
| `cgr.dev/chainguard/static` | ~2 MB | 0 | No | No | None | Go/Rust static binaries (with CA certs) |
| `gcr.io/distroless/static-debian12` | ~2 MB | 0-2 | No | No | None | Go/Rust static binaries |
| `alpine:3.21` | ~3.5 MB | 5-15 | Yes | apk | musl | Simple services, infra containers |
| `cgr.dev/chainguard/wolfi-base` | ~6 MB | 0-2 | Yes | apk | glibc | Custom minimal images needing shell |
| `mcr.microsoft.com/dotnet/runtime-deps:9.0-noble-chiseled` | ~6-13 MB | 0-5 | No | No | glibc | .NET self-contained/AOT apps |
| `debian:bookworm-slim` | ~27 MB | 20-50 | Yes | apt | glibc | General-purpose, broad compatibility |
| `ubuntu:24.04` | ~29 MB | 30-80 | Yes | apt | glibc | When Ubuntu-specific packages needed |
| `gcr.io/distroless/base-debian12` | ~20 MB | 5-10 | No | No | glibc | C/C++ apps needing glibc |
| `debian:bookworm` | ~50 MB | 50-120 | Yes | apt | glibc | Development, debugging |

## Language-Specific Base Image Recommendations

| Language | Recommended Base (Runtime Stage) | Size | Notes |
|----------|----------------------------------|------|-------|
| Go | `scratch` or `cgr.dev/chainguard/static` | 0-2 MB | CGO_ENABLED=0 required for scratch |
| Rust | `scratch` or `cgr.dev/chainguard/static` | 0-2 MB | musl target for static binary |
| .NET (AOT) | `mcr.microsoft.com/dotnet/runtime-deps:9.0-noble-chiseled` | ~13 MB | Ubuntu Chiseled — zero shell |
| .NET (runtime) | `mcr.microsoft.com/dotnet/aspnet:9.0-noble-chiseled` | ~30 MB | Chiseled variant |
| Java (native) | `gcr.io/distroless/static-debian12` | ~2 MB | GraalVM native-image only |
| Java (JRE) | `debian:bookworm-slim` + custom jlink JRE | ~27 MB + 40-60 MB | Total ~70-90 MB |
| Python | `cgr.dev/chainguard/python:latest` | ~50-60 MB | glibc — no musl wheel issues |
| Python (alt) | `python:3.13-slim` | ~130 MB | Broader compatibility, larger |
| Node.js | `gcr.io/distroless/nodejs22-debian12` | ~120 MB | No shell, secure |
| Node.js (alt) | `node:22-alpine` | ~130 MB | Has shell, smaller ecosystem |
| Frontend static | `nginx:alpine` or `cgr.dev/chainguard/nginx` | ~10-15 MB | Serve static assets only |

## Decision Flowchart

```
Is your binary statically linked? (Go CGO_ENABLED=0, Rust musl, .NET AOT)
├── Yes → scratch or chainguard/static (0-2 MB)
└── No
    ├── Need shell for debugging?
    │   ├── Yes → Alpine (3.5 MB) or Wolfi (6 MB, glibc)
    │   └── No
    │       ├── Need glibc?
    │       │   ├── Yes → distroless/base or chainguard variant
    │       │   └── No → Alpine or distroless
    │       └── .NET specifically? → Ubuntu Chiseled
    └── Need broad package compatibility?
        ├── Yes → debian:bookworm-slim (27 MB)
        └── No → Language-specific chainguard image
```

## musl vs glibc — When It Matters

| Situation | Impact | Recommendation |
|-----------|--------|----------------|
| Python with C extensions (numpy, pandas, cryptography) | Wheels won't install, falls back to source compilation | Use glibc base (Chainguard, Debian slim) |
| Node.js with native addons (sharp, bcrypt, canvas) | May fail to link or crash at runtime | Use glibc base or rebuild in Alpine builder |
| Go with CGO_ENABLED=0 | No impact — pure Go, no libc | scratch or Alpine both fine |
| Rust with musl target | Works perfectly — designed for this | scratch with musl binary |
| Java | Minor DNS resolution quirks on Alpine | Prefer glibc base for production |
| .NET | Official chiseled images are glibc | Ubuntu Chiseled recommended |

## Chainguard Images — Free vs Paid

| Tier | Tags | Freshness | Use Case |
|------|------|-----------|----------|
| Free (Developer) | `:latest` only | Rebuilt nightly | Dev, CI, personal projects |
| Paid (Libraries) | Pinned versions, `:latest` | Continuous + SLA | Production, compliance |

Free tier is sufficient for most Docker slimming work. The `:latest` tag is rebuilt daily with zero known CVEs.

## Debug Variants

When you need to debug a minimal image:

| Base | Debug Variant | What It Adds |
|------|--------------|--------------|
| distroless | `:debug` tag | busybox shell |
| Chainguard | `cgr.dev/chainguard/wolfi-base` | Full shell + apk |
| scratch | N/A — use Alpine temporarily | Switch base for debugging |
| Ubuntu Chiseled | N/A — use full Ubuntu temporarily | Switch base for debugging |

Use debug variants during development, switch to minimal for production.
