# Kubernetes Design (Per-Unit)

**Purpose**: Design Kubernetes deployment manifests, Helm charts, resource configurations, and orchestration settings for enterprise-grade container deployment

**Execute IF**:
- Kubernetes deployment required
- Container orchestration needed
- Helm chart packaging required
- Multi-environment K8s deployment planned

**Skip IF**:
- No Kubernetes deployment
- Serverless or simple container deployment (ECS, Cloud Run)
- K8s configuration already exists and unchanged

## Prerequisites
- Docker Design complete
- Infrastructure Design complete
- Environment Strategy complete
- Secrets Management Design complete

---

## Step 1: Load Context

### 1.1 Load Prior Artifacts
- Load `aicodepath-docs/construction/{unit-name}/docker-design/` artifacts
- Load `aicodepath-docs/construction/environment-strategy/` artifacts
- Load `aicodepath-docs/construction/{unit-name}/infrastructure-design/`
- Load `aicodepath-docs/construction/{unit-name}/secrets-management/`
- Load `aicodepath-docs/construction/{unit-name}/observability-design/`

### 1.2 Gather K8s Requirements

Create `aicodepath-docs/construction/{unit-name}/kubernetes-design/k8s-questions.md`:

```markdown
# Kubernetes Design Questions: [Unit Name]

## Question 1: Kubernetes Distribution
What Kubernetes distribution is used?

A) **EKS** (Amazon Elastic Kubernetes Service)
B) **GKE** (Google Kubernetes Engine)
C) **AKS** (Azure Kubernetes Service)
D) **OpenShift** (Red Hat)
E) **Self-managed** (kubeadm, k3s, RKE)

[Answer]:

---

## Question 2: Deployment Packaging
What deployment packaging is preferred?

A) **Helm Charts** (templated, versioned, parameterized)
B) **Kustomize** (overlay-based, no templating)
C) **Plain YAML** (simple, direct manifests)
D) **Helm + Kustomize hybrid** (best of both)

[Answer]:

---

## Question 3: Ingress Controller
What ingress controller is in use?

A) **NGINX Ingress** (most common, feature-rich)
B) **Traefik** (auto-discovery, middleware)
C) **AWS ALB Ingress** (EKS native)
D) **Istio Gateway** (service mesh)
E) **Other** (describe below)

[Answer]:

---

## Question 4: Service Mesh
Is a service mesh required?

A) **Istio** (full-featured, complex)
B) **Linkerd** (lightweight, simple)
C) **AWS App Mesh** (EKS native)
D) **No service mesh** (standard K8s networking)

[Answer]:

---

## Question 5: Scaling Requirements
What scaling configuration is needed?

A) **HPA** (Horizontal Pod Autoscaler based on CPU/memory)
B) **HPA + VPA** (Horizontal + Vertical Pod Autoscaler)
C) **KEDA** (Event-driven autoscaling)
D) **Fixed replicas** (manual scaling only)

[Answer]:
```

---

## Step 2: Create Base Manifests

Create `aicodepath-docs/construction/{unit-name}/kubernetes-design/base-manifests/`:

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.name }}
  namespace: {{ .Values.namespace }}
  labels:
    app.kubernetes.io/name: {{ .Values.name }}
    app.kubernetes.io/version: {{ .Values.image.tag | quote }}
    app.kubernetes.io/component: api
    app.kubernetes.io/part-of: {{ .Values.project }}
    app.kubernetes.io/managed-by: helm
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  replicas: {{ .Values.replicaCount }}
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ .Values.name }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ .Values.name }}
        app.kubernetes.io/version: {{ .Values.image.tag | quote }}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "{{ .Values.metrics.port }}"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: {{ .Values.serviceAccount.name }}

      # Security Context (Pod-level)
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault

      # Graceful shutdown
      terminationGracePeriodSeconds: 30

      containers:
        - name: {{ .Values.name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}

          # Container Security Context
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL

          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
            - name: metrics
              containerPort: {{ .Values.metrics.port }}
              protocol: TCP

          # Environment from ConfigMap and Secrets
          envFrom:
            - configMapRef:
                name: {{ .Values.name }}-config
            - secretRef:
                name: {{ .Values.name }}-secrets

          # Additional environment variables
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName

          # Resource limits
          resources:
            requests:
              memory: {{ .Values.resources.requests.memory }}
              cpu: {{ .Values.resources.requests.cpu }}
            limits:
              memory: {{ .Values.resources.limits.memory }}
              cpu: {{ .Values.resources.limits.cpu }}

          # Health checks
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          startupProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30

          # Volume mounts
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /app/.cache

      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}

      # Pod scheduling
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/name: {{ .Values.name }}
                topologyKey: kubernetes.io/hostname

      # Topology spread for HA
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: {{ .Values.name }}
```

### service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.name }}
  namespace: {{ .Values.namespace }}
  labels:
    app.kubernetes.io/name: {{ .Values.name }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
    - port: {{ .Values.metrics.port }}
      targetPort: metrics
      protocol: TCP
      name: metrics
  selector:
    app.kubernetes.io/name: {{ .Values.name }}
```

### hpa.yaml

```yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ .Values.name }}
  namespace: {{ .Values.namespace }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ .Values.name }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilization }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetMemoryUtilization }}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
        - type: Pods
          value: 1
          periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
{{- end }}
```

### pdb.yaml (Pod Disruption Budget)

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ .Values.name }}-pdb
  namespace: {{ .Values.namespace }}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ .Values.name }}
```

### networkpolicy.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ .Values.name }}-network-policy
  namespace: {{ .Values.namespace }}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: {{ .Values.name }}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: {{ .Values.service.targetPort }}
    # Allow from same namespace
    - from:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: {{ .Values.service.targetPort }}
    # Allow Prometheus scraping
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
      ports:
        - protocol: TCP
          port: {{ .Values.metrics.port }}
  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    # Allow to database
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Allow HTTPS egress (external APIs)
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
```

---

## Step 3: Create Helm Chart Structure

Create `aicodepath-docs/construction/{unit-name}/kubernetes-design/helm-chart/`:

### Chart.yaml

```yaml
apiVersion: v2
name: myapp-api
description: Helm chart for MyApp API service
type: application
version: 0.1.0
appVersion: "1.0.0"
maintainers:
  - name: Platform Team
    email: platform@company.com
keywords:
  - api
  - nodejs
  - microservice
home: https://github.com/company/myapp
sources:
  - https://github.com/company/myapp
```

### values.yaml (Base)

```yaml
# Default values for myapp-api
name: myapp-api
project: myapp
namespace: myapp

# Image configuration
image:
  repository: harbor.company.com/myapp/api
  tag: "latest"
  pullPolicy: IfNotPresent

# Replica count (overridden by HPA when enabled)
replicaCount: 2

# Service configuration
service:
  type: ClusterIP
  port: 80
  targetPort: 3000

# Resource limits
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilization: 70
  targetMemoryUtilization: 80

# Metrics
metrics:
  port: 9090

# Service account
serviceAccount:
  name: myapp-api
  create: true
  annotations: {}

# Ingress
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
  hosts:
    - host: api.company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-tls
      hosts:
        - api.company.com

# ConfigMap data (non-sensitive)
config:
  NODE_ENV: production
  LOG_LEVEL: info
  API_TIMEOUT: "30000"
```

### values-dev.yaml

```yaml
namespace: myapp-dev

replicaCount: 1

resources:
  requests:
    memory: "128Mi"
    cpu: "50m"
  limits:
    memory: "256Mi"
    cpu: "200m"

autoscaling:
  enabled: false

config:
  NODE_ENV: development
  LOG_LEVEL: debug

ingress:
  hosts:
    - host: api-dev.company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-dev-tls
      hosts:
        - api-dev.company.com
```

### values-staging.yaml

```yaml
namespace: myapp-staging

replicaCount: 2

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5

config:
  NODE_ENV: staging
  LOG_LEVEL: info

ingress:
  hosts:
    - host: api-staging.company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-staging-tls
      hosts:
        - api-staging.company.com
```

### values-prod.yaml

```yaml
namespace: myapp-prod

replicaCount: 3

resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

config:
  NODE_ENV: production
  LOG_LEVEL: warn

ingress:
  hosts:
    - host: api.company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-prod-tls
      hosts:
        - api.company.com
```

---

## Step 4: Create Resource Guidelines

Create `aicodepath-docs/construction/{unit-name}/kubernetes-design/resource-guidelines.md`:

```markdown
# Resource Guidelines: [Unit Name]

## Resource Sizing Matrix

| Environment | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas |
|-------------|-------------|-----------|----------------|--------------|----------|
| Development | 50m | 200m | 128Mi | 256Mi | 1 |
| Staging | 100m | 500m | 256Mi | 512Mi | 2 |
| Production | 250m | 1000m | 512Mi | 1Gi | 3-20 |

## Scaling Thresholds

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU | > 70% for 30s | < 30% for 5m |
| Memory | > 80% for 30s | < 40% for 5m |

## Health Check Timing

| Probe | Initial Delay | Period | Timeout | Failures |
|-------|---------------|--------|---------|----------|
| Liveness | 30s | 10s | 5s | 3 |
| Readiness | 5s | 5s | 3s | 3 |
| Startup | 10s | 5s | 3s | 30 |

## Cost Estimation

| Environment | Nodes | vCPU | Memory | Monthly Cost (estimate) |
|-------------|-------|------|--------|-------------------------|
| Development | 1 | 2 | 4GB | ~$50 |
| Staging | 2 | 4 | 8GB | ~$150 |
| Production | 5+ | 20+ | 40GB+ | ~$800+ |
```

---

## Step 5: Create External Secrets Configuration

Create `aicodepath-docs/construction/{unit-name}/kubernetes-design/external-secrets.yaml`:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: {{ .Values.name }}-secrets
  namespace: {{ .Values.namespace }}
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: {{ .Values.name }}-secrets
    creationPolicy: Owner
    template:
      type: Opaque
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: {{ .Values.environment }}/{{ .Values.name }}/database
        property: url
    - secretKey: JWT_SECRET
      remoteRef:
        key: {{ .Values.environment }}/{{ .Values.name }}/auth
        property: jwt_secret
    - secretKey: REDIS_URL
      remoteRef:
        key: {{ .Values.environment }}/{{ .Values.name }}/cache
        property: redis_url
    - secretKey: API_KEY
      remoteRef:
        key: {{ .Values.environment }}/{{ .Values.name }}/api
        property: key
```

---

## Step 6: Update Progress

- Mark Kubernetes design complete in aicodepath-state.md
- Log decisions in audit.md

---

## Step 7: Present Completion Message

```markdown
# Kubernetes Design Complete: [Unit Name]

Kubernetes design has defined:
- **Manifests**: Deployment, Service, HPA, PDB, NetworkPolicy
- **Helm Values**: dev / staging / prod overlays
- **Autoscaling**: HPA with [X]-[X] replicas
- **Security**: Security contexts, network policies, external secrets

Key Artifacts Created:
- `base-manifests/` - Core K8s manifests with Helm templating
- `helm-chart/` - Chart.yaml and environment values
- `resource-guidelines.md` - Sizing and scaling recommendations
- `external-secrets.yaml` - Secrets synchronization

> **REVIEW REQUIRED:**
> Please examine the Kubernetes design at: `aicodepath-docs/construction/{unit-name}/kubernetes-design/`

> **WHAT'S NEXT?**
>
> **Request Changes** - Ask for modifications to Kubernetes design
> **Continue to Next Stage** - Proceed to **CI/CD Design**
```

---

## Step 8: Wait for Explicit Approval

---

## References

- Docker Design: `rules/construction/docker-design.md`
- Environment Strategy: `rules/construction/environment-strategy.md`
- Secrets Management: `rules/construction/secrets-management.md`
- CI/CD Design: `rules/construction/cicd-design.md`
