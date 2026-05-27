# Requirements Analysis (Adaptive)

**Assume the role** of a product owner

**Adaptive Phase**: Always executes. Detail level adapts to problem complexity.

**See [depth-levels.md](../common/depth-levels.md) for adaptive depth explanation**

## Prerequisites
- Workspace Detection must be complete
- Reverse Engineering must be complete (if brownfield)

## Execution Steps

### Step 1: Load Reverse Engineering Context (if available)

**IF brownfield project**:
- Load `aicodepath-docs/inception/reverse-engineering/architecture.md`
- Load `aicodepath-docs/inception/reverse-engineering/component-inventory.md`
- Load `aicodepath-docs/inception/reverse-engineering/technology-stack.md`
- Use these to understand existing system when analyzing request

### Step 2: Analyze User Request (Intent Analysis)

#### 2.1 Request Clarity
- **Clear**: Specific, well-defined, actionable
- **Vague**: General, ambiguous, needs clarification
- **Incomplete**: Missing key information

#### 2.2 Request Type
- **New Feature**: Adding new functionality
- **Bug Fix**: Fixing existing issue
- **Refactoring**: Improving code structure
- **AI Implementation**: Adding AI/ML components
- **Database Changes**: Schema or data layer changes
- **Migration**: Moving to different technology
- **New Project**: Starting from scratch

#### 2.3 Initial Scope Estimate
- **Single File**: Changes to one file
- **Single Component**: Changes to one component/package
- **Multiple Components**: Changes across multiple components
- **System-wide**: Changes affecting entire system

#### 2.4 Initial Complexity Estimate
- **Trivial**: Simple, straightforward change
- **Simple**: Clear implementation path
- **Moderate**: Some complexity, multiple considerations
- **Complex**: Significant complexity, many considerations

### Step 3: Determine Requirements Depth

**Based on request analysis, determine depth:**

**Minimal Depth** - Use when:
- Request is clear and simple
- No detailed requirements needed

**Standard Depth** - Use when:
- Request needs clarification
- Functional and non-functional requirements needed

**Comprehensive Depth** - Use when:
- Complex project with multiple stakeholders
- High risk or critical system
- AI or database components involved with cost implications

### Step 4: Assess Current Requirements

Analyze whatever the user has provided:
- Intent statements or descriptions (already logged in audit.md)
- Existing requirements documents (search workspace if mentioned)
- Pasted content or file references
- Convert any non-markdown documents to markdown format

### Step 5: Thorough Completeness Analysis

**CRITICAL**: Use comprehensive analysis to evaluate requirements completeness.

**MANDATORY**: Evaluate ALL of these areas and ask questions for ANY that are unclear:
- **Functional Requirements**: Core features, user interactions, system behaviors
- **Non-Functional Requirements**: Performance, security, scalability, usability
- **Database Requirements**: Data models, storage, migrations, audit needs
- **AI Requirements**: Model selection, prompts, RAG, agents, cost constraints
- **Sprint/Agile Requirements**: Iteration preferences, team size, velocity
- **User Scenarios**: Use cases, user journeys, edge cases, error scenarios
- **Business Context**: Goals, constraints, success criteria, budget limits
- **Technical Context**: Integration points, data requirements, system boundaries

### Step 6: Generate Clarifying Questions (PROACTIVE APPROACH)

- **ALWAYS** create `aicodepath-docs/inception/requirements/requirement-verification-questions.md` unless requirements are exceptionally clear
- Ask questions about ANY missing, unclear, or ambiguous areas
- Include database-specific questions if data layer is involved
- Include AI-specific questions if ML components are involved
- Include budget/cost questions for AI and infrastructure
- **Include infrastructure and tech stack preferences** (see Step 6.1)
- Request user to fill in all [Answer]: tags directly in the questions document
- Wait for user answers in the document
- **MANDATORY**: Analyze ALL answers for ambiguities and create follow-up questions if needed

### Step 6.1: Cloud & Infrastructure Preferences

**MANDATORY for new projects**: Include these preference questions in requirement-verification-questions.md:

```markdown
## Cloud & Infrastructure Preferences

### Cloud Provider Strategy

**What is your cloud deployment strategy?**

A) **Cloud Agnostic** - Use portable technologies that work across any cloud
   - Technologies: Kubernetes, Terraform, PostgreSQL, Redis, RabbitMQ
   - Avoid vendor-specific services (no AWS-only, Azure-only, or GCP-only)
   - Benefits: No vendor lock-in, flexibility to migrate

B) **AWS** - Leverage AWS-native services
   - Technologies: DynamoDB, SQS, S3, Lambda, Aurora, ElastiCache
   - Benefits: Deep integration, managed services, cost optimization with reserved capacity

C) **Azure** - Leverage Azure-native services
   - Technologies: Cosmos DB, Service Bus, Blob Storage, Azure Functions
   - Benefits: Microsoft ecosystem integration, enterprise SSO

D) **GCP** - Leverage Google Cloud services
   - Technologies: Firestore, Pub/Sub, Cloud Storage, Cloud Run
   - Benefits: Strong ML/AI services, BigQuery analytics

E) **On-Premises** - Deploy to own infrastructure
   - Technologies: Self-hosted Kubernetes, PostgreSQL, Kafka
   - Benefits: Full data control, compliance requirements

F) **Hybrid/Multi-Cloud** - Mix of cloud and on-prem
   - Critical data on-prem, scalable compute in cloud
   - Disaster recovery across providers

[Answer]:

---

### Technology Stack Preferences

**For each category, do you prefer open-source or managed services?**

| Category | Open Source Option | Managed/Paid Option | Your Preference |
|----------|-------------------|---------------------|-----------------|
| **Database** | PostgreSQL, MySQL, MariaDB | AWS RDS, Aurora, Azure SQL | [Answer]: |
| **NoSQL** | MongoDB, CouchDB | DynamoDB, Cosmos DB, MongoDB Atlas | [Answer]: |
| **Cache** | Redis (OSS), Memcached | ElastiCache, Azure Cache, Redis Enterprise | [Answer]: |
| **Message Queue** | RabbitMQ, Kafka | AWS SQS, Azure Service Bus, Confluent | [Answer]: |
| **Search** | Elasticsearch, OpenSearch | Elastic Cloud, AWS OpenSearch Service | [Answer]: |
| **Vector DB** | pgvector, Milvus, Qdrant | Pinecone, Weaviate Cloud | [Answer]: |
| **Object Storage** | MinIO, Ceph | S3, Azure Blob, GCS | [Answer]: |
| **Container Orchestration** | Kubernetes, Docker Swarm | EKS, AKS, GKE, Fargate | [Answer]: |
| **Monitoring** | Prometheus, Grafana | Datadog, New Relic, CloudWatch | [Answer]: |
| **Secrets** | HashiCorp Vault | AWS Secrets Manager, Azure Key Vault | [Answer]: |

**Overall preference:**

A) **Prefer Open Source** - Cost savings, no vendor lock-in, community support
B) **Prefer Managed Services** - Reduced ops overhead, SLA guarantees, less maintenance
C) **Mix** - Critical systems open source, convenience services managed
D) **Case by case** - Let me specify per technology category above

[Answer]:

---

### Cost Considerations

**What is your approach to infrastructure costs?**

A) **Minimize cost** - Prioritize open source, self-hosted, reserved capacity
   - Accept more operational overhead
   - Optimize for lowest monthly spend

B) **Optimize TCO** - Balance cost with operational overhead
   - Use managed services where they save engineering time
   - Consider both direct costs and opportunity costs

C) **Prioritize reliability** - Managed services, high availability, multi-region
   - Accept higher costs for better SLAs
   - Focus on uptime and performance

D) **Scale-based** - Start cheap, migrate to managed as you grow
   - Begin with open source for cost efficiency
   - Plan migration path to managed services

[Answer]:

---

### Compliance Requirements

**Do you have specific compliance requirements?** (Select all that apply)

- [ ] HIPAA (Healthcare data)
- [ ] PCI-DSS (Payment card data)
- [ ] SOC 2 (Security compliance)
- [ ] GDPR (European data privacy)
- [ ] FedRAMP (US Government)
- [ ] ISO 27001 (Information security)
- [ ] None / Not sure

[Answer]:

---

### Data Residency

**Are there data residency requirements?**

A) **No restrictions** - Data can be stored anywhere
B) **Regional preference** - Prefer specific region but not required
C) **Regional requirement** - Data MUST stay in specific region(s)
D) **Country-specific** - Data MUST stay in specific country

[Answer]:
If B, C, or D: Which regions/countries? [Answer]:
```

Store preferences in: `aicodepath-docs/inception/requirements/infrastructure-preferences.md`

**Use preferences to**:
1. Filter technology recommendations in design stages
2. Pre-select appropriate services in database-design, message-queue-design, etc.
3. Generate cost estimates based on selected providers
4. Flag incompatible choices (e.g., "You selected cloud-agnostic but specified DynamoDB")

---

### Reference Data & Configuration Refresh Strategy

**If your application uses downloaded configuration files or reference data (lookup tables, dropdowns, enum values, etc.), how should they be refreshed?**

## Question X
How should reference/config data be refreshed when source data changes?

A) **Load at Application Start** - Data loaded once when app starts
   - Suitable for: Rarely changing data, small datasets
   - Pros: Simple, no runtime overhead
   - Cons: Requires restart to update, stale data between restarts

B) **Periodic Refresh** - Background job checks for updates at intervals
   - Suitable for: Moderately changing data
   - Interval: Every [X] minutes/hours
   - Pros: Automatic updates without restart
   - Cons: Data may be stale within refresh interval

C) **Event-Driven Refresh** - Triggered when underlying data changes
   - Suitable for: Frequently changing data, real-time requirements
   - Trigger mechanism: Webhook, message queue, database trigger
   - Pros: Always current data
   - Cons: More complex implementation

D) **Frontend-Triggered Refresh** - Clear cache when admin saves changes
   - Suitable for: Admin-managed lookup tables
   - Flow: Admin saves → API invalidates cache → Next request gets fresh data
   - Pros: Immediate consistency for admin actions
   - Cons: External changes may not trigger refresh

E) **Hybrid** - Combination of above strategies
   - Critical data: Event-driven
   - Non-critical data: Periodic refresh
   - User preferences: Frontend-triggered

F) **Not Applicable** - Application doesn't use downloaded config/reference data

[Answer]:

---

### Data Download/Sync Mechanism

**If reference data is downloaded from external sources (skip if F selected above):**

1. **Source Location**: [Where is the data fetched from?]
2. **Format**: [JSON/CSV/API endpoint/Database sync]
3. **Update Frequency**: [How often does source data change?]
4. **File Storage**: [Where are downloaded files stored?]
5. **Validation**: [How to verify downloaded data integrity?]

[Answer]:

### Step 6.2: UX Feature Requirements

**CONDITIONAL for web/mobile projects**: Include these questions in requirement-verification-questions.md when project type involves user-facing web or mobile application.

```markdown
## User Experience Enhancement Features

For web and mobile applications, consider these common UX enhancement features.

### Onboarding Experience

**Does your application need user onboarding?**

A) **Full Onboarding Flow** - Multi-step guided introduction for new users (Recommended for complex apps)
   - Welcome screens, feature highlights, account setup wizard
   - Best for: Apps with learning curve, B2B SaaS, feature-rich applications

B) **Simple Welcome** - Single welcome screen or brief introduction
   - Quick value proposition, single CTA
   - Best for: Simple apps, returning user focus

C) **No Onboarding** - Users go directly to main experience
   - Best for: Utility apps, simple tools

D) **Conditional Onboarding** - Show only to first-time users or after major updates

E) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Product Tour / Feature Discovery

**Does your application need guided product tours?**

A) **Interactive Product Tour** - Step-by-step guided walkthrough with highlights (Recommended for feature-rich apps)
   - Spotlight elements, sequential steps, progress indicator
   - Best for: Complex dashboards, B2B tools, admin panels

B) **Contextual Tooltips Only** - Show hints on first encounter with features
   - Non-intrusive, appears once per feature
   - Best for: Moderate complexity apps

C) **Help Center / Documentation** - Users access help on demand
   - No proactive guidance, self-service model
   - Best for: Technical users, developer tools

D) **No Guided Tour** - Users explore independently

E) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Coach Marks / Feature Hints

**How should the app educate users about features?**

A) **Pulsing Coach Marks** - Animated indicators on new/important features
   - Draws attention, dismissable, appears on key elements
   - Best for: Highlighting new features, important actions

B) **Static Tooltips** - Informational popups on hover/tap
   - Explains functionality, contextual help
   - Best for: Form fields, icons, complex controls

C) **Inline Help Text** - Permanent helper text near elements
   - Always visible, no interaction needed
   - Best for: Forms, settings, data entry

D) **Smart Suggestions** - AI-powered contextual tips based on user behavior
   - Personalized guidance, usage-based triggers
   - Best for: Advanced apps with user analytics

E) **No Feature Hints** - UI should be self-explanatory

F) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Notification & Feedback System

**What notification patterns are needed?**

A) **Toast Notifications** - Brief auto-dismissing messages (Recommended)
   - Success, error, warning, info variants
   - Non-blocking, appears at screen edge

B) **Modal Alerts** - Blocking dialogs for critical information
   - Requires user acknowledgment
   - Use sparingly for important messages

C) **Inline Feedback** - Messages embedded in context
   - Near the relevant element/action
   - Form validation, action confirmations

D) **Notification Center** - Centralized notification history
   - Persistent log of notifications
   - For apps with many background events

E) **All of the Above** - Comprehensive notification system

F) Other (please describe after [Answer]: tag below)

[Answer]:

---

### Progress & Status Indicators

**How should the app communicate progress and status?**

A) **Progress Bars** - Visual progress for operations
   - Determinate (known progress) or indeterminate (unknown duration)

B) **Skeleton Screens** - Placeholder layouts during loading
   - Reduces perceived load time, maintains layout structure

C) **Spinners/Loaders** - Simple loading indicators
   - For brief operations, minimal UI

D) **Status Badges** - Visual indicators for item states
   - Active, pending, completed, error states

E) **Combination** - Multiple patterns based on context (Recommended)

F) Other (please describe after [Answer]: tag below)

[Answer]:
```

Store UX preferences in: `aicodepath-docs/inception/requirements/ux-feature-requirements.md`

**Use UX preferences to**:
1. Inform Web/Mobile UX Design phase which features to include
2. Guide component library selection (onboarding libraries, tour tools)
3. Estimate development effort for UX features
4. Include relevant acceptance criteria in user stories
5. Skip irrelevant UX design sections in construction phase

### Step 7: Generate Requirements Document

Create `aicodepath-docs/inception/requirements/requirements.md`:
- Include intent analysis summary at the top
- Include both functional and non-functional requirements
- Include database requirements section (if applicable)
- Include AI requirements section (if applicable)
- Include sprint/agile preferences (if applicable)
- Incorporate user's answers to clarifying questions
- Provide brief summary of key requirements

### Step 8: Update State Tracking

Update `aicodepath-docs/aicodepath-state.md`:

```markdown
## Stage Progress
### INCEPTION PHASE
- [x] Workspace Detection
- [x] Reverse Engineering (if applicable)
- [x] Requirements Analysis
```

### Step 9: Log and Proceed

Present completion message:

```markdown
# Requirements Analysis Complete

Requirements analysis has identified [project type/complexity]:
- [Key functional requirements bullet points]
- [Key non-functional requirements bullet points]
- [Database requirements if applicable]
- [AI requirements if applicable]

> **REVIEW REQUIRED:**
> Please examine the requirements document at: `aicodepath-docs/inception/requirements/requirements.md`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to the requirements if required
> **Add User Stories** - Choose to include **User Stories** stage (if skipped)
> **Approve & Continue** - Approve requirements and proceed to **[User Stories/Sprint Planning/Workflow Planning]**
```

Wait for explicit user approval before proceeding.
