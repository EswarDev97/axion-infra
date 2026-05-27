# OPERATIONS PHASE

**Purpose**: Deployment, monitoring, and sprint tracking workflows

**Focus**: How to DEPLOY and RUN it

**Stages in OPERATIONS PHASE**:
- Deployment (CONDITIONAL, per deployment)
- Sprint Tracking (CONDITIONAL)

---

## Deployment (CONDITIONAL, per deployment)

**Execute IF**:
- Kubernetes deployment required
- Release ready for promotion
- Blue-green or canary deployment needed
- Rollback required

**Skip IF**:
- Local development only
- No Kubernetes infrastructure
- CI/CD handles deployments automatically

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update operations "Deployment" in_progress
   ```
2. **MANDATORY**: Log any user input during this phase in audit.md
3. Load all steps from `operations/deployment.md`
3. Execute deployment operations:
   - Choose deployment strategy (blue-green, canary, rolling)
   - Configure Argo Rollouts and analysis templates
   - Create deployment runbook
   - Define rollback procedures
   - Run post-deployment validation
4. **Wait for Explicit Approval**: Present deployment plan
5. **MANDATORY**: Log user's response in audit.md with complete raw input
6. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update operations "Deployment" completed

   # Create deployment artifacts
   node .aicodepath/lib/artifact-writer.js create deployment "Deployment Runbook" operations \
     --file=aicodepath-docs/operations/deployment/deployment-runbook.md
   ```

## Sprint Tracking (CONDITIONAL)

**Execute IF**:
- Sprint planning was executed
- Velocity tracking needed
- Burndown charts required
- Sprint retrospective needed

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update operations "Sprint Tracking" in_progress
   ```
2. **MANDATORY**: Log any user input during this phase in audit.md
3. Load all steps from `operations/sprint-tracking.md`
3. Execute sprint tracking:
   - Update story completion status
   - Calculate velocity metrics
   - Generate burndown chart data
   - Prepare retrospective summary
4. **Wait for Explicit Approval**: Present sprint summary
5. **MANDATORY**: Log user's response in audit.md with complete raw input
6. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update operations "Sprint Tracking" completed

   # Create sprint tracking artifacts
   node .aicodepath/lib/artifact-writer.js create report "Sprint Summary" operations \
     --file=aicodepath-docs/operations/sprint-tracking/sprint-summary.md
   ```
