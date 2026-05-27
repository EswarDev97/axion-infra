# Ecosystem Discovery — Signal Scan Commands

## 10 Signal Types with Detection Commands

### Signal 1: Scoped Package Dependencies
Search `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml` for internal/scoped packages.

Use `Grep` tool (not bash grep):
- Pattern: `"@{org}/` in `package.json`
- Pattern: `{org}-` in `requirements*.txt`, `setup.py`, `pyproject.toml`
- Pattern: `github.com/{org}/` in `go.mod`

**Confidence**: CONFIRMED if package exists in org, HIGH if scoped name matches org pattern.

### Signal 2: Docker Compose Services
Parse `docker-compose*.yml` for service definitions referencing other repos or images.

Use `Glob` for `**/docker-compose*.yml`, then `Read` each file.
Extract: `image:` and `build:` directives. Match against org registry patterns.

**Confidence**: CONFIRMED if image tag matches org registry.

### Signal 3: Environment Variable References
Scan `.env*`, config files, and code for URLs/hosts pointing to other services.

Use `Grep` with pattern: `_URL=|_HOST=|_ENDPOINT=|_SERVICE=`
Scope: `.env*`, `config/`, `src/`

**Confidence**: HIGH if URL contains internal domain patterns.

### Signal 4: API Client Calls
Find HTTP client calls, SDK imports, and service-to-service communication.

Use `Grep` with pattern: `fetch\(|axios\.|requests\.|http\.Get|HttpClient`
Also: `Grep` for `proto|grpc` for gRPC services.

**Confidence**: MEDIUM (needs URL analysis to determine if internal).

### Signal 5: Shared Databases
Detect database connection strings pointing to shared instances.

Use `Grep` with pattern: `DATABASE_URL|MONGO_URI|REDIS_URL|connection_string`

**Confidence**: HIGH if same DB host appears in multiple services.

### Signal 6: CI/CD Pipeline Triggers
Parse GitHub Actions, GitLab CI, Jenkins files for cross-repo triggers.

Use `Grep` with pattern: `repository_dispatch|workflow_call|trigger:|downstream`
Scope: `.github/`, `.gitlab-ci*`, `Jenkinsfile`

**Confidence**: CONFIRMED if explicit repo reference.

### Signal 7: Monorepo Workspace Configs
Parse workspace definitions for all packages/services.

Use `Glob` for: `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`
Then `Read` each to extract package lists.
Also check `package.json` for `workspaces` array.

**Confidence**: CONFIRMED (explicit declarations).

### Signal 8: Message Queue Definitions
Find queue names, topic subscriptions, and event bus connections.

Use `Grep` with pattern: `queue|topic|exchange|channel|SQS|SNS|pubsub|EventBridge|KAFKA`
Scope: `src/`, `lib/`, `config/`

**Confidence**: MEDIUM (shared queue implies connected service).

### Signal 9: Infrastructure References
Scan Terraform, Kubernetes, CloudFormation for service definitions.

Use `Glob` for: `*.tf`, `k8s/**`, `kubernetes/**`, `infra/**`, `terraform/**`
Then `Grep` for: `resource|service|deployment`

**Confidence**: HIGH if infra code references multiple services.

### Signal 10: Language-Specific Dependencies
Check for internal library references specific to the language ecosystem.

| Language | Tool | Pattern |
|----------|------|---------|
| Go | `Grep` | `import.*"github.com/{org}` in `*.go` |
| Java/Kotlin | `Grep` | `com\.{org}\.` in `build.gradle*`, `pom.xml` |
| Ruby | `Grep` | `gem '{org}` in `Gemfile` |
| .NET | `Grep` | `{org}\.` in `*.csproj` |

**Confidence**: CONFIRMED if resolvable within org.

## Confidence Level Definitions

| Level | Meaning | Evidence Required |
|-------|---------|-------------------|
| CONFIRMED | Verified to exist | Explicit reference + accessible |
| HIGH | Very likely exists | Strong signal (URL, package name) |
| MEDIUM | Probably exists | Indirect signal (queue name, env var) |
| LOW | Possible | Weak signal (naming pattern, comment) |
