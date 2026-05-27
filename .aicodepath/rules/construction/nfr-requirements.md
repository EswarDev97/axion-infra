# NFR Requirements (Per-Unit)

**Purpose**: Determine non-functional requirements and select technology stack for each unit

**Execute IF**:
- Performance requirements exist
- Security considerations needed
- Scalability concerns present
- Tech stack selection required

**Skip IF**:
- No NFR requirements
- Tech stack already determined

## Prerequisites
- Functional Design complete (or skipped)
- Requirements artifacts available

## Step 1: Load Context

### 1.1 Load Prior Artifacts
- Load requirements.md for NFR requirements
- Load functional design artifacts (if available)
- Load technology-stack.md (if brownfield)

### 1.2 Identify Current Unit NFRs
- Extract NFRs relevant to this unit
- Identify inherited NFRs from system-level requirements

## Step 2: Assess NFR Categories

Create `aicodepath-docs/construction/{unit-name}/nfr-requirements/nfr-requirements.md`:

```markdown
# NFR Requirements: [Unit Name]

## Performance Requirements

### Response Time
- **Target**: [e.g., < 200ms for 95th percentile]
- **Measurement**: [How measured]
- **Criticality**: [High/Medium/Low]

### Throughput
- **Target**: [e.g., 1000 requests/second]
- **Peak Load**: [Expected peak]
- **Criticality**: [High/Medium/Low]

### Resource Utilization
- **CPU Target**: [e.g., < 70% average]
- **Memory Target**: [e.g., < 80% of allocated]
- **Criticality**: [High/Medium/Low]

## Scalability Requirements

### Horizontal Scaling
- **Required**: [Yes/No]
- **Target Scale**: [e.g., 10 instances]
- **Auto-scaling Triggers**: [Conditions]

### Data Volume
- **Current**: [Estimated data size]
- **Growth Rate**: [Expected growth]
- **Retention**: [Data retention period]

## Security Requirements

### Authentication
- **Method**: [JWT/OAuth/API Key/etc.]
- **Provider**: [Internal/External]

### Authorization
- **Model**: [RBAC/ABAC/etc.]
- **Granularity**: [Resource/Action level]

### Data Protection
- **Encryption at Rest**: [Required/Not Required]
- **Encryption in Transit**: [Required/Not Required]
- **PII Handling**: [Requirements]

## Reliability Requirements

### Availability
- **Target SLA**: [e.g., 99.9%]
- **Maintenance Windows**: [Allowed/Not Allowed]

### Fault Tolerance
- **Failure Modes**: [Identified scenarios]
- **Recovery Strategy**: [Approach]

### Backup & Recovery
- **RPO**: [Recovery Point Objective]
- **RTO**: [Recovery Time Objective]

## Observability Requirements

### Logging
- **Level**: [Debug/Info/Warning/Error]
- **Retention**: [Duration]
- **Format**: [Structured/Unstructured]

### Monitoring
- **Metrics**: [Key metrics to track]
- **Alerting**: [Conditions for alerts]

### Tracing
- **Required**: [Yes/No]
- **Tool**: [If specified]

## Compliance Requirements
- **Regulations**: [GDPR/HIPAA/SOC2/etc.]
- **Audit Requirements**: [What needs auditing]
```

## Step 3: Technology Stack Decisions

Create `aicodepath-docs/construction/{unit-name}/nfr-requirements/tech-stack-decisions.md`:

```markdown
# Technology Stack Decisions: [Unit Name]

## Decision Summary

| Category | Technology | Version | Rationale |
|----------|------------|---------|-----------|
| Language | [e.g., TypeScript] | [5.0] | [Why] |
| Framework | [e.g., NestJS] | [10.0] | [Why] |
| Database | [e.g., PostgreSQL] | [15] | [Why] |
| Cache | [e.g., Redis] | [7.0] | [Why] |
| Message Queue | [e.g., SQS] | [N/A] | [Why] |

## Detailed Decisions

### Runtime Environment
- **Technology**: [Node.js/Python/Java/etc.]
- **Version**: [Version]
- **Rationale**: [Why selected]
- **Alternatives Considered**: [What else was considered]

### Framework
- **Technology**: [Framework name]
- **Version**: [Version]
- **Rationale**: [Why selected]
- **NFRs Addressed**: [Which NFRs this helps with]

### Database
- **Technology**: [Database name]
- **Type**: [Relational/NoSQL/Graph]
- **Rationale**: [Why selected]
- **NFRs Addressed**: [Which NFRs this helps with]

### Caching
- **Technology**: [Cache technology]
- **Use Cases**: [What will be cached]
- **Strategy**: [Cache-aside/Write-through/etc.]

### AI/ML (if applicable)
- **Model Provider**: [OpenAI/Anthropic/Local/etc.]
- **Model Selection**: [Specific model]
- **Rationale**: [Why selected]
- **Cost Implications**: [Cost considerations]

## Constraints
- **Organizational**: [Required technologies]
- **Integration**: [Must integrate with X]
- **Cost**: [Budget limitations]

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [Impact] | [How mitigated] |
```

## Step 4: Update Progress

- Update aicodepath-state.md
- Log decisions in audit.md

## Step 5: Present Completion Message

```markdown
# NFR Requirements Complete: [Unit Name]

NFR assessment has identified:
- **Performance**: [Key performance requirements]
- **Security**: [Key security requirements]
- **Scalability**: [Key scalability requirements]

Technology Stack Selected:
- [Technology 1]: [Reason]
- [Technology 2]: [Reason]

> **REVIEW REQUIRED:**
> Please examine the NFR requirements at: `aicodepath-docs/construction/{unit-name}/nfr-requirements/`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to NFR requirements or tech stack
> **Continue to Next Stage** - Proceed to **NFR Design**
```

## Step 6: Wait for Explicit Approval
- User must choose between "Request Changes" or "Continue to Next Stage"
- Log user's response in audit.md
