---
name: aicodepath-gcp-monorepo-deploy
description: >
  Automate deployment of monorepo services to GCP with environment-specific
  configurations (STG, PROD). Handles Cloud Build, Cloud Run deployment,
  Secret Manager integration, named VPC networks, named data layer (Cloud SQL,
  GCS), dedicated service accounts, scheduled start/stop for cost control,
  monitoring, and rollback procedures. Use when users mention: GCP deployment,
  Cloud Build, Cloud Run, deploy monorepo, CI/CD pipeline, continuous deployment,
  environment deployment, deploy to cloud, automated deployment, or GCP cost saving.
tags:
  - gcp
  - deployment
  - cloud-build
  - cloud-run
  - ci-cd
  - monitoring
  - cost-optimization
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep
argument-hint: "[--setup] [--deploy <env>] [--rollback <env> <service>] [--status <env>] [--start <env>] [--stop <env>]"
disable-model-invocation: false
---

# GCP Monorepo Deployment

Automate deployment of monorepo services to Google Cloud Platform with environment-specific configurations, named networking, dedicated service accounts, named persistent data layers, scheduled start/stop for cost control, and rollback procedures.

**Phase restriction**: This skill is designed for the **OPERATIONS** phase of the AICodePath workflow.

**Prerequisite**: Requires `services.yaml` from the `aicodepath-git-monorepo-config` skill (or manual creation).

**Scope**: This skill covers `staging` (docker-compose) and `main` (GCP) branches only. The `develop` branch runs locally at no cost.

---

## Quick Start

```
set up GCP deployment for my monorepo
```

The skill validates prerequisites, configures GCP projects, and sets up deployment pipelines.

---

## Triggers

| Trigger | Example |
|---------|---------|
| Full GCP setup | "set up GCP deployment for my monorepo" |
| Deploy to environment | "deploy to staging" |
| Rollback | "rollback auth-service in production" |
| Check status | "check deployment status in prod" |
| Start/stop environment | "start prod", "stop staging to save cost" |
| Schedule start/stop | "set up scheduled shutdown for prod at 8pm" |

---

## What This Skill Does

- Validates GCP prerequisites (gcloud CLI, project access)
- Enables required GCP APIs and creates named Artifact Registry
- Configures named VPC network (never uses `default` network)
- Creates dedicated service accounts per environment (least privilege)
- Sets up named, persistent data layer (Cloud SQL, GCS, Firestore with consistent naming)
- Creates Cloud Build configurations with per-service builds
- Generates environment-specific config files
- Sets up Cloud Build triggers linked to branches
- Configures Cloud Scheduler for scheduled start/stop (cost saving)
- Creates VM start/stop scripts and schedules
- Creates deployment, rollback, and status check scripts
- Configures Cloud Monitoring dashboards and alerting

## What This Skill Does NOT Do

- Configure Git branches (use `aicodepath-git-monorepo-config`)
- Set up branch protection (use `aicodepath-git-monorepo-config`)
- Install Git hooks (use `aicodepath-git-monorepo-config`)
- Manage local development environment (local = develop branch, no GCP cost)

---

## Naming Convention

Ask user for `PROJECT_NAME` (e.g., `myapp`). All GCP resources use this as a prefix for consistency and auditability.

| Resource | Naming Pattern | Example |
|----------|---------------|---------|
| VPC Network | `{project}-{env}-vpc` | `myapp-prod-vpc` |
| Subnet | `{project}-{env}-subnet` | `myapp-prod-subnet` |
| Service Account | `{project}-{env}-sa` | `myapp-prod-sa` |
| Artifact Registry | `{project}-{env}-registry` | `myapp-prod-registry` |
| Cloud SQL | `{project}-{env}-db` | `myapp-prod-db` |
| GCS Bucket | `{project}-{env}-{purpose}` | `myapp-prod-assets` |
| Cloud Run Service | `{project}-{service}-{env}` | `myapp-api-prod` |
| Scheduler Job | `{project}-{env}-{action}` | `myapp-prod-stop` |

---

## Capability 1: Prerequisites Validation

### Step 1.1: Check gcloud CLI

```bash
bash .aicodepath/skills/aicodepath-gcp-monorepo-deploy/scripts/validate-prerequisites.sh
```

Checks: gcloud installed, authenticated, project access, services.yaml exists.

### Step 1.2: Verify GCP Projects

Check access to required GCP projects (staging, prod). User provides project IDs saved to `.gcp-projects`:

```bash
# .gcp-projects
STG_PROJECT=myapp-staging
PROD_PROJECT=myapp-production
REGION=asia-southeast1   # or user-specified region
```

### Step 1.3: Check services.yaml

If missing, offer to:
1. Run `aicodepath-git-monorepo-config` first
2. Create services.yaml manually
3. Auto-detect and create a basic services.yaml

---

## Capability 2: Named VPC Network Setup

**NEVER use the `default` network.** All environments get a dedicated named VPC.

### Step 2.1: Create Named VPC

```bash
# Create VPC per environment
for ENV in stg prod; do
  NETWORK="${PROJECT_NAME}-${ENV}-vpc"
  SUBNET="${PROJECT_NAME}-${ENV}-subnet"

  gcloud compute networks create "$NETWORK" \
    --project="$PROJECT" \
    --subnet-mode=custom \
    --bgp-routing-mode=regional

  gcloud compute networks subnets create "$SUBNET" \
    --project="$PROJECT" \
    --network="$NETWORK" \
    --region="$REGION" \
    --range=10.0.0.0/24

  # Firewall: allow internal traffic only
  gcloud compute firewall-rules create "${NETWORK}-allow-internal" \
    --project="$PROJECT" \
    --network="$NETWORK" \
    --allow=tcp,udp,icmp \
    --source-ranges=10.0.0.0/24

  # Firewall: allow health checks from GCP LB
  gcloud compute firewall-rules create "${NETWORK}-allow-health-checks" \
    --project="$PROJECT" \
    --network="$NETWORK" \
    --allow=tcp \
    --source-ranges=35.191.0.0/16,130.211.0.0/22

  # Serverless VPC connector for Cloud Run → Cloud SQL
  gcloud compute networks vpc-access connectors create "${PROJECT_NAME}-${ENV}-connector" \
    --project="$PROJECT" \
    --network="$NETWORK" \
    --region="$REGION" \
    --range=10.8.0.0/28
done
```

---

## Capability 3: Dedicated Service Accounts

One service account per environment, named consistently, with only required permissions.

### Step 3.1: Create Service Accounts

```bash
for ENV in stg prod; do
  SA_NAME="${PROJECT_NAME}-${ENV}-sa"
  SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

  gcloud iam service-accounts create "$SA_NAME" \
    --project="$PROJECT" \
    --display-name="${PROJECT_NAME} ${ENV} Service Account" \
    --description="Dedicated SA for ${ENV} Cloud Run services"

  # Least-privilege roles
  for ROLE in \
    roles/logging.logWriter \
    roles/monitoring.metricWriter \
    roles/cloudtrace.agent \
    roles/secretmanager.secretAccessor \
    roles/cloudsql.client; do
    gcloud projects add-iam-policy-binding "$PROJECT" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="$ROLE"
  done

  echo "SA created: ${SA_EMAIL}"
done
```

### Step 3.2: Cloud Build Service Account

Separate SA for Cloud Build (deployer role only):

```bash
CB_SA="${PROJECT_NAME}-cloudbuild-sa"
CB_EMAIL="${CB_SA}@${PROJECT}.iam.gserviceaccount.com"

gcloud iam service-accounts create "$CB_SA" \
  --project="$PROJECT" \
  --display-name="${PROJECT_NAME} Cloud Build Deployer"

for ROLE in \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/artifactregistry.writer \
  roles/cloudsql.admin \
  roles/storage.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${CB_EMAIL}" \
    --role="$ROLE"
done
```

---

## Capability 4: Named Data Layer (Persistent)

All data resources use consistent naming and persist across deployments. Data is never destroyed on redeploy.

### Step 4.1: Named Artifact Registry

```bash
for ENV in stg prod; do
  REGISTRY="${PROJECT_NAME}-${ENV}-registry"

  gcloud artifacts repositories create "$REGISTRY" \
    --project="$PROJECT" \
    --repository-format=docker \
    --location="$REGION" \
    --description="${PROJECT_NAME} ${ENV} container images"
done
```

### Step 4.2: Named Cloud SQL Instance

```bash
for ENV in stg prod; do
  DB_NAME="${PROJECT_NAME}-${ENV}-db"
  DB_TIER="db-g1-small"     # staging: small; prod: ask user
  [ "$ENV" == "prod" ] && DB_TIER="db-n1-standard-2"

  gcloud sql instances create "$DB_NAME" \
    --project="$PROJECT" \
    --database-version=POSTGRES_15 \
    --tier="$DB_TIER" \
    --region="$REGION" \
    --network="${PROJECT_NAME}-${ENV}-vpc" \
    --no-assign-ip \
    --backup-start-time=03:00 \
    --retained-backups-count=7 \
    --deletion-protection   # CRITICAL: protects prod data

  # Create application database and user
  gcloud sql databases create "${PROJECT_NAME}_${ENV}" \
    --project="$PROJECT" \
    --instance="$DB_NAME"

  gcloud sql users create "${PROJECT_NAME}_app" \
    --project="$PROJECT" \
    --instance="$DB_NAME" \
    --password="$(openssl rand -base64 24)"

  echo "Cloud SQL instance: $DB_NAME"
  echo "Database: ${PROJECT_NAME}_${ENV}"
  echo "Store the generated password in Secret Manager immediately."
done
```

### Step 4.3: Named GCS Buckets

```bash
for ENV in stg prod; do
  for PURPOSE in assets uploads backups; do
    BUCKET="${PROJECT_NAME}-${ENV}-${PURPOSE}"

    gcloud storage buckets create "gs://${BUCKET}" \
      --project="$PROJECT" \
      --location="$REGION" \
      --uniform-bucket-level-access \
      --no-public-access-prevention   # adjust per use case

    # Lifecycle: auto-delete old files for non-permanent buckets
    if [ "$PURPOSE" == "uploads" ]; then
      gcloud storage buckets update "gs://${BUCKET}" \
        --lifecycle-file=- << 'EOF'
{"rule":[{"action":{"type":"Delete"},"condition":{"age":90}}]}
EOF
    fi
  done
done
```

### Step 4.4: Store Credentials in Secret Manager

```bash
# Never store secrets as env vars or in code
gcloud secrets create "${PROJECT_NAME}-${ENV}-db-url" \
  --project="$PROJECT" \
  --replication-policy=automatic

echo -n "postgresql://${PROJECT_NAME}_app:${DB_PASS}@/${PROJECT_NAME}_${ENV}?host=/cloudsql/${PROJECT}:${REGION}:${DB_NAME}" | \
  gcloud secrets versions add "${PROJECT_NAME}-${ENV}-db-url" \
    --project="$PROJECT" \
    --data-file=-
```

---

## Capability 5: Build Configuration

### Step 5.1: Root Cloud Build Configuration

Generate `cloudbuild.yaml`:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/git'
    id: 'detect-changes'
    args: ['diff', '--name-only', 'HEAD~1', 'HEAD']

  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-and-push'
    script: |
      #!/bin/bash
      REGISTRY="${_REGION}-docker.pkg.dev/${_PROJECT}/${_PROJECT_NAME}-${_ENV}-registry"
      for SERVICE in $CHANGED_SERVICES; do
        docker build -t "$REGISTRY/$SERVICE:$COMMIT_SHA" ./$SERVICE
        docker push "$REGISTRY/$SERVICE:$COMMIT_SHA"
        docker tag "$REGISTRY/$SERVICE:$COMMIT_SHA" "$REGISTRY/$SERVICE:latest"
        docker push "$REGISTRY/$SERVICE:latest"
      done

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy'
    script: |
      #!/bin/bash
      for SERVICE in $CHANGED_SERVICES; do
        gcloud run deploy "${_PROJECT_NAME}-$SERVICE-${_ENV}" \
          --image="${_REGION}-docker.pkg.dev/${_PROJECT}/${_PROJECT_NAME}-${_ENV}-registry/$SERVICE:$COMMIT_SHA" \
          --region="${_REGION}" \
          --project="${_PROJECT}" \
          --service-account="${_PROJECT_NAME}-${_ENV}-sa@${_PROJECT}.iam.gserviceaccount.com" \
          --vpc-connector="${_PROJECT_NAME}-${_ENV}-connector" \
          --vpc-egress=all-traffic \
          --no-allow-unauthenticated \
          --set-secrets="DATABASE_URL=${_PROJECT_NAME}-${_ENV}-db-url:latest" \
          --min-instances=${_MIN_INSTANCES} \
          --max-instances=${_MAX_INSTANCES}
      done

substitutions:
  _PROJECT_NAME: myapp
  _ENV: prod
  _REGION: asia-southeast1
  _MIN_INSTANCES: '1'
  _MAX_INSTANCES: '10'
```

### Step 5.2: Environment-Specific Settings

| Setting | staging | prod |
|---------|---------|------|
| `--min-instances` | 0 (scale to zero) | 1 |
| `--max-instances` | 3 | 20 |
| `--no-allow-unauthenticated` | YES | YES |
| VPC connector | YES | YES |
| Secret Manager | YES | YES |
| DB tier | db-g1-small | db-n1-standard-2 |

---

## Capability 6: Cloud Build Triggers

```bash
# staging: auto-deploy on push to staging branch
gcloud builds triggers create github \
  --name="${PROJECT_NAME}-deploy-staging" \
  --branch-pattern="^staging$" \
  --build-config="cloudbuild.yaml" \
  --project="$STG_PROJECT" \
  --substitutions="_ENV=stg,_MIN_INSTANCES=0,_MAX_INSTANCES=3"

# main: manual trigger only (approval required)
gcloud builds triggers create github \
  --name="${PROJECT_NAME}-deploy-prod" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --project="$PROD_PROJECT" \
  --require-approval \
  --substitutions="_ENV=prod,_MIN_INSTANCES=1,_MAX_INSTANCES=20"
```

---

## Capability 7: Scheduled Start/Stop (Cost Control)

**This capability significantly reduces cost by shutting down non-production resources outside business hours.**

Present this to user:
```
Recommended schedule (adjust to your timezone and business hours):

  staging:
    Start:  Mon-Fri 08:00
    Stop:   Mon-Fri 20:00
    Weekend: stopped

  prod VMs (if any):
    No scheduled stop — production must be always available
    Use min-instances=0 on Cloud Run (auto scale-to-zero)

Estimated staging savings: ~60% reduction in compute cost.
```

### Step 7.1: Cloud Run Scheduled Scale-to-Zero

Use Cloud Scheduler to set min-instances to 0 (stop) and restore it (start):

```bash
# Grant Cloud Scheduler the ability to invoke Cloud Run admin
gcloud projects add-iam-policy-binding "$STG_PROJECT" \
  --member="serviceAccount:${PROJECT_NAME}-stg-sa@${STG_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Stop: scale all staging services to 0 (nights + weekends)
gcloud scheduler jobs create http "${PROJECT_NAME}-stg-stop" \
  --project="$STG_PROJECT" \
  --schedule="0 20 * * 1-5" \
  --time-zone="Asia/Kuala_Lumpur" \
  --uri="https://run.googleapis.com/v2/projects/${STG_PROJECT}/locations/${REGION}/services/${PROJECT_NAME}-api-stg" \
  --message-body='{"scaling":{"minInstanceCount":0}}' \
  --oauth-service-account-email="${PROJECT_NAME}-stg-sa@${STG_PROJECT}.iam.gserviceaccount.com" \
  --description="Scale staging to zero at end of business day"

# Start: restore min-instances on weekday mornings
gcloud scheduler jobs create http "${PROJECT_NAME}-stg-start" \
  --project="$STG_PROJECT" \
  --schedule="0 8 * * 1-5" \
  --time-zone="Asia/Kuala_Lumpur" \
  --uri="https://run.googleapis.com/v2/projects/${STG_PROJECT}/locations/${REGION}/services/${PROJECT_NAME}-api-stg" \
  --message-body='{"scaling":{"minInstanceCount":1}}' \
  --oauth-service-account-email="${PROJECT_NAME}-stg-sa@${STG_PROJECT}.iam.gserviceaccount.com" \
  --description="Start staging at beginning of business day"
```

Ask user for their timezone and business hours before generating scheduler jobs. Generate one stop + one start job per Cloud Run service in staging.

### Step 7.2: GCE VM Start/Stop (if using VMs)

If the project uses any Compute Engine VMs (e.g., for Cloud SQL proxy, bastion, or batch jobs):

```bash
# Stop VM schedule
gcloud compute resource-policies create instance-schedule "${PROJECT_NAME}-stg-vm-schedule" \
  --project="$STG_PROJECT" \
  --region="$REGION" \
  --vm-stop-schedule="0 20 * * 1-5" \
  --vm-start-schedule="0 8 * * 1-5" \
  --timezone="Asia/Kuala_Lumpur"

# Attach schedule to VM
gcloud compute instances add-resource-policies "${VM_NAME}" \
  --project="$STG_PROJECT" \
  --zone="${REGION}-a" \
  --resource-policies="${PROJECT_NAME}-stg-vm-schedule"
```

Generate `scripts/vm-control.sh` for manual start/stop:

```bash
#!/bin/bash
# vm-control.sh — manually start or stop environment VMs
ACTION=$1   # start | stop
ENV=$2      # stg | prod

source .gcp-projects

case $ENV in
  stg) PROJECT=$STG_PROJECT ;;
  prod) PROJECT=$PROD_PROJECT ;;
  *) echo "Usage: $0 <start|stop> <stg|prod>"; exit 1 ;;
esac

VMS=$(gcloud compute instances list \
  --project="$PROJECT" \
  --filter="labels.project=${PROJECT_NAME} AND labels.env=${ENV}" \
  --format="value(name,zone)")

if [ -z "$VMS" ]; then
  echo "No VMs found for ${PROJECT_NAME} ${ENV}"
  exit 0
fi

echo "$VMS" | while IFS=$'\t' read VM ZONE; do
  echo "${ACTION}ing ${VM} in ${ZONE}..."
  gcloud compute instances ${ACTION} "$VM" \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --quiet
done

echo "Done. Current state:"
gcloud compute instances list \
  --project="$PROJECT" \
  --filter="labels.project=${PROJECT_NAME} AND labels.env=${ENV}" \
  --format="table(name,zone,status)"
```

### Step 7.3: Cloud SQL Scheduled Start/Stop

For staging Cloud SQL (significant cost saving):

```bash
# Stop staging DB at night
gcloud scheduler jobs create http "${PROJECT_NAME}-stg-db-stop" \
  --project="$STG_PROJECT" \
  --schedule="30 20 * * 1-5" \
  --time-zone="Asia/Kuala_Lumpur" \
  --uri="https://sqladmin.googleapis.com/sql/v1beta4/projects/${STG_PROJECT}/instances/${PROJECT_NAME}-stg-db" \
  --message-body='{"settings":{"activationPolicy":"NEVER"}}' \
  --oauth-service-account-email="${PROJECT_NAME}-stg-sa@${STG_PROJECT}.iam.gserviceaccount.com" \
  --description="Stop staging Cloud SQL at night"

# Start staging DB in the morning
gcloud scheduler jobs create http "${PROJECT_NAME}-stg-db-start" \
  --project="$STG_PROJECT" \
  --schedule="30 7 * * 1-5" \
  --time-zone="Asia/Kuala_Lumpur" \
  --uri="https://sqladmin.googleapis.com/sql/v1beta4/projects/${STG_PROJECT}/instances/${PROJECT_NAME}-stg-db" \
  --message-body='{"settings":{"activationPolicy":"ALWAYS"}}' \
  --oauth-service-account-email="${PROJECT_NAME}-stg-sa@${STG_PROJECT}.iam.gserviceaccount.com" \
  --description="Start staging Cloud SQL in the morning"
```

---

## Capability 8: Deployment Scripts

### Step 8.1: Deploy Script

Generate `scripts/deploy.sh`:

```bash
#!/bin/bash
# deploy.sh — deploy services to GCP environment
set -euo pipefail

ENV=${1:?Usage: ./scripts/deploy.sh <stg|prod> [service]}
SERVICE=${2:-all}

source .gcp-projects

case $ENV in
  stg)  PROJECT=$STG_PROJECT  ;;
  prod) PROJECT=$PROD_PROJECT ;;
  *)    echo "Unknown environment: $ENV"; exit 1 ;;
esac

if [[ "$ENV" == "prod" ]]; then
  echo "WARNING: Deploying to PRODUCTION (${PROJECT})"
  read -p "Type 'yes' to confirm: " confirm
  [[ "$confirm" == "yes" ]] || { echo "Aborted."; exit 1; }
fi

echo "Deploying ${SERVICE} to ${ENV} (${PROJECT})..."
gcloud builds submit \
  --project="$PROJECT" \
  --config=cloudbuild.yaml \
  --substitutions="_ENV=${ENV},_PROJECT=${PROJECT}" \
  .
```

### Step 8.2: Rollback Script

Generate `scripts/rollback.sh`:

```bash
#!/bin/bash
# rollback.sh — roll back a Cloud Run service to a previous revision
set -euo pipefail

ENV=${1:?Usage: ./scripts/rollback.sh <stg|prod> <service>}
SERVICE=${2:?Provide service name}

source .gcp-projects
case $ENV in
  stg)  PROJECT=$STG_PROJECT  ;;
  prod) PROJECT=$PROD_PROJECT ;;
esac

SERVICE_NAME="${PROJECT_NAME}-${SERVICE}-${ENV}"

echo "Available revisions for ${SERVICE_NAME}:"
gcloud run revisions list \
  --service="$SERVICE_NAME" \
  --project="$PROJECT" \
  --region="$REGION" \
  --format="table(name,creationTimestamp,status.conditions[0].status)"

read -p "Rollback to revision (name): " TARGET
read -p "Confirm rollback to ${TARGET}? (yes/no): " confirm
[[ "$confirm" == "yes" ]] || { echo "Aborted."; exit 1; }

gcloud run services update-traffic "$SERVICE_NAME" \
  --project="$PROJECT" \
  --region="$REGION" \
  --to-revisions="${TARGET}=100"

echo "Rollback complete. Current traffic:"
gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT" \
  --region="$REGION" \
  --format="table(status.traffic)"
```

### Step 8.3: Status Check Script

Generate `scripts/check-status.sh`:

```bash
#!/bin/bash
# check-status.sh — check deployment status for all services
set -euo pipefail

ENV=${1:?Usage: ./scripts/check-status.sh <stg|prod>}
source .gcp-projects
case $ENV in
  stg)  PROJECT=$STG_PROJECT  ;;
  prod) PROJECT=$PROD_PROJECT ;;
esac

echo "=== Cloud Run Services (${ENV}) ==="
gcloud run services list \
  --project="$PROJECT" \
  --region="$REGION" \
  --filter="labels.project=${PROJECT_NAME}" \
  --format="table(name,url,status.conditions[0].lastTransitionTime,status.conditions[0].status)"

echo ""
echo "=== Scheduler Jobs (${ENV}) ==="
gcloud scheduler jobs list \
  --project="$PROJECT" \
  --filter="${PROJECT_NAME}-${ENV}" \
  --format="table(name,schedule,state,lastAttemptTime)"

echo ""
echo "=== Cloud SQL (${ENV}) ==="
gcloud sql instances list \
  --project="$PROJECT" \
  --filter="name:${PROJECT_NAME}-${ENV}" \
  --format="table(name,state,settings.tier,ipAddresses[0].ipAddress)"
```

### Step 8.4: Manual Start/Stop Script

Generate `scripts/env-control.sh` for manual cost control:

```bash
#!/bin/bash
# env-control.sh — manually start or stop an environment to save cost
set -euo pipefail

ACTION=${1:?Usage: ./scripts/env-control.sh <start|stop> <stg|prod>}
ENV=${2:?Provide environment}

source .gcp-projects
case $ENV in
  stg)  PROJECT=$STG_PROJECT  ;;
  prod)
    echo "WARNING: Stopping production is dangerous. Use with caution."
    read -p "Type 'yes' to confirm: " c
    [[ "$c" == "yes" ]] || exit 1
    PROJECT=$PROD_PROJECT
    ;;
esac

MIN=$( [ "$ACTION" == "start" ] && echo "1" || echo "0" )

echo "${ACTION}ing ${ENV} environment..."

# Scale Cloud Run services
for SERVICE in $(gcloud run services list \
  --project="$PROJECT" \
  --region="$REGION" \
  --filter="labels.project=${PROJECT_NAME}" \
  --format="value(name)"); do
  gcloud run services update "$SERVICE" \
    --project="$PROJECT" \
    --region="$REGION" \
    --min-instances="$MIN" \
    --quiet
  echo "  Cloud Run: $SERVICE → min-instances=${MIN}"
done

# Start/stop Cloud SQL
DB="${PROJECT_NAME}-${ENV}-db"
POLICY=$( [ "$ACTION" == "start" ] && echo "ALWAYS" || echo "NEVER" )
gcloud sql instances patch "$DB" \
  --project="$PROJECT" \
  --activation-policy="$POLICY" \
  --quiet
echo "  Cloud SQL: $DB → ${POLICY}"

echo "Done. ${ENV} is now ${ACTION}ed."
```

---

## Capability 9: Monitoring Setup

### Step 9.1: Create Monitoring Dashboard

Generate dashboard with request count, error rate, latency (P99), instance count per named service.

### Step 9.2: Create Alerting Policies

```yaml
# alerts.yaml
- displayName: "High Error Rate - ${PROJECT_NAME} prod"
  conditions:
    - conditionThreshold:
        filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name=starts_with("${PROJECT_NAME}-")'
        comparison: COMPARISON_GT
        thresholdValue: 0.05
        duration: 300s

- displayName: "High Latency P99 - ${PROJECT_NAME} prod"
  conditions:
    - conditionThreshold:
        comparison: COMPARISON_GT
        thresholdValue: 2000  # 2 seconds
        duration: 300s

- displayName: "Cloud SQL Down - ${PROJECT_NAME} prod"
  conditions:
    - conditionAbsent:
        filter: 'resource.type="cloudsql_database" AND resource.labels.database_id="${PROJECT}-${PROJECT_NAME}-prod-db"'
        duration: 300s
```

---

## Cost Estimation Summary

Generate a cost estimate table based on project size:

```
Environment Cost Estimates (approximate):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
develop  │ $0/month     │ Local machine (your hardware)
         │              │ aicodepath-docs/ lives here
─────────┼──────────────┼──────────────────────────────
staging  │ $0-$30/month │ Docker Compose (your machine)
         │              │ OR small VM + scheduled stop
         │              │ Cloud SQL: stopped at night
─────────┼──────────────┼──────────────────────────────
prod     │ Pay-per-use  │ Cloud Run (scale to zero ok)
         │              │ Cloud SQL: always on
         │              │ GCS: storage-only cost
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cost-saving measures applied:
  ✓ Staging scaled to 0 outside business hours (saves ~60%)
  ✓ Staging Cloud SQL stopped at night (saves ~50% of DB cost)
  ✓ Production Cloud Run: min-instances=1 (always warm)
  ✓ Named networks (avoids default network egress surprises)
  ✓ Scheduled VMs (if applicable)
```

---

## Validation

After setup, verify:
```bash
# 1. APIs enabled
gcloud services list --project=$PROJECT

# 2. Named VPC exists
gcloud compute networks list --project=$PROJECT --filter="name:${PROJECT_NAME}"

# 3. Service accounts
gcloud iam service-accounts list --project=$PROJECT --filter="email:${PROJECT_NAME}"

# 4. Artifact Registry
gcloud artifacts repositories list --project=$PROJECT --filter="name:${PROJECT_NAME}"

# 5. Cloud SQL with deletion protection
gcloud sql instances list --project=$PROJECT --filter="name:${PROJECT_NAME}"

# 6. Scheduler jobs
gcloud scheduler jobs list --project=$PROJECT --filter="${PROJECT_NAME}"

# 7. Build triggers
gcloud builds triggers list --project=$PROJECT
```

---

## NEVER

- **NEVER** use the `default` VPC network — it has permissive firewall rules and isn't named for your project. Always create a named VPC per environment.
- **NEVER** grant Cloud Build SA only `roles/editor` — it silently fails to deploy because it lacks `roles/iam.serviceAccountUser`. Grant specific roles explicitly.
- **NEVER** set `--allow-unauthenticated` on Cloud Run in staging or prod — all services must be behind an authenticated gateway.
- **NEVER** trigger builds on all services for every commit — use git diff change detection to only build affected services.
- **NEVER** store secrets in Cloud Build substitution variables — they appear in build logs. Always use Secret Manager.
- **NEVER** use the same Artifact Registry across environments — tag collisions between stg and prod images are dangerous during rollback.
- **NEVER** create Cloud SQL without `--deletion-protection` on production — a misconfigured Terraform or gcloud command can destroy the database permanently.
- **NEVER** omit the named data layer — unnamed resources (databases, buckets, disks) become impossible to identify during incidents and cost audits.
- **NEVER** schedule start/stop on production Cloud Run — production must stay available. Apply scheduled stop only to staging.
- **NEVER** use the same service account across environments — a compromised staging SA must not have access to production resources.

## When to Use Cloud Run vs Cloud Functions vs GKE

| Workload | Use | Why |
|----------|-----|-----|
| HTTP-serving microservice, variable traffic | Cloud Run | Auto-scales to zero, per-request billing |
| Event-triggered, short-lived (<9 min) | Cloud Functions | No container needed, simpler ops |
| Long-running workers, stateful, GPU, custom networking | GKE | Full control, but significantly higher ops burden |
| Monorepo services with standard HTTP APIs | Cloud Run | Default choice — matches skill's templates |

## Error Handling

| Error | Recovery |
|-------|----------|
| gcloud not installed | Provide install instructions for each OS |
| Not authenticated | Run `gcloud auth login` |
| Project access denied | Verify project ID and IAM roles |
| services.yaml missing | Run aicodepath-git-monorepo-config or auto-detect |
| API enable failed | Check billing is enabled on GCP project |
| Deploy failed | Check Cloud Build logs, verify Dockerfile exists |
| VPC connector quota exceeded | Request quota increase or use existing connector |
| Cloud SQL creation fails | Check if instance name already exists (names are globally unique for 7 days after deletion) |
| Scheduler job fails | Verify SA has required roles; check Cloud Scheduler API is enabled |
