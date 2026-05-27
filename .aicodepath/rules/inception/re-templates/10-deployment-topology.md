# Deployment Topology — RE Template

## Route Gate

**Included in routes**:
- `greenfield`: SKIP — no existing codebase to analyze
- `brownfield-shallow`: SKIP — shallow route covers docs 1–5 only
- `brownfield-deep`: INCLUDE

If `re_route` = `greenfield`: stop here, do not generate this document.
If `re_route` = `brownfield-shallow`: stop here, do not generate this document.

---

## Frontmatter

When generating output, populate this frontmatter:

```yaml
---
repo: <git remote name or directory name>
repo_url: <git remote url>
branch: <current branch>
commit: <HEAD short hash>
generated_at: <ISO timestamp>
data_source: graph|llm-only
route: <re_route value>
---
```

---

## Instructions

Output file: `aicodepath-docs/inception/reverse-engineering/10-deployment-topology.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__file_summary` is available, call it on DevOps and infrastructure files:

```
mcp__aicodepath-code-graph__file_summary(file_path="Dockerfile")
mcp__aicodepath-code-graph__file_summary(file_path="docker-compose.yml")
mcp__aicodepath-code-graph__file_summary(file_path="kubernetes/deployment.yaml")
mcp__aicodepath-code-graph__file_summary(file_path=".github/workflows/deploy.yml")
mcp__aicodepath-code-graph__file_summary(file_path="terraform/main.tf")
mcp__aicodepath-code-graph__file_summary(file_path="serverless.yml")
```

(Call only those that exist — skip files not found.)

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Containerization [DATA SOURCE: graph|llm-only]

**Graph path**: From `file_summary` on Dockerfile and docker-compose.yml, extract base images, exposed ports, build stages, environment variable names, and volume mounts.

**LLM-only path**: Read `Dockerfile` — extract:
- Base image and version (e.g., `node:20-alpine`, `python:3.11-slim`)
- Build stages (multi-stage build: builder + runtime separation?)
- Exposed ports
- Environment variables expected at runtime
- Volume mounts
- User (non-root user configured? security best practice)

Read `docker-compose.yml` — extract all service definitions, port mappings, network configuration, and shared volumes.

If no containerization found: state that the application appears to be deployed without containers, and note the deployment method inferred (bare metal, PaaS, serverless).

---

#### Section 2: Orchestration and Scaling [DATA SOURCE: llm-only]

Identify the deployment orchestration platform:

**Kubernetes**: If `kubernetes/`, `k8s/`, `helm/` directories exist:
- List all Deployment, StatefulSet, DaemonSet resources found
- Note replica counts and HorizontalPodAutoscaler configs
- Note resource requests and limits (CPU/memory)
- Note health check probes (liveness, readiness, startup)
- Note ConfigMap and Secret references (not values)

**Serverless**: If `serverless.yml`, `template.yaml` (SAM), CDK stacks, or `functions/` directory:
- List all function definitions with trigger types (HTTP, SQS, scheduled, etc.)
- Note memory and timeout configurations
- Note cold start mitigation strategies (provisioned concurrency, keep-warm patterns)

**PaaS**: If `Procfile` (Heroku), `app.yaml` (Google App Engine), or platform-specific config:
- Extract process type definitions and dyno/instance configurations

---

#### Section 3: CI/CD Pipeline [DATA SOURCE: llm-only]

Read CI/CD configuration files (`.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/config.yml`, `bitbucket-pipelines.yml`):

Map the deployment pipeline stages:
```
Pipeline: [CI Platform name]

Stages:
1. [Stage name] — Trigger: [push/PR/tag] — Actions: [lint, test, build, etc.]
2. [Stage name] — Trigger: [...] — Actions: [...]
...

Environments:
| Environment | Trigger | Approval Required | Deploy Strategy |
|-------------|---------|-----------------|----------------|
| dev/staging | push to main | No | Rolling update |
| production  | tag/manual  | Yes | Blue-green |
```

Note: auto-deployment vs. manual approval gates, environment promotion flow, rollback mechanism.

---

#### Section 4: Infrastructure as Code [DATA SOURCE: llm-only]

If Terraform, Pulumi, CDK, Bicep, or CloudFormation templates exist:

- **Cloud provider**: AWS / GCP / Azure / multi-cloud
- **Managed services provisioned**: List each resource type (RDS, ElastiCache, S3, CloudFront, VPC, IAM, etc.)
- **State management**: Remote state backend (S3+DynamoDB, Terraform Cloud, GCS)?
- **Secret management**: Secrets Manager, Parameter Store, Vault, Key Vault references
- **Network topology**: VPC/subnet layout, public vs. private placement of services
- **DR/HA configuration**: Multi-AZ, read replicas, failover configs

If no IaC found, state: "No Infrastructure-as-Code detected. Infrastructure may be manually provisioned. Recommend IaC adoption for reproducibility."

---

#### Section 5: Observability Stack [DATA SOURCE: llm-only]

Identify monitoring and observability tooling from imports, config, and environment variable names:

- **Logging**: Structured logging format (JSON/logfmt vs. plain text), log aggregation service (CloudWatch, Datadog, Splunk, ELK)
- **Metrics**: Prometheus scraping endpoints (`/metrics`), StatsD, custom CloudWatch metrics, Datadog agent
- **Tracing**: OpenTelemetry SDK, Jaeger, Zipkin, AWS X-Ray, Datadog APM
- **Alerting**: PagerDuty integration, Alertmanager rules, SNS alert topics
- **Dashboards**: Grafana configs, CloudWatch dashboards, Datadog monitors
- **Error tracking**: Sentry DSN config, Bugsnag/Rollbar API key references

Note any observability gaps (e.g., no distributed tracing in a microservice deployment, no structured logging).

---

#### Section 6: Deployment Topology Risk Assessment

Flag operational risks:
- **Single point of failure**: Services with replica count of 1 and no autoscaling
- **No health checks**: Containers/services without liveness/readiness probes
- **Unmanaged secrets**: Credentials in environment variable defaults or config files
- **Missing rollback plan**: Pipelines with no documented rollback procedure
- **Observability gaps**: Services with no metrics or logging integration
- **Manual steps in deployment**: Any non-automated steps in the deploy process

Produce a risk table with recommended remediation priority before new feature rollout.

Set `data_source` in frontmatter to `graph` if `file_summary` on DevOps files was used, otherwise `llm-only`.
