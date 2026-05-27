# NoSQL Database Design

**Purpose**: Design document databases, key-value stores, and wide-column databases for flexible, scalable data storage

**When to Use**: Applications with flexible schemas, high write throughput, horizontal scaling, or document-centric data models

---

## Overview

NoSQL database design defines how the application stores and retrieves data using non-relational databases. This stage creates data models optimized for specific access patterns rather than normalization.

---

## Database Type Selection

### NoSQL Categories

| Type | Best For | Examples | Access Pattern |
|------|----------|----------|----------------|
| Document | Flexible schemas, JSON data | MongoDB, DynamoDB, Cosmos DB | By ID, by query |
| Key-Value | Simple lookups, caching, sessions | Redis, DynamoDB, Memcached | By key only |
| Wide-Column | Time-series, analytics, IoT | Cassandra, HBase, Bigtable | By partition + sort |
| Graph | Relationships, networks, recommendations | Neo4j, Neptune, TigerGraph | By traversal |

### Selection Decision Tree

```markdown
## NoSQL Type Selection

**Primary Access Pattern**: [Describe main queries]
**Data Shape**: [Document / Key-Value / Time-series / Graph]
**Scale Requirements**: [Reads/writes per second]
**Consistency Needs**: [Strong / Eventual / Tunable]

**Decision**:
1. If data is hierarchical/nested → Document
2. If access is by single key → Key-Value
3. If access is by partition + time/sort → Wide-Column
4. If traversing relationships → Graph
5. If flexible queries needed → Document
```

---

## Provider Selection

### Document Databases

| Provider | Managed | Best For | Cost Model |
|----------|---------|----------|------------|
| MongoDB Atlas | Yes | General document storage | Per hour + storage |
| AWS DynamoDB | Yes | Serverless, predictable | Per request + storage |
| Azure Cosmos DB | Yes | Multi-model, global | Per RU + storage |
| Google Firestore | Yes | Mobile/web, realtime | Per operation |
| Self-hosted MongoDB | No | Cost control, compliance | Infrastructure |

### Selection Criteria

```markdown
## Provider Selection

**Cloud Preference**: [AWS / Azure / GCP / Agnostic]
**Managed vs Self-hosted**: [Managed / Self-hosted]
**Global Distribution**: [Required / Not required]
**Serverless**: [Required / Preferred / Not needed]

**Recommendation**: [Provider] because [rationale]
```

---

## Data Modeling Principles

### Document Store Patterns

#### Embedding vs Referencing

| Pattern | When to Use | Example |
|---------|-------------|---------|
| Embed | One-to-few, read together, rarely updated | User → Addresses |
| Reference | One-to-many, independent updates | User → Orders |
| Hybrid | Denormalize frequently accessed | Order → ProductSummary |

#### Embedding Example

```json
// Embedded (one-to-few)
{
  "_id": "user_123",
  "name": "John Doe",
  "addresses": [
    {
      "type": "home",
      "street": "123 Main St",
      "city": "Boston"
    },
    {
      "type": "work",
      "street": "456 Corp Ave",
      "city": "Cambridge"
    }
  ]
}
```

#### Referencing Example

```json
// User document
{
  "_id": "user_123",
  "name": "John Doe",
  "orderIds": ["order_1", "order_2", "order_3"]
}

// Order document
{
  "_id": "order_1",
  "userId": "user_123",
  "items": [...],
  "total": 99.99
}
```

#### Hybrid (Denormalized)

```json
// Order with embedded product summary
{
  "_id": "order_1",
  "userId": "user_123",
  "items": [
    {
      "productId": "prod_1",
      // Denormalized for display (not source of truth)
      "name": "Widget",
      "price": 29.99,
      "quantity": 2
    }
  ]
}
```

---

## DynamoDB Single-Table Design

### Single-Table Principles

1. **Define access patterns first** - List all queries before designing
2. **Use composite keys** - Partition key + sort key for flexibility
3. **Overload keys** - Same attribute, different entity types
4. **Use GSIs for additional patterns** - Global Secondary Indexes

### Access Pattern Analysis

```markdown
## Access Pattern List

| # | Access Pattern | Key Structure | Index |
|---|---------------|---------------|-------|
| 1 | Get user by ID | PK=USER#id | Table |
| 2 | Get orders by user | PK=USER#id, SK=ORDER#date | Table |
| 3 | Get order by ID | PK=ORDER#id, SK=ORDER#id | Table |
| 4 | Get orders by status | GSI1: PK=STATUS#status, SK=date | GSI1 |
| 5 | Get product by ID | PK=PROD#id, SK=PROD#id | Table |
```

### Key Design

```typescript
interface TableItem {
  PK: string;     // Partition Key
  SK: string;     // Sort Key
  GSI1PK?: string; // GSI1 Partition Key
  GSI1SK?: string; // GSI1 Sort Key
  type: string;   // Entity type
  // Entity-specific attributes
  [key: string]: any;
}

// User entity
const user: TableItem = {
  PK: `USER#${userId}`,
  SK: `USER#${userId}`,
  type: 'User',
  name: 'John Doe',
  email: 'john@example.com'
};

// Order entity
const order: TableItem = {
  PK: `USER#${userId}`,
  SK: `ORDER#${orderDate}#${orderId}`,
  GSI1PK: `STATUS#${status}`,
  GSI1SK: orderDate,
  type: 'Order',
  orderId: orderId,
  total: 99.99
};
```

---

## MongoDB Schema Design

### Schema Design Patterns

#### Polymorphic Pattern

```typescript
// Base document with type discriminator
interface BaseDocument {
  _id: ObjectId;
  type: 'product' | 'service' | 'subscription';
  name: string;
  price: number;
}

interface ProductDocument extends BaseDocument {
  type: 'product';
  sku: string;
  inventory: number;
}

interface ServiceDocument extends BaseDocument {
  type: 'service';
  duration: number;
  provider: string;
}
```

#### Bucket Pattern (Time-series)

```typescript
// Instead of one doc per measurement
interface MeasurementBucket {
  sensorId: string;
  date: Date;          // Bucket date (hour/day)
  measurements: Array<{
    timestamp: Date;
    value: number;
  }>;
  count: number;
  sum: number;
  min: number;
  max: number;
}
```

#### Computed Pattern

```typescript
interface ProductWithStats {
  _id: ObjectId;
  name: string;
  // Computed fields (updated on write)
  totalSales: number;
  averageRating: number;
  reviewCount: number;
  lastUpdated: Date;
}
```

---

## Indexing Strategies

### MongoDB Indexes

```typescript
// Single field index
db.users.createIndex({ email: 1 }, { unique: true });

// Compound index
db.orders.createIndex({ userId: 1, createdAt: -1 });

// Text search index
db.products.createIndex({ name: 'text', description: 'text' });

// Partial index (only index matching docs)
db.orders.createIndex(
  { status: 1 },
  { partialFilterExpression: { status: 'pending' } }
);

// TTL index (auto-delete)
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
);
```

### DynamoDB Indexes

```typescript
// Global Secondary Index (GSI)
const gsi: GlobalSecondaryIndex = {
  IndexName: 'GSI1',
  KeySchema: [
    { AttributeName: 'GSI1PK', KeyType: 'HASH' },
    { AttributeName: 'GSI1SK', KeyType: 'RANGE' }
  ],
  Projection: { ProjectionType: 'ALL' }
};

// Local Secondary Index (LSI) - must be created at table creation
const lsi: LocalSecondaryIndex = {
  IndexName: 'LSI1',
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'AltSortKey', KeyType: 'RANGE' }
  ],
  Projection: { ProjectionType: 'KEYS_ONLY' }
};
```

---

## Consistency Patterns

### Consistency Levels

| Level | Guarantee | Use Case |
|-------|-----------|----------|
| Strong | Read latest write | Financial, inventory |
| Eventual | Eventually consistent | Social feeds, logs |
| Session | Consistent within session | User preferences |
| Bounded Staleness | Within time/version bound | Analytics dashboards |

### Optimistic Locking

```typescript
// MongoDB with version field
interface VersionedDocument {
  _id: ObjectId;
  version: number;
  data: any;
}

async function updateWithLock(id: ObjectId, update: any, expectedVersion: number) {
  const result = await collection.updateOne(
    { _id: id, version: expectedVersion },
    {
      $set: update,
      $inc: { version: 1 }
    }
  );

  if (result.modifiedCount === 0) {
    throw new ConcurrentModificationError();
  }
}
```

### DynamoDB Conditional Writes

```typescript
// Conditional update
await dynamodb.update({
  TableName: 'orders',
  Key: { PK: 'ORDER#123', SK: 'ORDER#123' },
  UpdateExpression: 'SET #status = :newStatus',
  ConditionExpression: '#status = :expectedStatus',
  ExpressionAttributeNames: { '#status': 'status' },
  ExpressionAttributeValues: {
    ':newStatus': 'shipped',
    ':expectedStatus': 'processing'
  }
});
```

---

## Scaling Patterns

### Horizontal Partitioning

```markdown
## Partitioning Strategy

**Partition Key Selection Criteria**:
1. High cardinality (many unique values)
2. Even distribution of requests
3. Aligns with access patterns

**Hot Partition Prevention**:
- Avoid sequential IDs as partition keys
- Add random suffix for time-based data
- Use write sharding for high-volume items
```

### Write Sharding

```typescript
// For high-write items, distribute across shards
function getShardedKey(itemId: string, shardCount: number = 10): string {
  const shard = hashCode(itemId) % shardCount;
  return `ITEM#${itemId}#SHARD#${shard}`;
}

// Aggregate across shards for reads
async function getAggregatedCount(itemId: string): Promise<number> {
  const shardPromises = Array.from({ length: 10 }, (_, i) =>
    getShardCount(itemId, i)
  );
  const counts = await Promise.all(shardPromises);
  return counts.reduce((sum, count) => sum + count, 0);
}
```

---

## Migration Patterns

### Schema Versioning

```typescript
interface DocumentWithVersion {
  _id: ObjectId;
  schemaVersion: number;
  // ... other fields
}

// Migration function
async function migrateDocument(doc: any): Promise<any> {
  let current = doc;

  while (current.schemaVersion < CURRENT_VERSION) {
    current = await migrations[current.schemaVersion](current);
  }

  return current;
}
```

### Dual-Write Migration

```markdown
## Migration Strategy

**Phase 1: Dual Write**
- Write to both old and new collections
- Read from old collection

**Phase 2: Backfill**
- Migrate historical data
- Verify data integrity

**Phase 3: Switch Reads**
- Read from new collection
- Continue dual write

**Phase 4: Complete**
- Stop writing to old collection
- Archive old collection
```

---

## Cost Optimization

### DynamoDB Capacity Modes

| Mode | Best For | Billing |
|------|----------|---------|
| On-Demand | Unpredictable, spiky | Per request |
| Provisioned | Predictable, steady | Per hour |
| Provisioned + Auto-scaling | Predictable with spikes | Per hour + overage |

### Cost Reduction Strategies

1. **TTL for expiring data** - Auto-delete old records
2. **Sparse indexes** - Only index needed documents
3. **Compress large attributes** - Gzip text fields
4. **Use projections** - Return only needed fields
5. **Batch operations** - Reduce request overhead
6. **Reserved capacity** - Up to 76% savings

---

## Design Document Template

```markdown
# NoSQL Database Design - [Feature/Module]

## 1. Overview
- Purpose: [What data will be stored]
- Database type: [Document / Key-Value / Wide-Column]
- Provider: [MongoDB Atlas / DynamoDB / etc.]

## 2. Access Patterns
| # | Pattern | Query | Frequency |
|---|---------|-------|-----------|
| 1 | [pattern] | [query structure] | [ops/sec] |

## 3. Data Model
```typescript
// Collection/Table schemas
```

## 4. Key Design (if DynamoDB/Cassandra)
| Entity | PK | SK | GSI1PK | GSI1SK |
|--------|----|----|--------|--------|
| [entity] | [pk] | [sk] | [gsi1pk] | [gsi1sk] |

## 5. Indexes
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| [name] | [fields] | [type] | [purpose] |

## 6. Consistency Model
- Read consistency: [Strong / Eventual]
- Write pattern: [Optimistic / Pessimistic]

## 7. Scaling Strategy
- Partition key: [key design]
- Expected throughput: [reads/writes per second]
- Capacity mode: [On-demand / Provisioned]

## 8. Cost Estimate
| Component | Usage | Monthly Cost |
|-----------|-------|--------------|
| Storage | [GB] | $X |
| Read capacity | [RCUs] | $X |
| Write capacity | [WCUs] | $X |

## 9. Migration Plan (if applicable)
[Migration strategy for existing data]
```

---

## References

- Database Design: `rules/construction/database-design.md`
- Vector Database Design: `rules/construction/vector-database-design.md`
- Message Queue Design: `rules/construction/message-queue-design.md`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
