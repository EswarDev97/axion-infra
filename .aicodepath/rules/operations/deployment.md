# Deployment Operations

**Purpose**: Execute deployments with blue-green/canary strategies, rollback procedures, and post-deployment validation using ArgoCD and Argo Rollouts

**Execute IF**:
- Kubernetes deployment required
- Release ready for promotion
- Rollback needed
- Post-deployment validation required

**Skip IF**:
- Local development only
- No Kubernetes infrastructure
- CI/CD handles everything automatically

## Prerequisites
- CI/CD Design complete
- Kubernetes Design complete
- Docker images built and pushed
- ArgoCD installed and configured

---

## Step 1: Load Context

### 1.1 Load Prior Artifacts
- Load `aicodepath-docs/construction/{unit-name}/kubernetes-design/`
- Load `aicodepath-docs/construction/{unit-name}/cicd-design/`
- Load `aicodepath-docs/construction/environment-strategy/`

### 1.2 Gather Deployment Requirements

Create `aicodepath-docs/operations/deployment/deployment-questions.md`:

```markdown
# Deployment Questions: [Release Version]

## Question 1: Deployment Strategy
What deployment strategy should be used?

A) **Rolling Update** (gradual replacement, standard K8s)
B) **Blue-Green** (instant switch, full rollback capability)
C) **Canary** (progressive traffic shift with analysis)
D) **Recreate** (stop all → start all, downtime acceptable)

[Answer]:

---

## Question 2: Traffic Management
How should traffic be managed during deployment?

A) **Immediate** (100% to new version after readiness)
B) **Progressive** (10% → 30% → 50% → 100% with pauses)
C) **Manual Gates** (explicit approval at each stage)
D) **Analysis-Driven** (automated promotion based on metrics)

[Answer]:

---

## Question 3: Rollback Trigger
What conditions should trigger automatic rollback?

A) **Error Rate** (>1% 5xx responses)
B) **Latency** (p99 > threshold)
C) **Custom Metrics** (business-specific)
D) **Manual Only**

[Answer]:
```

---

## Step 2: Create Argo Rollouts Configuration

Create `aicodepath-docs/operations/deployment/rollout-strategy.md`:

```markdown
# Rollout Strategy: [Unit Name]

## Blue-Green Deployment

### Rollout Manifest

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp-api
  namespace: myapp
spec:
  replicas: 3
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: myapp-api
  template:
    metadata:
      labels:
        app: myapp-api
    spec:
      containers:
        - name: api
          image: harbor.company.com/myapp/api:v1.0.0
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
  strategy:
    blueGreen:
      # Service for active (production) traffic
      activeService: myapp-api-active
      # Service for preview (new version) traffic
      previewService: myapp-api-preview
      # Auto-promote after preview is healthy
      autoPromotionEnabled: false
      # Seconds to wait before scaling down old version
      scaleDownDelaySeconds: 30
      # Revision history for rollbacks
      scaleDownDelayRevisionLimit: 2
      # Pre-promotion analysis
      prePromotionAnalysis:
        templates:
          - templateName: success-rate
        args:
          - name: service-name
            value: myapp-api-preview
      # Anti-affinity to spread across nodes
      antiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          weight: 100
```

### Services for Blue-Green

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-api-active
  namespace: myapp
spec:
  selector:
    app: myapp-api
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-api-preview
  namespace: myapp
spec:
  selector:
    app: myapp-api
  ports:
    - port: 80
      targetPort: 3000
```

## Canary Deployment

### Canary Rollout Manifest

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp-api
  namespace: myapp
spec:
  replicas: 10
  selector:
    matchLabels:
      app: myapp-api
  template:
    metadata:
      labels:
        app: myapp-api
    spec:
      containers:
        - name: api
          image: harbor.company.com/myapp/api:v1.0.0
          ports:
            - containerPort: 3000
  strategy:
    canary:
      # Canary service for metrics collection
      canaryService: myapp-api-canary
      # Stable service for production traffic
      stableService: myapp-api-stable
      # Traffic routing via Istio/Nginx
      trafficRouting:
        nginx:
          stableIngress: myapp-api-ingress
          additionalIngressAnnotations:
            canary-by-header: X-Canary
      # Progressive traffic steps
      steps:
        # Step 1: 10% traffic to canary
        - setWeight: 10
        - pause: { duration: 5m }
        # Step 2: Run analysis
        - analysis:
            templates:
              - templateName: success-rate
              - templateName: latency
        # Step 3: 30% traffic
        - setWeight: 30
        - pause: { duration: 10m }
        # Step 4: 50% traffic
        - setWeight: 50
        - pause: { duration: 10m }
        # Step 5: Full rollout
        - setWeight: 100
      # Analysis configuration
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 2
        args:
          - name: service-name
            value: myapp-api-canary
```

## Analysis Templates

### Success Rate Analysis

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: myapp
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      # Check every 60 seconds
      interval: 60s
      # Require 3 consecutive successes
      successCondition: result[0] >= 0.99
      # Fail after 3 consecutive failures
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}",
                status=~"2.."
              }[5m]
            )) /
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}"
              }[5m]
            ))
```

### Latency Analysis

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: latency
  namespace: myapp
spec:
  args:
    - name: service-name
  metrics:
    - name: latency-p99
      interval: 60s
      # p99 latency must be under 500ms
      successCondition: result[0] < 500
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(
                http_request_duration_seconds_bucket{
                  service="{{args.service-name}}"
                }[5m]
              )) by (le)
            ) * 1000
```

### Error Rate Analysis

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate
  namespace: myapp
spec:
  args:
    - name: service-name
  metrics:
    - name: error-rate
      interval: 60s
      # Error rate must be under 1%
      successCondition: result[0] < 0.01
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}",
                status=~"5.."
              }[5m]
            )) /
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}"
              }[5m]
            ))
```
```

---

## Step 3: Create Deployment Runbook

Create `aicodepath-docs/operations/deployment/deployment-runbook.md`:

```markdown
# Deployment Runbook: [Unit Name]

## Pre-Deployment Checklist

- [ ] Release notes reviewed and approved
- [ ] Database migrations tested in staging
- [ ] Feature flags configured for gradual rollout
- [ ] Monitoring dashboards prepared
- [ ] On-call team notified
- [ ] Rollback plan documented

## Deployment Steps

### 1. Verify Current State

```bash
# Check current deployment status
kubectl -n myapp get rollout myapp-api
kubectl -n myapp get pods -l app=myapp-api

# Check ArgoCD application status
argocd app get myapp-prod --refresh

# Verify current version
kubectl -n myapp get rollout myapp-api -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### 2. Trigger Deployment

#### Option A: GitOps (Recommended)

```bash
# Update image tag in GitOps repo
cd myapp-gitops
git checkout main
git pull origin main

# Update production overlay
cd overlays/prod
kustomize edit set image harbor.company.com/myapp/api:v1.1.0

# Commit and push
git add .
git commit -m "chore: deploy v1.1.0 to production"
git push origin main

# ArgoCD will detect and sync automatically
```

#### Option B: Direct ArgoCD Sync

```bash
# Sync with specific image
argocd app set myapp-prod \
  --parameter image.tag=v1.1.0

# Trigger sync
argocd app sync myapp-prod --prune
```

#### Option C: Argo Rollouts CLI

```bash
# Update rollout image
kubectl -n myapp argo rollouts set image myapp-api \
  api=harbor.company.com/myapp/api:v1.1.0
```

### 3. Monitor Deployment

```bash
# Watch rollout progress
kubectl -n myapp argo rollouts get rollout myapp-api --watch

# Check rollout status
kubectl -n myapp argo rollouts status myapp-api

# View rollout events
kubectl -n myapp describe rollout myapp-api

# Check analysis runs
kubectl -n myapp get analysisrun -l rollout=myapp-api
```

### 4. Promote or Abort

#### Promote (Blue-Green)

```bash
# After preview validation, promote to active
kubectl -n myapp argo rollouts promote myapp-api

# Or via ArgoCD
argocd app actions run myapp-prod promote --kind Rollout
```

#### Promote (Canary - Skip to Next Step)

```bash
# Skip current pause and move to next step
kubectl -n myapp argo rollouts promote myapp-api

# Skip all remaining steps (full promote)
kubectl -n myapp argo rollouts promote myapp-api --full
```

#### Abort Deployment

```bash
# Abort and rollback
kubectl -n myapp argo rollouts abort myapp-api

# Undo (revert to previous version)
kubectl -n myapp argo rollouts undo myapp-api
```

### 5. Post-Deployment Validation

```bash
# Run smoke tests
./scripts/smoke-test.sh https://api.company.com

# Check logs for errors
kubectl -n myapp logs -l app=myapp-api --tail=100 | grep -i error

# Verify metrics
curl -s http://prometheus:9090/api/v1/query?query=http_requests_total{service=\"myapp-api\"}
```

## Post-Deployment Checklist

- [ ] Smoke tests passed
- [ ] No error spikes in logs
- [ ] Latency within SLO
- [ ] No increase in error rate
- [ ] Feature flags verified working
- [ ] Documentation updated if needed
```

---

## Step 4: Create Rollback Procedures

Create `aicodepath-docs/operations/deployment/rollback-procedures.md`:

```markdown
# Rollback Procedures: [Unit Name]

## Quick Rollback Commands

### Argo Rollouts Rollback

```bash
# Immediate rollback to previous revision
kubectl -n myapp argo rollouts undo myapp-api

# Rollback to specific revision
kubectl -n myapp argo rollouts undo myapp-api --to-revision=2

# Abort current rollout (stops in-progress deployment)
kubectl -n myapp argo rollouts abort myapp-api
```

### ArgoCD Rollback

```bash
# List deployment history
argocd app history myapp-prod

# Rollback to previous sync
argocd app rollback myapp-prod

# Rollback to specific revision
argocd app rollback myapp-prod 5
```

### Helm Rollback (if using Helm directly)

```bash
# List release history
helm -n myapp history myapp-api

# Rollback to previous release
helm -n myapp rollback myapp-api

# Rollback to specific revision
helm -n myapp rollback myapp-api 3
```

### GitOps Rollback (Recommended)

```bash
# Revert the deployment commit
cd myapp-gitops
git log --oneline -5  # Find the commit to revert
git revert HEAD
git push origin main

# ArgoCD will sync the reverted state
```

## Rollback Decision Matrix

| Symptom | Severity | Action | Commands |
|---------|----------|--------|----------|
| Error rate > 5% | Critical | Immediate rollback | `argo rollouts abort && argo rollouts undo` |
| Error rate 1-5% | High | Pause and investigate | `argo rollouts pause` |
| Latency p99 > 2x baseline | High | Pause rollout | `argo rollouts pause` |
| Memory leak detected | Medium | Complete rollout, hotfix | Monitor, prepare patch |
| Minor UI bug | Low | Continue, fix forward | Document for next release |

## Automated Rollback Triggers

### Configure Auto-Rollback in Rollout

```yaml
spec:
  strategy:
    canary:
      # Automatically abort if analysis fails
      abortScaleDownDelaySeconds: 30
      analysis:
        templates:
          - templateName: success-rate
        # Abort after 3 failed checks
        args:
          - name: threshold
            value: "0.99"
```

### Alert-Based Rollback (PagerDuty Integration)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: rollback-on-alert
spec:
  metrics:
    - name: pagerduty-incidents
      provider:
        web:
          url: "https://api.pagerduty.com/incidents?service_ids[]=PXXXXXX&statuses[]=triggered"
          headers:
            - key: Authorization
              value: "Token token={{args.pd-token}}"
      # Fail if any triggered incidents
      successCondition: len(result.incidents) == 0
      failureLimit: 1
```

## Rollback Verification

After rollback, verify:

```bash
# 1. Check rollout status
kubectl -n myapp argo rollouts status myapp-api

# 2. Verify active version
kubectl -n myapp get rollout myapp-api -o jsonpath='{.status.currentPodHash}'

# 3. Check all pods running correct version
kubectl -n myapp get pods -l app=myapp-api -o jsonpath='{.items[*].spec.containers[0].image}'

# 4. Run smoke tests
./scripts/smoke-test.sh https://api.company.com

# 5. Verify metrics recovered
# Check Grafana/Prometheus dashboards
```

## Post-Rollback Actions

1. **Immediate**:
   - Notify stakeholders (Slack/Email)
   - Update incident ticket
   - Preserve logs for analysis

2. **Within 1 hour**:
   - Root cause analysis started
   - Decision on fix timeline

3. **Within 24 hours**:
   - RCA document completed
   - Fix implemented and tested
   - Deployment retry scheduled
```

---

## Step 5: Create Post-Deployment Validation

Create `aicodepath-docs/operations/deployment/validation-scripts/`:

### smoke-test.sh

```bash
#!/bin/bash
# Post-deployment smoke test script

set -e

BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=5
RETRIES=3

echo "Running smoke tests against $BASE_URL"

# Function to make HTTP request with retry
http_check() {
    local endpoint=$1
    local expected_status=${2:-200}
    local attempt=1

    while [ $attempt -le $RETRIES ]; do
        status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL$endpoint")
        if [ "$status" -eq "$expected_status" ]; then
            echo "✅ $endpoint returned $status"
            return 0
        fi
        echo "⏳ Attempt $attempt: $endpoint returned $status (expected $expected_status)"
        attempt=$((attempt + 1))
        sleep 2
    done

    echo "❌ $endpoint failed after $RETRIES attempts"
    return 1
}

# Function to check JSON response
json_check() {
    local endpoint=$1
    local jq_filter=$2
    local expected=$3

    response=$(curl -s --max-time $TIMEOUT "$BASE_URL$endpoint")
    actual=$(echo "$response" | jq -r "$jq_filter")

    if [ "$actual" = "$expected" ]; then
        echo "✅ $endpoint: $jq_filter = $expected"
        return 0
    else
        echo "❌ $endpoint: $jq_filter = $actual (expected $expected)"
        return 1
    fi
}

# Health checks
echo ""
echo "=== Health Checks ==="
http_check "/health/live" 200
http_check "/health/ready" 200

# API endpoints
echo ""
echo "=== API Endpoints ==="
http_check "/api/v1/status" 200
json_check "/api/v1/status" ".status" "ok"

# Version check
echo ""
echo "=== Version Check ==="
json_check "/api/v1/version" ".version" "${EXPECTED_VERSION:-}"

# Database connectivity (if applicable)
echo ""
echo "=== Database Check ==="
json_check "/health/ready" ".checks.database" "healthy"

# External dependencies
echo ""
echo "=== Dependency Checks ==="
json_check "/health/ready" ".checks.redis" "healthy"
json_check "/health/ready" ".checks.kafka" "healthy"

echo ""
echo "=== Smoke Tests Complete ==="
```

### validate-deployment.sh

```bash
#!/bin/bash
# Comprehensive deployment validation

set -e

NAMESPACE="${NAMESPACE:-myapp}"
DEPLOYMENT="${DEPLOYMENT:-myapp-api}"
REPLICAS_EXPECTED="${REPLICAS:-3}"

echo "Validating deployment: $DEPLOYMENT in namespace: $NAMESPACE"

# Check rollout status
echo ""
echo "=== Rollout Status ==="
kubectl -n $NAMESPACE argo rollouts status $DEPLOYMENT --timeout 300s

# Check pod count
echo ""
echo "=== Pod Count ==="
pod_count=$(kubectl -n $NAMESPACE get pods -l app=$DEPLOYMENT --field-selector=status.phase=Running -o json | jq '.items | length')
if [ "$pod_count" -eq "$REPLICAS_EXPECTED" ]; then
    echo "✅ Pod count: $pod_count (expected: $REPLICAS_EXPECTED)"
else
    echo "❌ Pod count: $pod_count (expected: $REPLICAS_EXPECTED)"
    exit 1
fi

# Check all pods are ready
echo ""
echo "=== Pod Readiness ==="
not_ready=$(kubectl -n $NAMESPACE get pods -l app=$DEPLOYMENT -o json | jq '[.items[].status.conditions[] | select(.type=="Ready" and .status!="True")] | length')
if [ "$not_ready" -eq "0" ]; then
    echo "✅ All pods ready"
else
    echo "❌ $not_ready pods not ready"
    kubectl -n $NAMESPACE get pods -l app=$DEPLOYMENT
    exit 1
fi

# Check for recent restarts
echo ""
echo "=== Recent Restarts ==="
restarts=$(kubectl -n $NAMESPACE get pods -l app=$DEPLOYMENT -o json | jq '[.items[].status.containerStatuses[].restartCount] | add')
if [ "$restarts" -lt "3" ]; then
    echo "✅ Total restarts: $restarts"
else
    echo "⚠️ High restart count: $restarts"
fi

# Check HPA status
echo ""
echo "=== HPA Status ==="
kubectl -n $NAMESPACE get hpa $DEPLOYMENT 2>/dev/null || echo "No HPA configured"

# Check recent events
echo ""
echo "=== Recent Events ==="
kubectl -n $NAMESPACE get events --field-selector involvedObject.name=$DEPLOYMENT --sort-by='.lastTimestamp' | tail -10

echo ""
echo "=== Validation Complete ==="
```

---

## Step 6: Create Deployment Status Tracking

Create `aicodepath-docs/operations/deployment/deployment-status.md`:

```markdown
# Deployment Status: [Unit Name]

## Current Production Version

| Environment | Version | Image Tag | Deployed At | Deployed By |
|-------------|---------|-----------|-------------|-------------|
| Production | v1.0.0 | main-abc123 | 2024-01-15 14:30 UTC | @engineer |
| Staging | v1.1.0 | main-def456 | 2024-01-16 10:00 UTC | CI/CD |
| Development | v1.1.1-dev | main-ghi789 | 2024-01-16 12:00 UTC | CI/CD |

## Deployment History

| Version | Environment | Status | Duration | Notes |
|---------|-------------|--------|----------|-------|
| v1.1.0 | Staging | ✅ Success | 5m 23s | Canary 100% |
| v1.0.0 | Production | ✅ Success | 8m 12s | Blue-green |
| v0.9.5 | Production | ❌ Rolled Back | 3m 45s | Error rate spike |
| v0.9.4 | Production | ✅ Success | 6m 30s | - |

## Active Rollouts

| Rollout | Environment | Strategy | Progress | Status |
|---------|-------------|----------|----------|--------|
| myapp-api | Staging | Canary | 50% | ⏳ Analyzing |
| myapp-worker | Development | Rolling | 100% | ✅ Complete |

## Upcoming Deployments

| Version | Scheduled | Environment | Changes | Owner |
|---------|-----------|-------------|---------|-------|
| v1.1.0 | 2024-01-17 09:00 UTC | Production | Feature X, Bug fixes | @team |

## Rollback Log

| Date | From | To | Reason | Duration | Impact |
|------|------|-----|--------|----------|--------|
| 2024-01-10 | v0.9.5 | v0.9.4 | Error rate > 5% | 2m 15s | Minor |
```

---

## Step 7: Update Progress and Present Completion

```markdown
# Deployment Operations Complete: [Unit Name]

Deployment operations defined:

- **Strategies**: Blue-green, Canary, Rolling update
- **Analysis**: Success rate, Latency, Error rate templates
- **Runbook**: Pre/post deployment checklists
- **Rollback**: Automated and manual procedures
- **Validation**: Smoke tests, deployment validation

> **REVIEW REQUIRED:**
> Please examine deployment config at: `aicodepath-docs/operations/deployment/`

> **DEPLOYMENT READY:**
> - [ ] Review rollout strategy
> - [ ] Verify analysis thresholds
> - [ ] Test rollback procedures
> - [ ] Schedule deployment window
```

---

## Step 8: Wait for Explicit Approval

---

## References

- CI/CD Design: `rules/construction/cicd-design.md`
- Kubernetes Design: `rules/construction/kubernetes-design.md`
- Environment Strategy: `rules/construction/environment-strategy.md`
- DevOps Guidelines: `guidelines/devops-rules.json`
