# Message Queue Design

**Purpose**: Design event-driven architectures using message queues, event streaming, and async communication patterns

**When to Use**: Decoupled services, async processing, event sourcing, CQRS, or high-throughput data pipelines

---

## Overview

Message queue design defines how the application handles asynchronous communication between services. This stage creates event-driven architectures that enable loose coupling, scalability, and resilience.

---

## Technology Selection

### Message Broker Comparison

| Technology | Best For | Throughput | Ordering | Replay |
|------------|----------|------------|----------|--------|
| Apache Kafka | Event streaming, high volume | 1M+ msg/s | Per partition | Yes |
| RabbitMQ | Complex routing, transactions | 50K msg/s | Per queue | Limited |
| AWS SQS | Serverless, simple queues | 3K msg/s (FIFO) | FIFO optional | No |
| AWS SNS | Fan-out, notifications | High | None | No |
| Redis Streams | Real-time, ephemeral | Very high | Per stream | Yes |
| NATS | Cloud-native, lightweight | Very high | Per subject | Yes |
| Azure Service Bus | Enterprise, transactions | 10K msg/s | FIFO | Limited |
| Google Pub/Sub | GCP native, global | High | Per subscription | Yes |

### Selection Decision Tree

```markdown
## Message Queue Selection

**Use Case**: [Event streaming / Task queue / Pub/Sub / RPC]
**Volume**: [Messages per second]
**Ordering Required**: [Yes / No / Per-key]
**Replay Required**: [Yes / No]
**Cloud Preference**: [AWS / Azure / GCP / Agnostic]

**Decision Path**:
1. If event streaming + replay → Kafka or Pulsar
2. If complex routing + transactions → RabbitMQ
3. If serverless + AWS → SQS/SNS
4. If simple pub/sub + high throughput → Redis Streams or NATS
5. If enterprise + Azure → Service Bus
```

---

## Event-Driven Patterns

### Pattern Overview

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Event Sourcing | Store events as source of truth | Audit trails, undo/redo |
| CQRS | Separate read/write models | Complex queries, different scaling |
| Saga | Distributed transactions | Multi-service workflows |
| Outbox | Reliable event publishing | Transactional messaging |
| Dead Letter Queue | Handle failures | Error processing |

### Event Sourcing

```typescript
// Event store interface
interface EventStore {
  append(streamId: string, events: DomainEvent[], expectedVersion: number): Promise<void>;
  read(streamId: string, fromVersion?: number): Promise<DomainEvent[]>;
  subscribe(handler: (event: DomainEvent) => void): void;
}

// Domain event
interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

// Example events
const orderCreated: DomainEvent = {
  eventId: uuid(),
  eventType: 'OrderCreated',
  aggregateId: 'order-123',
  aggregateType: 'Order',
  version: 1,
  timestamp: new Date(),
  data: {
    customerId: 'cust-456',
    items: [{ productId: 'prod-1', quantity: 2 }],
    total: 99.99
  },
  metadata: {
    correlationId: 'req-789',
    userId: 'user-012'
  }
};
```

### CQRS Architecture

```
                    ┌─────────────────┐
                    │   API Gateway   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │  Command Side   │           │   Query Side    │
    │  (Write Model)  │           │  (Read Model)   │
    └────────┬────────┘           └────────┬────────┘
             │                             │
             ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │  Event Store    │──Events──▶│  Read Database  │
    │  (PostgreSQL)   │           │  (Elasticsearch)│
    └─────────────────┘           └─────────────────┘
```

### Saga Pattern

```typescript
// Saga orchestrator
interface SagaStep {
  name: string;
  execute(context: SagaContext): Promise<void>;
  compensate(context: SagaContext): Promise<void>;
}

interface Saga {
  steps: SagaStep[];
  execute(context: SagaContext): Promise<void>;
}

// Example: Order saga
const orderSaga: Saga = {
  steps: [
    {
      name: 'reserveInventory',
      execute: async (ctx) => {
        await inventoryService.reserve(ctx.orderId, ctx.items);
      },
      compensate: async (ctx) => {
        await inventoryService.release(ctx.orderId);
      }
    },
    {
      name: 'processPayment',
      execute: async (ctx) => {
        await paymentService.charge(ctx.orderId, ctx.amount);
      },
      compensate: async (ctx) => {
        await paymentService.refund(ctx.orderId);
      }
    },
    {
      name: 'createShipment',
      execute: async (ctx) => {
        await shippingService.create(ctx.orderId);
      },
      compensate: async (ctx) => {
        await shippingService.cancel(ctx.orderId);
      }
    }
  ]
};
```

### Outbox Pattern

```typescript
// Transactional outbox
interface OutboxEntry {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, any>;
  createdAt: Date;
  publishedAt?: Date;
}

// Within transaction
async function createOrder(order: Order): Promise<void> {
  await db.transaction(async (tx) => {
    // Save aggregate
    await tx.insert('orders', order);

    // Save to outbox (same transaction)
    await tx.insert('outbox', {
      id: uuid(),
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: 'OrderCreated',
      payload: order,
      createdAt: new Date()
    });
  });
}

// Outbox processor (separate process)
async function processOutbox(): Promise<void> {
  const entries = await db.query(
    'SELECT * FROM outbox WHERE published_at IS NULL ORDER BY created_at LIMIT 100'
  );

  for (const entry of entries) {
    await messageQueue.publish(entry.eventType, entry.payload);
    await db.update('outbox', { id: entry.id }, { publishedAt: new Date() });
  }
}
```

---

## Message Design

### Message Envelope

```typescript
interface MessageEnvelope<T> {
  // Identity
  messageId: string;
  correlationId: string;
  causationId?: string;

  // Routing
  type: string;
  source: string;
  destination?: string;

  // Metadata
  timestamp: Date;
  version: string;
  contentType: string;

  // Payload
  data: T;

  // Tracing
  traceId?: string;
  spanId?: string;
}

// Example message
const orderMessage: MessageEnvelope<OrderCreated> = {
  messageId: '550e8400-e29b-41d4-a716-446655440000',
  correlationId: 'req-12345',
  causationId: 'msg-67890',
  type: 'order.created',
  source: 'order-service',
  timestamp: new Date(),
  version: '1.0.0',
  contentType: 'application/json',
  data: {
    orderId: 'order-123',
    customerId: 'cust-456',
    total: 99.99
  },
  traceId: 'abc123',
  spanId: 'def456'
};
```

### Schema Versioning

```typescript
// Version in event type
type EventType =
  | 'order.created.v1'
  | 'order.created.v2';

// Version in envelope
interface VersionedMessage {
  schemaVersion: string;
  data: Record<string, any>;
}

// Schema registry
interface SchemaRegistry {
  register(type: string, version: string, schema: JSONSchema): void;
  validate(message: VersionedMessage): boolean;
  evolve(message: VersionedMessage, targetVersion: string): VersionedMessage;
}
```

### Idempotency

```typescript
// Idempotency key in message
interface IdempotentMessage {
  idempotencyKey: string;
  // ... other fields
}

// Consumer with idempotency check
async function handleMessage(message: IdempotentMessage): Promise<void> {
  const processed = await redis.get(`processed:${message.idempotencyKey}`);

  if (processed) {
    logger.info('Message already processed, skipping');
    return;
  }

  await processMessage(message);

  // Mark as processed with TTL
  await redis.setex(`processed:${message.idempotencyKey}`, 86400, 'true');
}
```

---

## Reliability Patterns

### Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

const retryConfig: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  retryableErrors: ['TIMEOUT', 'SERVICE_UNAVAILABLE', 'RATE_LIMITED']
};

// Exponential backoff with jitter
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = Math.random() * 0.3 * cappedDelay;
  return cappedDelay + jitter;
}
```

### Dead Letter Queue

```typescript
interface DLQConfig {
  queueName: string;
  maxRetries: number;
  retentionDays: number;
  alertThreshold: number;
}

// DLQ handler
async function handleDLQMessage(message: FailedMessage): Promise<void> {
  // Log failure details
  logger.error('Message moved to DLQ', {
    messageId: message.messageId,
    originalQueue: message.originalQueue,
    failureReason: message.failureReason,
    retryCount: message.retryCount
  });

  // Store for analysis
  await dlqStore.save(message);

  // Alert if threshold exceeded
  const dlqSize = await getDLQSize();
  if (dlqSize > config.alertThreshold) {
    await alertService.notify('DLQ threshold exceeded', { size: dlqSize });
  }
}
```

### Circuit Breaker

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenRequests: number;
}

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldTryHalfOpen()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new CircuitOpenError();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

---

## Kafka-Specific Design

### Topic Design

```markdown
## Topic Naming Convention

Pattern: `[domain].[entity].[event]`

Examples:
- orders.order.created
- orders.order.shipped
- inventory.stock.updated
- payments.payment.processed

**Topic Configuration**:
- Partitions: 12 (based on consumer parallelism)
- Replication: 3 (for HA)
- Retention: 7 days
- Cleanup policy: delete
```

### Partition Strategy

```typescript
// Custom partitioner
function partitionByKey(key: string, partitionCount: number): number {
  const hash = murmurhash3(key);
  return Math.abs(hash) % partitionCount;
}

// Partition by tenant for multi-tenant
function partitionByTenant(message: Message): number {
  return partitionByKey(message.tenantId, PARTITION_COUNT);
}

// Partition by order ID for order events
function partitionByOrder(message: OrderEvent): number {
  return partitionByKey(message.orderId, PARTITION_COUNT);
}
```

### Consumer Groups

```typescript
interface ConsumerConfig {
  groupId: string;
  topics: string[];
  autoCommit: boolean;
  maxPollRecords: number;
  sessionTimeout: number;
}

const consumerConfig: ConsumerConfig = {
  groupId: 'order-processor',
  topics: ['orders.order.created', 'orders.order.updated'],
  autoCommit: false,  // Manual commit for exactly-once
  maxPollRecords: 500,
  sessionTimeout: 30000
};
```

---

## SQS/SNS Design

### Queue Configuration

```typescript
interface SQSQueueConfig {
  queueName: string;
  visibilityTimeout: number;    // seconds
  messageRetention: number;     // seconds
  receiveWaitTime: number;      // long polling
  maxReceiveCount: number;      // before DLQ
  fifo: boolean;
  contentBasedDeduplication: boolean;
}

const orderQueue: SQSQueueConfig = {
  queueName: 'order-processing.fifo',
  visibilityTimeout: 300,       // 5 minutes
  messageRetention: 1209600,    // 14 days
  receiveWaitTime: 20,          // long polling
  maxReceiveCount: 3,           // 3 retries before DLQ
  fifo: true,
  contentBasedDeduplication: true
};
```

### Fan-Out Pattern

```
                    ┌─────────────────┐
                    │   SNS Topic     │
                    │ order-events    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   SQS Queue     │ │   SQS Queue     │ │   Lambda        │
│ email-service   │ │ analytics       │ │ notification    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Monitoring

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Queue depth | Messages waiting | >1000 |
| Consumer lag | Messages behind | >5000 |
| Processing time | Time to process | >30s P99 |
| Error rate | Failed messages | >1% |
| DLQ size | Dead letters | >100 |
| Throughput | Messages/second | Depends on SLA |

### Monitoring Setup

```typescript
interface QueueMetrics {
  queueDepth: number;
  oldestMessageAge: number;
  messagesProcessed: number;
  messagesFailed: number;
  processingTimeP50: number;
  processingTimeP99: number;
  consumerLag: number;
}

// CloudWatch metrics
const metrics: CloudWatchMetric[] = [
  {
    namespace: 'Custom/MessageQueue',
    metricName: 'QueueDepth',
    dimensions: [{ Name: 'QueueName', Value: 'order-processing' }],
    value: queueDepth,
    unit: 'Count'
  }
];
```

---

## Design Document Template

```markdown
# Message Queue Design - [Feature/Module]

## 1. Overview
- Purpose: [What async processing is needed]
- Pattern: [Event Sourcing / CQRS / Saga / Simple Queue]
- Volume: [Messages per second]

## 2. Technology Selection
- Broker: [Kafka / RabbitMQ / SQS / etc.]
- Rationale: [Why this choice]

## 3. Topic/Queue Design
| Topic/Queue | Purpose | Partitions | Retention |
|-------------|---------|------------|-----------|
| [name] | [purpose] | [count] | [days] |

## 4. Event Schema
```typescript
// Event definitions
```

## 5. Consumer Groups
| Group | Subscriptions | Parallelism |
|-------|---------------|-------------|
| [group] | [topics] | [instances] |

## 6. Reliability Configuration
- Retry strategy: [exponential backoff config]
- DLQ: [yes/no, retention]
- Idempotency: [strategy]

## 7. Monitoring
- Key metrics: [list]
- Alerting: [thresholds]

## 8. Cost Estimate
| Component | Usage | Monthly Cost |
|-----------|-------|--------------|
| Messages | [count] | $X |
| Storage | [GB] | $X |
```

---

## References

- Database Design: `rules/construction/database-design.md`
- NoSQL Design: `rules/construction/nosql-design.md`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
- Code Generation: `rules/construction/code-generation.md`
