# Docker Image Analysis Commands

Load this reference during Phase 2 (Deep Analysis) to identify bloat sources.

## Tool Priority Order

Use the first available tool. Each provides different depth of insight.

| Tool | Install Required | Insight Level | Best For |
|------|-----------------|---------------|----------|
| `docker history` | No (built-in) | Layer sizes + commands | Quick first pass |
| `docker scout` | No (Docker Desktop/CLI plugin) | CVE + base image recommendations | Security-aware slimming |
| `dive` | Yes (`brew install dive`) | Interactive layer exploration + wasted space | Deep layer analysis |
| `slim xray` | Yes (`brew install slimtoolkit/slim/slim`) | File-level analysis without running | Static deep analysis |
| `docker sbom` | No (Docker CLI plugin) | Package inventory | Identifying unnecessary packages |
| `trivy` | Yes (`brew install trivy`) | CVE scanning + misconfig detection | Security + package audit |

---

## docker history (always available)

```bash
# Full layer breakdown with sizes
docker history --no-trunc IMAGE_NAME

# Machine-readable format, sorted by size
docker history --format "{{.Size}}\t{{.CreatedBy}}" IMAGE_NAME

# Just the sizes (quick overview)
docker history --format "{{.Size}}" IMAGE_NAME
```

### How to Read the Output
- Each line is a layer in the image
- `0B` layers are metadata-only (ENV, LABEL, EXPOSE, CMD)
- Large layers from `RUN apt-get install` or `COPY . .` are primary targets
- Look for layers that install AND don't clean up in the same command

### Red Flags
- Layer > 100 MB: Likely includes build tools, full SDK, or uncleaned caches
- Multiple small `RUN` layers: Could be consolidated (each layer has filesystem overhead)
- `COPY . .` layer is large: Missing or weak `.dockerignore`

---

## Docker Scout (Docker CLI plugin)

```bash
# Quick vulnerability overview
docker scout quickview IMAGE_NAME

# Detailed CVE listing
docker scout cves IMAGE_NAME

# Recommendations for smaller/more secure base images
docker scout recommendations IMAGE_NAME

# Compare two images (before vs after)
docker scout compare IMAGE_NAME:original IMAGE_NAME:slim
```

### Key Value for Size Reduction
`docker scout recommendations` specifically suggests:
- Smaller base image alternatives (e.g., "switch from node:22 to node:22-slim")
- Version upgrades that reduce CVE count
- Quantified CVE delta for each recommendation

---

## dive (interactive layer analysis)

### Install
```bash
# macOS
brew install dive

# Linux
wget https://github.com/wagoodman/dive/releases/latest/download/dive_*_linux_amd64.deb
sudo dpkg -i dive_*_linux_amd64.deb

# Docker (no install needed)
docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock wagoodman/dive IMAGE_NAME
```

### Usage
```bash
# Interactive mode (TUI)
dive IMAGE_NAME

# CI mode (automated pass/fail)
dive IMAGE_NAME --ci \
  --highestWastedBytes 50MB \
  --lowestEfficiency 0.9 \
  --highestUserWastedPercent 0.1
```

### CI Mode Thresholds
| Flag | Recommended Value | Meaning |
|------|-------------------|---------|
| `--highestWastedBytes` | `50MB` | Fail if wasted space > 50 MB |
| `--lowestEfficiency` | `0.9` | Fail if image efficiency < 90% |
| `--highestUserWastedPercent` | `0.1` | Fail if > 10% user bytes are wasted |

### How to Read dive Output
- **Image Efficiency**: 0.0-1.0 scale. Below 0.9 means significant waste
- **Wasted Space**: Bytes present in one layer but overwritten/deleted in a later layer
- **Layer Contents**: Navigate into each layer to see exactly what files were added
- **Modified/Removed markers**: Files changed or deleted in subsequent layers (waste)

---

## slim (SlimToolkit — formerly DockerSlim)

### Install
```bash
# macOS
brew install slimtoolkit/slim/slim

# Linux
curl -sL https://raw.githubusercontent.com/slimtoolkit/slim/master/scripts/install-slim.sh | sudo -E bash -
```

### Static Analysis (no container needed)
```bash
# Analyze image layers and file tree
slim xray IMAGE_NAME

# Lint Dockerfile for best practices
slim lint Dockerfile

# Profile without building (observe only)
slim profile IMAGE_NAME
```

### Sensor-Based Minification (aggressive)
```bash
# Basic — HTTP probe on exposed ports
slim build IMAGE_NAME

# With custom probes
slim build IMAGE_NAME \
  --http-probe-cmd /healthz \
  --http-probe-cmd /api/status \
  --exec "python -c 'import myapp; myapp.warmup()'" \
  --continue-after 30

# Force-include paths the sensor might miss
slim build IMAGE_NAME \
  --include-path /app/templates \
  --include-path /app/static \
  --include-path /app/migrations \
  --include-cert-all

# Keep shell for debugging
slim build IMAGE_NAME --include-shell
```

### Typical Results
| Original | Slim Result | Reduction |
|----------|-------------|-----------|
| node:22 + app (1.1 GB) | 30-50 MB | 95-97% |
| python:3.13 + app (950 MB) | 30-60 MB | 93-97% |
| openjdk:21 + app (450 MB) | 60-100 MB | 78-87% |
| nginx + static (180 MB) | 5-12 MB | 93-97% |

### Caution
- Sensor-based optimization only includes files accessed during the probe
- **Missed code paths = missing files at runtime** — exercise all features during probe
- Use `--include-path` for templates, configs, lazy-loaded modules, and migration files
- Always run comprehensive tests against the slim image before deploying

---

## docker sbom (Software Bill of Materials)

```bash
# Generate SBOM in SPDX format
docker sbom IMAGE_NAME --format spdx-json > sbom.json

# Count total packages
docker sbom IMAGE_NAME --format spdx-json | jq '.packages | length'

# List all packages with versions
docker sbom IMAGE_NAME --format spdx-json | jq '.packages[] | .name + " " + .versionInfo'

# Find specific unnecessary packages
docker sbom IMAGE_NAME --format spdx-json | jq '.packages[] | select(.name | test("doc|man|dev|debug|test"))'
```

### Value for Slimming
Every package in the SBOM is potential bloat. Common unnecessary packages found in production images:
- `*-doc` packages (documentation)
- `*-dev` / `*-devel` packages (headers, used only at build time)
- `man-db`, `manpages` (manual pages)
- `perl`, `python3` (if not your app's runtime)
- `gcc`, `g++`, `make` (compilers — builder stage only)

---

## trivy (vulnerability scanner)

```bash
# Full vulnerability scan
trivy image IMAGE_NAME

# Only HIGH and CRITICAL
trivy image --severity HIGH,CRITICAL IMAGE_NAME

# Include package listing (helps identify bloat)
trivy image --list-all-pkgs IMAGE_NAME

# JSON output for scripting
trivy image --format json IMAGE_NAME > trivy-report.json

# Compare before/after CVE counts
trivy image --severity HIGH,CRITICAL --format json IMAGE_NAME:original | jq '.Results[].Vulnerabilities | length'
trivy image --severity HIGH,CRITICAL --format json IMAGE_NAME:slim | jq '.Results[].Vulnerabilities | length'
```

### Value for Slimming
- Every package with CVEs is a candidate for removal
- Fewer packages = fewer CVEs = smaller image (goals are aligned)
- `--list-all-pkgs` reveals packages you didn't know were installed

---

## Quick Analysis Workflow

When Docker is available, run this sequence:

```bash
IMAGE="myapp:latest"

echo "=== 1. Current Size ==="
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep $(echo $IMAGE | cut -d: -f1)

echo "=== 2. Layer Breakdown ==="
docker history --format "{{.Size}}\t{{.CreatedBy}}" $IMAGE | head -20

echo "=== 3. Scout Recommendations ==="
docker scout recommendations $IMAGE 2>/dev/null || echo "Docker Scout not available"

echo "=== 4. Package Count ==="
docker sbom $IMAGE --format spdx-json 2>/dev/null | jq '.packages | length' || echo "docker sbom not available"

echo "=== 5. CVE Summary ==="
docker scout quickview $IMAGE 2>/dev/null || trivy image --severity HIGH,CRITICAL $IMAGE 2>/dev/null || echo "No scanner available"
```

When Docker is NOT available, analyze the Dockerfile statically:
1. Count `FROM` statements (single = no multi-stage)
2. Check base image against the matrix in `base-image-matrix.md`
3. Look for `RUN apt-get install` / `RUN apk add` without cleanup
4. Check for `.dockerignore` file existence and coverage
5. Look for `COPY . .` without a preceding targeted COPY for dependency files
