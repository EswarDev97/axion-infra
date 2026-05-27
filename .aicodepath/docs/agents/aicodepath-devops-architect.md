# aicodepath-devops-architect

**Model**: sonnet | **Phase**: INCEPTION / CONSTRUCTION / OPERATIONS | **Type**: Read + Write + Bash (IaC) | **Pack**: infra

Specialist in CI/CD pipelines, Kubernetes workloads, Helm charts, Terraform/Pulumi IaC, GitOps with ArgoCD, blue-green/canary deployments, and observability stacks.

## When to Invoke

- Designing a CI/CD pipeline (GitHub Actions, GitLab CI, Jenkins) for a new service or repository
- Writing Dockerfiles (multi-stage, distroless/alpine, non-root) or Docker Compose files
- Writing Kubernetes manifests — Deployments, Services, Ingress, HPA, PodDisruptionBudgets
- Packaging Kubernetes workloads into Helm charts with per-environment values
- Configuring GitOps delivery with ArgoCD (application manifests, sync policies, rollbacks)
- Setting up blue-green or canary deployments with progressive traffic shifting
- Writing Terraform modules or Pulumi stacks (VPC, subnets, LBs, managed databases)
- Designing logging, metrics, and alerting architecture (Prometheus, Grafana, ELK/Loki)
- Configuring secrets management (Vault, AWS Secrets Manager, GCP Secret Manager)

## What to Provide

- Target cloud provider (AWS / GCP / Azure / multi-cloud) and existing infrastructure constraints
- Services to deploy with resource requirements (CPU, memory, expected RPS, replica count)
- Environment structure (dev / staging / production) and deployment frequency
- Any compliance or network isolation requirements

## What to Expect

- Pipeline YAML skeleton with annotated stage ordering and cache configuration
- Dockerfile draft with multi-stage build, security hardening, and digest-pinned base image
- Kubernetes manifest set or Helm chart skeleton with `values.yaml` per environment
- ArgoCD Application manifest with sync policy and rollback trigger
- Terraform module outline or Pulumi stack structure
- Observability blueprint with Prometheus alert rules and Grafana dashboard panel list
- Quality checklist: pipeline runtime, image size, CVE gate, rollback time, secrets hygiene

## Standards Enforced

- `guidelines/devops-rules.json` — Dockerfile best practices, Kubernetes resource limits, CI pipeline structure, IaC module organization, secrets-never-in-code rules, image vulnerability scanning gates

## Integration

- **DOMAIN_MAPPING**: `deployment`, `docker`, `docker-compose`, `kubernetes`, `helm`, `argocd`, `ci`, `cd`, `pipeline`, `github-actions`, `terraform`, `terraform-module`, `ansible`, `infrastructure`, `monitoring`, `logging`, `alerting`, `devops`
- **Taxonomy**: `devops` component type, `design`, `plan`, `construction` phases

## Collaborates With

| Agent | Reason |
|-------|--------|
| `aicodepath-sre-engineer` | Reliability requirements, SLO targets, error budget policies |
| `aicodepath-security-engineer` | Pipeline security gates, secret management, image scanning |
| `aicodepath-backend-architect` | Deployment topology and service configuration |
| `aicodepath-ci-fixer` | Pipeline troubleshooting and failure diagnosis |
