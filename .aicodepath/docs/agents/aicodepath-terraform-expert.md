# aicodepath-terraform-expert

**Pack**: infra | **Model**: sonnet | **Phase**: construction

## When to Use

When writing Terraform infrastructure as code — enforces module reusability, state management, security scanning, and multi-environment workflows. Triggered by: `.tf` files detected, Terraform questions, IaC architecture.

## What It Does

- Designs composable modules with clear input/output contracts and version pinning
- Configures remote state backend with locking (S3+DynamoDB, GCS, Azure Storage)
- Runs `tfsec`/Checkov security scanning and `infracost diff` cost estimates in CI
- Uses `moved` blocks for resource refactoring (no delete-and-recreate)
- Implements plan approval gates (Atlantis or GitHub Action)
- Detects drift via scheduled `terraform plan -detailed-exitcode`

## Key Standards

- `terraform fmt -check -recursive` + `terraform validate` in CI
- `tflint --recursive` for provider rule violations
- `prevent_destroy = true` on stateful resources (RDS, S3)

## Collaborates With

- `aicodepath-devops-architect` — Pipeline integration
- `aicodepath-security-engineer` — IAM least-privilege scanning
- `aicodepath-cost-optimizer` — Resource right-sizing
- `aicodepath-kubernetes-expert` — Terraform-managed K8s clusters
