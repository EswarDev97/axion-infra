# Dependency Updater Deep Dive

Detailed reference for project detection, Node.js with taze, version strategies, and conflict resolution.

## Project Detection

The skill auto-detects project type by scanning for package files:

| File Found | Language | Package Manager |
|------------|----------|-----------------|
| `package.json` | Node.js | npm/yarn/pnpm |
| `requirements.txt` | Python | pip |
| `pyproject.toml` | Python | pip/poetry |
| `Pipfile` | Python | pipenv |
| `go.mod` | Go | go modules |
| `Cargo.toml` | Rust | cargo |
| `Gemfile` | Ruby | bundler |
| `pom.xml` | Java | Maven |
| `build.gradle` | Java/Kotlin | Gradle |
| `*.csproj` | .NET | dotnet |

**Detection order for monorepos:**
1. Check current directory first
2. Then check for workspace/monorepo patterns
3. Offer to run recursively if applicable

---

## Node.js with taze

### Prerequisites

```bash
# Install taze globally (recommended)
npm install -g taze

# Or use npx
npx taze
```

### Smart Update Flow

```bash
# 1. Scan all updates
taze

# 2. Apply safe updates (minor + patch)
taze minor --write

# 3. For each major, prompt user:
#    "Update @types/node from ^20.0.0 to ^22.0.0?"
#    If yes, add to approved list

# 4. Apply approved majors
taze major --write --include approved-pkg1,approved-pkg2

# 5. Install
npm install  # or pnpm install / yarn
```

### Auto-Approve List

Some packages have frequent major bumps but are backward-compatible:

| Package | Reason |
|---------|--------|
| `lucide-react` | Icon library, majors are additive |
| `@types/*` | Type definitions, usually safe |

---

## Version Strategies

### Semantic Versioning

```
MAJOR.MINOR.PATCH (e.g., 2.3.1)

MAJOR: Breaking changes - requires code changes
MINOR: New features - backward compatible
PATCH: Bug fixes - backward compatible
```

### Range Specifiers

| Specifier | Meaning | Example |
|-----------|---------|---------|
| `^1.2.3` | Minor + Patch OK | `>=1.2.3 <2.0.0` |
| `~1.2.3` | Patch only | `>=1.2.3 <1.3.0` |
| `1.2.3` | Exact (fixed) | Only `1.2.3` |
| `>=1.2.3` | At least | Any `>=1.2.3` |
| `*` | Any | Latest (dangerous) |

### Recommended Strategy

```json
{
  "dependencies": {
    "critical-lib": "1.2.3",      // Exact for critical
    "stable-lib": "~1.2.3",       // Patch only for stable
    "modern-lib": "^1.2.3"        // Minor OK for active
  }
}
```

---

## Conflict Resolution

### Node.js Conflicts

**Diagnosis:**
```bash
npm ls package-name      # See dependency tree
npm explain package-name # Why installed
yarn why package-name    # Yarn equivalent
```

**Resolution with overrides:**
```json
// package.json
{
  "overrides": {
    "lodash": "^4.18.0"
  }
}
```

**Resolution with resolutions (Yarn):**
```json
{
  "resolutions": {
    "lodash": "^4.18.0"
  }
}
```

### Python Conflicts

**Diagnosis:**
```bash
pip check
pipdeptree -p package-name
```

**Resolution:**
```bash
# Use virtual environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Or use constraints
pip install -c constraints.txt -r requirements.txt
```
