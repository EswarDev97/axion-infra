# API Gateway Design

**Purpose**: Design API gateway patterns for routing, rate limiting, authentication, and API management

**When to Use**: Microservices architectures, public APIs, mobile backends, or when centralizing cross-cutting concerns

---

## Overview

API Gateway design defines how the application handles API traffic, security, and management. This stage creates gateway architectures that provide a unified entry point while handling cross-cutting concerns.

---

## Technology Selection

### Gateway Options

| Technology | Best For | Type | Cost |
|------------|----------|------|------|
| AWS API Gateway | Serverless, AWS-native | Managed | Per request |
| Kong | Full-featured, plugins | Self-hosted/Cloud | $$ |
| Nginx | Simple routing, performance | Self-hosted | $ |
| Envoy | Service mesh, Kubernetes | Self-hosted | $ |
| Azure API Management | Azure ecosystem | Managed | $$$ |
| Apigee | Enterprise, analytics | Managed | $$$$ |
| Traefik | Kubernetes, dynamic | Self-hosted | $ |

### Selection Criteria

```markdown
## API Gateway Selection

**Architecture**: [Serverless / Containers / VMs]
**Cloud**: [AWS / Azure / GCP / Agnostic]
**Features Needed**: [Rate limiting / Auth / Transformation / Analytics]
**Traffic Volume**: [Requests per second]
**Budget**: [Cost constraints]

**Recommendation**: [Gateway] because [rationale]
```

---

## Gateway Patterns

### Routing Patterns

```yaml
# Kong/Nginx style routing
routes:
  - name: user-service
    paths:
      - /api/v1/users
    service: user-service
    strip_path: true
    methods: [GET, POST, PUT, DELETE]

  - name: order-service
    paths:
      - /api/v1/orders
    service: order-service
    strip_path: true
    plugins:
      - rate-limiting:
          minute: 100

  - name: legacy-redirect
    paths:
      - /api/users
    redirect:
      status_code: 301
      location: /api/v1/users
```

### Backend-for-Frontend (BFF)

```
                    ┌─────────────────┐
                    │   API Gateway   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Web BFF       │ │   Mobile BFF    │ │   Admin BFF     │
│   /web/api/*    │ │   /mobile/api/* │ │   /admin/api/*  │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                    ┌────────┴────────┐
                    │   Microservices │
                    └─────────────────┘
```

### Request Aggregation

```typescript
// Gateway aggregates multiple service calls
app.get('/api/v1/dashboard', async (req, res) => {
  const [user, orders, notifications] = await Promise.all([
    userService.getProfile(req.userId),
    orderService.getRecent(req.userId, 5),
    notificationService.getUnread(req.userId)
  ]);

  res.json({
    user,
    recentOrders: orders,
    unreadNotifications: notifications.length
  });
});
```

---

## Rate Limiting

### Rate Limiting Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Fixed Window | Reset count at fixed intervals | Simple, predictable |
| Sliding Window | Rolling time window | Smoother distribution |
| Token Bucket | Tokens refill over time | Burst handling |
| Leaky Bucket | Constant rate output | Smooth traffic |

### Implementation

```typescript
// Token bucket rate limiter
interface RateLimitConfig {
  key: string;          // e.g., 'user:123' or 'ip:1.2.3.4'
  limit: number;        // max requests
  window: number;       // window in seconds
  burstLimit?: number;  // allow burst above limit
}

const rateLimitMiddleware = async (req, res, next) => {
  const key = `ratelimit:${req.user?.id || req.ip}`;

  const result = await rateLimiter.check({
    key,
    limit: 100,
    window: 60
  });

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': result.limit,
    'X-RateLimit-Remaining': result.remaining,
    'X-RateLimit-Reset': result.reset
  });

  if (!result.allowed) {
    res.set('Retry-After', result.retryAfter);
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: result.retryAfter
    });
  }

  next();
};
```

### Tiered Rate Limits

```yaml
rate_limits:
  anonymous:
    requests_per_minute: 20
    requests_per_hour: 100

  authenticated:
    requests_per_minute: 100
    requests_per_hour: 1000

  premium:
    requests_per_minute: 1000
    requests_per_hour: 10000

  internal:
    requests_per_minute: unlimited
```

---

## Authentication & Authorization

### Authentication Patterns

```typescript
// JWT validation middleware
const jwtMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// API key validation
const apiKeyMiddleware = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const keyData = await apiKeyStore.validate(apiKey);

  if (!keyData) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.apiKey = keyData;
  next();
};
```

### Authorization

```typescript
// Role-based access control
const authorize = (...roles: string[]) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

// Scope-based (OAuth2)
const requireScopes = (...scopes: string[]) => {
  return (req, res, next) => {
    const tokenScopes = req.user?.scopes || [];
    const hasScopes = scopes.every(s => tokenScopes.includes(s));

    if (!hasScopes) {
      return res.status(403).json({
        error: 'Insufficient scope',
        required: scopes,
        provided: tokenScopes
      });
    }

    next();
  };
};
```

---

## Request/Response Transformation

### Request Transformation

```typescript
// Add headers for downstream services
const addServiceHeaders = (req, res, next) => {
  req.headers['x-request-id'] = req.id || uuid();
  req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuid();
  req.headers['x-user-id'] = req.user?.id;
  req.headers['x-tenant-id'] = req.user?.tenantId;
  next();
};

// Transform request body
const transformRequest = (transformer) => {
  return (req, res, next) => {
    req.body = transformer(req.body);
    next();
  };
};
```

### Response Transformation

```typescript
// Standardize response format
const standardizeResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    const standardized = {
      success: res.statusCode < 400,
      data: res.statusCode < 400 ? data : undefined,
      error: res.statusCode >= 400 ? data : undefined,
      metadata: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    return originalJson(standardized);
  };

  next();
};

// Remove internal fields
const sanitizeResponse = (fields: string[]) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      const sanitized = removeFields(data, fields);
      return originalJson(sanitized);
    };

    next();
  };
};
```

---

## Caching

### Gateway-Level Caching

```yaml
# Kong caching configuration
plugins:
  - name: proxy-cache
    config:
      response_code:
        - 200
        - 301
      request_method:
        - GET
        - HEAD
      content_type:
        - application/json
      cache_ttl: 300
      cache_control: true
      storage_ttl: 3600
```

### Cache Headers

```typescript
const cacheMiddleware = (options: CacheOptions) => {
  return (req, res, next) => {
    // Check for cached response
    const cacheKey = generateCacheKey(req);
    const cached = await cache.get(cacheKey);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Cache the response
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode === 200) {
        await cache.set(cacheKey, data, options.ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};
```

---

## Circuit Breaker

### Circuit Breaker Pattern

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;     // failures before opening
  successThreshold: number;     // successes before closing
  timeout: number;              // time in open state before half-open
  monitorInterval: number;      // health check interval
}

class ServiceCircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldTryHalfOpen()) {
        this.state = 'half-open';
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

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'closed';
        this.successes = 0;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }
}
```

---

## API Versioning

### Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URL path | `/v1/users` | Clear, cacheable | URL changes |
| Header | `Accept-Version: v1` | Clean URLs | Less discoverable |
| Query param | `/users?version=1` | Easy testing | Less RESTful |
| Content-Type | `Accept: application/vnd.api.v1+json` | Standards-based | Complex |

### Version Routing

```typescript
// URL-based versioning
const v1Router = express.Router();
const v2Router = express.Router();

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Header-based versioning
const versionMiddleware = (req, res, next) => {
  const version = req.headers['accept-version'] || 'v1';
  req.apiVersion = version;
  next();
};

app.use('/api', versionMiddleware, (req, res, next) => {
  const router = routers[req.apiVersion];
  if (!router) {
    return res.status(400).json({ error: 'Invalid API version' });
  }
  router(req, res, next);
});
```

---

## Monitoring & Observability

### Metrics Collection

```typescript
// Request metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    metrics.histogram('http_request_duration_ms', duration, {
      method: req.method,
      path: req.route?.path || 'unknown',
      status: res.statusCode
    });

    metrics.counter('http_requests_total', 1, {
      method: req.method,
      path: req.route?.path || 'unknown',
      status: res.statusCode
    });
  });

  next();
};
```

### Health Checks

```typescript
// Gateway health endpoint
app.get('/health', async (req, res) => {
  const services = await Promise.allSettled([
    checkService('user-service'),
    checkService('order-service'),
    checkService('payment-service')
  ]);

  const status = services.every(s => s.status === 'fulfilled') ? 'healthy' : 'degraded';

  res.json({
    status,
    timestamp: new Date().toISOString(),
    services: services.map((s, i) => ({
      name: serviceNames[i],
      status: s.status === 'fulfilled' ? 'up' : 'down'
    }))
  });
});
```

---

## Design Document Template

```markdown
# API Gateway Design - [Application]

## 1. Overview
- Purpose: [Gateway responsibilities]
- Architecture: [Centralized / BFF / Distributed]
- Traffic estimate: [Requests per second]

## 2. Technology Selection
- Gateway: [Kong / AWS API Gateway / etc.]
- Rationale: [Why this choice]

## 3. Routing Configuration
| Route | Service | Auth | Rate Limit |
|-------|---------|------|------------|
| [path] | [service] | [type] | [limit] |

## 4. Security
- Authentication: [JWT / API Key / OAuth2]
- Authorization: [RBAC / Scopes]
- Rate limiting: [Strategy and limits]

## 5. Cross-Cutting Concerns
- Request transformation: [headers, body]
- Response transformation: [format, sanitization]
- Caching: [strategy, TTL]

## 6. Resilience
- Circuit breaker: [configuration]
- Retry policy: [attempts, backoff]
- Timeout: [per route]

## 7. Monitoring
- Metrics: [latency, errors, throughput]
- Logging: [request/response logging]
- Alerting: [thresholds]

## 8. Cost Estimate
| Component | Usage | Monthly Cost |
|-----------|-------|--------------|
| Gateway | [requests] | $X |
```

---

## References

- Auth Design: `rules/construction/auth-design.md`
- Caching Design: `rules/construction/caching-design.md`
- Observability Design: `rules/construction/observability-design.md`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
