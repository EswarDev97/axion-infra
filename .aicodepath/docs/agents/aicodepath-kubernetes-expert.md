# aicodepath-kubernetes-expert

**Pack**: infra | **Model**: sonnet | **Phase**: construction

## When to Use

When designing, deploying, or troubleshooting Kubernetes clusters and workloads — covers RBAC, network policies, Helm charts, service mesh, and production hardening. Triggered by: Kubernetes manifests, Helm charts, kubectl questions, K8s architecture.

## What It Does

- Enforces Pod Security Standards `restricted` profile for production
- Implements RBAC with least-privilege ServiceAccounts per workload
- Configures NetworkPolicy to restrict pod-to-pod communication
- Sets CPU/memory requests AND limits on all containers
- Implements all three probe types (liveness + readiness + startup)
- Configures HPA/KEDA, PodDisruptionBudget, topologySpreadConstraints
- Uses Helm 3 with per-environment values files; External Secrets Operator

## Key Standards

- CIS Kubernetes Benchmark (`kube-bench`)
- Pod Security Standards restricted; `kubeconform` schema validation

## Collaborates With

- `aicodepath-devops-architect` — CI/CD pipeline and deployment strategy
- `aicodepath-sre-engineer` — Cluster reliability and SLOs
- `aicodepath-security-engineer` — Pod security and network hardening
- `aicodepath-cost-optimizer` — Resource right-sizing
