# Caching Design

**Purpose**: Design caching strategies for performance optimization, reducing latency, and decreasing backend load

**When to Use**: High-read workloads, expensive computations, session management, or rate limiting

---

## Overview

Caching design defines how the application stores and retrieves frequently accessed data to improve performance. This stage creates a multi-layer caching strategy balancing consistency, latency, and cost.

---

## Cache Types

### Cache Layer Overview

| Layer | Location | Latency | Scope | Use Case |
|-------|----------|---------|-------|----------|
| Browser | Client | <1ms | Per user | Static assets, API responses |
| CDN | Edge | 10-50ms | Global | Static content, API caching |
| Application | In-memory | <1ms | Per instance | Hot data, computations |
| Distributed | Redis/Memcached | 1-5ms | Shared | Sessions, shared state |
| Database | Query cache | 10-50ms | Per DB | Frequent queries |

### Technology Selection

| Technology | Best For | Max Size | Persistence |
|------------|----------|----------|-------------|
| Redis | Sessions, distributed cache, pub/sub | 100s GB | Optional |
| Memcached | Simple caching, large values | 100s GB | No |
| Hazelcast | JVM applications, distributed compute | 100s GB | Optional |
| ElastiCache | AWS managed Redis/Memcached | TB scale | Optional |
| Local cache | Per-instance, hot data | GB scale | No |

---

## Caching Strategies

### Strategy Comparison

| Strategy | Write | Read | Consistency | Use Case |
|----------|-------|------|-------------|----------|
| Cache-Aside | App writes to DB, invalidates cache | Check cache, fallback to DB | Eventual | General purpose |
| Write-Through | App writes to cache, cache writes to DB | Always from cache | Strong | Simple consistency |
| Write-Behind | App writes to cache, async DB write | Always from cache | Eventual | High write throughput |
| Read-Through | Cache loads from DB on miss | Always from cache | Eventual | Transparent caching |

### Cache-Aside Pattern

```typescript
class CacheAsideRepository<T> {
  constructor(
    private cache: Cache,
    private db: Database,
    private ttl: number
  ) {}

  async get(key: string): Promise<T | null> {
    // Try cache first
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - load from database
    const data = await this.db.findByKey<T>(key);
    if (data !== null) {
      await this.cache.set(key, data, this.ttl);
    }

    return data;
  }

  async set(key: string, value: T): Promise<void> {
    // Write to database
    await this.db.save(key, value);
    // Invalidate cache
    await this.cache.delete(key);
  }

  async update(key: string, value: T): Promise<void> {
    await this.db.update(key, value);
    await this.cache.delete(key);
  }
}
```

### Write-Through Pattern

```typescript
class WriteThroughCache<T> {
  async set(key: string, value: T): Promise<void> {
    // Write to cache first
    await this.cache.set(key, value);
    // Synchronously write to database
    await this.db.save(key, value);
  }

  async get(key: string): Promise<T | null> {
    // Always read from cache
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - populate from DB
    const data = await this.db.findByKey<T>(key);
    if (data !== null) {
      await this.cache.set(key, data);
    }
    return data;
  }
}
```

### Write-Behind Pattern

```typescript
class WriteBehindCache<T> {
  private writeQueue: Map<string, T> = new Map();
  private flushInterval = 1000; // ms

  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  async set(key: string, value: T): Promise<void> {
    // Write to cache immediately
    await this.cache.set(key, value);
    // Queue for async database write
    this.writeQueue.set(key, value);
  }

  private async flush(): Promise<void> {
    if (this.writeQueue.size === 0) return;

    const batch = new Map(this.writeQueue);
    this.writeQueue.clear();

    // Batch write to database
    await this.db.batchSave(batch);
  }
}
```

---

## Lookup Table Caching (Reference Data)

### Lookup Table Cache Strategy Question

When designing caching for lookup/reference tables, answer:

**How should lookup table data be cached and refreshed?**

| Strategy | Implementation | Best For |
|----------|---------------|----------|
| **A) Load Once at Startup** | `CacheWarmer.warmOnStartup()` | Rarely changing data (countries, currencies) |
| **B) Watch for Changes** | Event listener, file watcher, DB trigger | Moderately changing data (product categories) |
| **C) Frontend-Triggered Invalidation** | API endpoint `POST /api/admin/cache/invalidate/{table}` | Admin-managed tables (statuses, types) |

### Implementation Patterns

#### Option A: Load Once at Startup

```typescript
class LookupCache {
  private lookups: Map<string, any[]> = new Map();

  async warmOnStartup(): Promise<void> {
    const tables = ['status_lookup', 'category_lookup', 'type_lookup'];
    for (const table of tables) {
      const data = await this.db.query(`SELECT * FROM ${table} WHERE is_active = true`);
      this.lookups.set(table, data);
    }
  }

  get(tableName: string): any[] {
    return this.lookups.get(tableName) || [];
  }
}
```

#### Option B: Watch for Changes

```typescript
// Using event-driven invalidation
eventBus.on('lookup.updated', async (event) => {
  await cache.delete(`lookup:${event.tableName}`);
  await cache.set(`lookup:${event.tableName}`, await db.getLookup(event.tableName));
});

// Database trigger approach
// CREATE TRIGGER lookup_change_notify
// AFTER INSERT OR UPDATE OR DELETE ON status_lookup
// FOR EACH ROW EXECUTE FUNCTION notify_lookup_change();
```

#### Option C: Frontend-Triggered Invalidation

```typescript
// Admin API endpoint
app.post('/api/admin/cache/invalidate/:table', async (req, res) => {
  const { table } = req.params;
  await cache.delete(`lookup:${table}`);
  res.json({ success: true, message: `Cache invalidated for ${table}` });
});

// Call after admin saves changes to lookup table
await fetch(`/api/admin/cache/invalidate/${tableName}`, { method: 'POST' });
```

### Lookup Table Cache Design Template

For each lookup table, document:

| Table | Cache Strategy | TTL | Invalidation Trigger |
|-------|---------------|-----|---------------------|
| `status_lookup` | A (Startup) | none | Application restart |
| `category_lookup` | B (Event) | 1 hour | Database trigger |
| `user_preferences` | C (Frontend) | none | Admin save action |

---

## Cache Invalidation

### Invalidation Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| TTL-based | Auto-expire after time | General data |
| Event-based | Invalidate on data change | Real-time consistency |
| Version-based | Include version in key | Deployments |
| Tag-based | Invalidate by tag group | Related data |

### Event-Based Invalidation

```typescript
// Event-driven cache invalidation
class CacheInvalidator {
  constructor(
    private cache: Cache,
    private eventBus: EventBus
  ) {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.eventBus.on('user.updated', async (event) => {
      await this.invalidateUser(event.userId);
    });

    this.eventBus.on('product.updated', async (event) => {
      await this.invalidateProduct(event.productId);
    });
  }

  private async invalidateUser(userId: string): Promise<void> {
    await this.cache.delete(`user:${userId}`);
    await this.cache.delete(`user:${userId}:profile`);
    await this.cache.delete(`user:${userId}:preferences`);
  }

  private async invalidateProduct(productId: string): Promise<void> {
    await this.cache.delete(`product:${productId}`);
    // Invalidate related caches
    const tags = await this.cache.getByPattern(`product:${productId}:*`);
    await this.cache.deleteMany(tags);
  }
}
```

### Tag-Based Invalidation

```typescript
// Redis implementation with tags
class TaggedCache {
  async setWithTags(
    key: string,
    value: any,
    tags: string[],
    ttl: number
  ): Promise<void> {
    // Store value
    await this.redis.setex(key, ttl, JSON.stringify(value));

    // Add key to each tag set
    for (const tag of tags) {
      await this.redis.sadd(`tag:${tag}`, key);
      await this.redis.expire(`tag:${tag}`, ttl);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    // Get all keys with this tag
    const keys = await this.redis.smembers(`tag:${tag}`);

    if (keys.length > 0) {
      // Delete all tagged keys
      await this.redis.del(...keys);
    }

    // Delete the tag set
    await this.redis.del(`tag:${tag}`);
  }
}

// Usage
await cache.setWithTags('product:123', product, ['category:electronics', 'brand:apple'], 3600);
await cache.invalidateByTag('category:electronics'); // Invalidates all electronics products
```

---

## Redis Patterns

### Session Storage

```typescript
interface SessionConfig {
  prefix: string;
  ttlSeconds: number;
  slidingExpiration: boolean;
}

class RedisSessionStore {
  private config: SessionConfig = {
    prefix: 'session:',
    ttlSeconds: 3600,
    slidingExpiration: true
  };

  async get(sessionId: string): Promise<Session | null> {
    const key = `${this.config.prefix}${sessionId}`;
    const data = await this.redis.get(key);

    if (data === null) return null;

    // Sliding expiration - refresh TTL on access
    if (this.config.slidingExpiration) {
      await this.redis.expire(key, this.config.ttlSeconds);
    }

    return JSON.parse(data);
  }

  async set(sessionId: string, session: Session): Promise<void> {
    const key = `${this.config.prefix}${sessionId}`;
    await this.redis.setex(key, this.config.ttlSeconds, JSON.stringify(session));
  }

  async destroy(sessionId: string): Promise<void> {
    await this.redis.del(`${this.config.prefix}${sessionId}`);
  }
}
```

### Rate Limiting

```typescript
// Sliding window rate limiter
class RateLimiter {
  constructor(
    private redis: Redis,
    private windowMs: number,
    private maxRequests: number
  ) {}

  async isAllowed(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;

    // Remove old entries
    await this.redis.zremrangebyscore(windowKey, 0, now - this.windowMs);

    // Count current window
    const count = await this.redis.zcard(windowKey);

    if (count >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Add current request
    await this.redis.zadd(windowKey, now, `${now}:${Math.random()}`);
    await this.redis.expire(windowKey, Math.ceil(this.windowMs / 1000));

    return { allowed: true, remaining: this.maxRequests - count - 1 };
  }
}
```

### Distributed Locking

```typescript
class RedisLock {
  private lockScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const lockId = crypto.randomUUID();
    const acquired = await this.redis.set(
      `lock:${key}`,
      lockId,
      'PX', ttlMs,
      'NX'
    );

    return acquired ? lockId : null;
  }

  async release(key: string, lockId: string): Promise<boolean> {
    const result = await this.redis.eval(
      this.lockScript,
      1,
      `lock:${key}`,
      lockId
    );
    return result === 1;
  }

  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const lockId = await this.acquire(key, ttlMs);
    if (!lockId) {
      throw new LockAcquisitionError(key);
    }

    try {
      return await fn();
    } finally {
      await this.release(key, lockId);
    }
  }
}
```

### Leaderboard

```typescript
class Leaderboard {
  constructor(private redis: Redis, private key: string) {}

  async addScore(userId: string, score: number): Promise<void> {
    await this.redis.zadd(this.key, score, userId);
  }

  async incrementScore(userId: string, increment: number): Promise<number> {
    return this.redis.zincrby(this.key, increment, userId);
  }

  async getTop(count: number): Promise<Array<{ userId: string; score: number }>> {
    const results = await this.redis.zrevrange(this.key, 0, count - 1, 'WITHSCORES');
    return this.parseResults(results);
  }

  async getRank(userId: string): Promise<number | null> {
    const rank = await this.redis.zrevrank(this.key, userId);
    return rank !== null ? rank + 1 : null;
  }
}
```

---

## Caching Best Practices

### Key Naming Convention

```
[namespace]:[entity]:[id]:[attribute]

Examples:
- user:123:profile
- product:456:details
- session:abc123
- cache:query:hash123
```

### Cache Warming

```typescript
class CacheWarmer {
  async warmOnStartup(): Promise<void> {
    // Warm frequently accessed data
    await Promise.all([
      this.warmPopularProducts(),
      this.warmCategories(),
      this.warmConfigurations()
    ]);
  }

  private async warmPopularProducts(): Promise<void> {
    const products = await this.db.getPopularProducts(100);
    await Promise.all(
      products.map(p => this.cache.set(`product:${p.id}`, p, 3600))
    );
  }

  async warmOnDeploy(): Promise<void> {
    // Invalidate version-sensitive caches
    await this.cache.deleteByPattern('cache:*');
    // Rewarm critical data
    await this.warmOnStartup();
  }
}
```

### Thundering Herd Prevention

```typescript
// Prevent multiple cache misses hitting database simultaneously
class CoalescedCache<T> {
  private inflight: Map<string, Promise<T | null>> = new Map();

  async get(key: string): Promise<T | null> {
    // Check cache
    const cached = await this.cache.get<T>(key);
    if (cached !== null) return cached;

    // Check if request already in flight
    const existing = this.inflight.get(key);
    if (existing) return existing;

    // Create new request
    const promise = this.loadAndCache(key);
    this.inflight.set(key, promise);

    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async loadAndCache(key: string): Promise<T | null> {
    const data = await this.db.findByKey<T>(key);
    if (data !== null) {
      await this.cache.set(key, data, this.ttl);
    }
    return data;
  }
}
```

---

## Design Document Template

```markdown
# Caching Design - [Feature/Module]

## 1. Overview
- Purpose: [What data needs caching]
- Read/write ratio: [ratio]
- Consistency requirements: [strong/eventual]

## 2. Cache Layers
| Layer | Technology | Purpose | TTL |
|-------|------------|---------|-----|
| [layer] | [tech] | [purpose] | [ttl] |

## 3. Caching Strategy
- Pattern: [cache-aside/write-through/etc.]
- Invalidation: [TTL/event/tag-based]

## 4. Key Design
| Key Pattern | Entity | TTL |
|-------------|--------|-----|
| [pattern] | [entity] | [ttl] |

## 5. Invalidation Rules
| Trigger | Keys Invalidated |
|---------|------------------|
| [event] | [key patterns] |

## 6. Cache Configuration
```typescript
// Redis/Cache configuration
```

## 7. Monitoring
- Hit rate target: [percentage]
- Eviction rate threshold: [percentage]

## 8. Cost Estimate
| Component | Size | Monthly Cost |
|-----------|------|--------------|
| Redis/ElastiCache | [GB] | $X |
```

---

## References

- Database Design: `rules/construction/database-design.md`
- NoSQL Design: `rules/construction/nosql-design.md`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
- API Gateway Design: `rules/construction/api-gateway-design.md`
