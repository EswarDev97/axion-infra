# Integration Points — RE Template

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

Output file: `aicodepath-docs/inception/reverse-engineering/07-integration-points.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__search_entities` is available, call:

```
mcp__aicodepath-code-graph__search_entities(query="http fetch axios client request webhook", limit=20)
mcp__aicodepath-code-graph__search_entities(query="queue publish consume producer consumer subscribe", limit=20)
mcp__aicodepath-code-graph__search_entities(query="grpc stub client channel connect", limit=20)
mcp__aicodepath-code-graph__search_entities(query="email smtp sendgrid twilio notification push", limit=20)
```

Use results to discover all outbound integration points.

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Outbound HTTP / REST Integrations [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities` results for HTTP client patterns, identify all third-party API calls. Extract the base URL, client class, and calling module.

**LLM-only path**: Search for HTTP client instantiations (`axios.create`, `httpx.Client`, `requests.get`, `fetch(`, `http.NewRequest`, `RestTemplate`, `WebClient`). Also check environment variables and config for `_URL`, `_BASE_URL`, `_API_URL`, `_ENDPOINT` suffixes that suggest external services.

For each external HTTP integration:
| Service Name | Base URL / Config Key | Auth Method | Client Library | Calling Modules | Retry/Timeout Config |
|-------------|----------------------|-------------|---------------|----------------|---------------------|

---

#### Section 2: Message Queue Integrations [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities` queue pattern results, identify message producers and consumers.

**LLM-only path**: Scan for queue library imports and patterns: `pika` (RabbitMQ), `confluent_kafka`/`kafka-python`, `boto3.sqs`, `@google-cloud/pubsub`, `nats`, `bull`/`bullmq`, `celery`. Check config for queue URLs, topic names, and consumer group IDs.

For each message queue integration:
```
**Queue: <queue/topic name>**
- Broker technology: <RabbitMQ/Kafka/SQS/etc.>
- Direction: Producer | Consumer | Both
- Message schema: <describe payload shape if findable>
- Publishing modules: <which code publishes>
- Consuming modules: <which code consumes>
- Dead letter queue: <configured? yes/no/unknown>
- Retry policy: <describe if configured>
```

---

#### Section 3: gRPC and Internal Service Calls [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities` gRPC results, identify stub usages and service channel configurations.

**LLM-only path**: Look for `.proto` files and generated stub files. Check for service mesh config (Istio, Linkerd), service discovery (Consul, Eureka, etcd), or hardcoded internal service URLs.

For each internal service integration:
| Service Name | Protocol | Endpoint Config | Called Methods | Timeout Config | Circuit Breaker |
|-------------|---------|----------------|---------------|---------------|----------------|

---

#### Section 4: Third-Party SaaS and Platform Services [DATA SOURCE: llm-only]

Identify integrations with common SaaS platforms by scanning imports and environment variable names:

- **Email**: SendGrid, Mailgun, SES, SMTP
- **SMS/Push**: Twilio, Firebase FCM, APNs, OneSignal
- **Payments**: Stripe, PayPal, Braintree, Square
- **Auth providers**: Auth0, Okta, Cognito, Firebase Auth
- **Storage**: S3, GCS, Azure Blob, Cloudinary
- **Analytics**: Segment, Mixpanel, Amplitude, Google Analytics
- **Error tracking**: Sentry, Bugsnag, Rollbar, Datadog APM
- **Feature flags**: LaunchDarkly, Split.io, Unleash
- **Maps/Geo**: Google Maps, Mapbox, HERE

For each SaaS found:
| Service | Purpose | SDK/Package | API Key Config Location | Data Sent |
|---------|---------|------------|------------------------|-----------|

---

#### Section 5: Webhook Endpoints (Inbound Integrations) [DATA SOURCE: llm-only]

Identify webhook receivers — inbound HTTP endpoints that receive events from external systems:
- Stripe webhooks (`/webhooks/stripe`, signature verification)
- GitHub webhooks
- Twilio callbacks
- Payment gateway callbacks

For each webhook:
```
**Webhook: [Method] /path**
- Sender: <external system>
- Payload verification: <HMAC/signature check present? yes/no>
- Events handled: <list event types>
- Idempotency handling: <duplicate event protection? yes/no>
```

---

#### Section 6: Integration Risk Assessment

Evaluate integration health:
- **Missing timeouts**: HTTP clients with no timeout configuration (risk of hanging requests)
- **Missing circuit breakers**: High-frequency integrations with no fallback on failure
- **Missing retry logic**: Integrations with transient failure risk and no retry policy
- **Hardcoded URLs**: Integration endpoints not configurable via environment
- **Missing webhook verification**: Inbound webhooks without signature validation (security risk)
- **Undocumented integrations**: Services found in code but not in any README or architecture doc

Produce a risk table and recommend which integrations need reliability hardening before new feature development.

Set `data_source` in frontmatter to `graph` if MCP entity search was used, otherwise `llm-only`.
