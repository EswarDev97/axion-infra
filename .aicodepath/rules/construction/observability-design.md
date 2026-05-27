# Observability Design

**Purpose**: Design logging, monitoring, tracing, and alerting systems for production visibility

**When to Use**: All production applications requiring operational visibility, debugging, and SLA monitoring

---

## Overview

Observability design defines how the application exposes its internal state through logs, metrics, and traces. This stage creates observability architectures that enable debugging, performance optimization, and proactive incident response.

---

## Three Pillars of Observability

### Pillar Overview

| Pillar | Purpose | Question Answered |
|--------|---------|-------------------|
| Logs | Event records | What happened? |
| Metrics | Numerical measurements | How is system performing? |
| Traces | Request flow tracking | Where did time go? |

### Technology Stack Options

| Component | Options | Recommendation |
|-----------|---------|----------------|
| Logs | ELK, Loki, CloudWatch | Based on scale/cost |
| Metrics | Prometheus, CloudWatch, Datadog | Based on ecosystem |
| Traces | Jaeger, Zipkin, X-Ray, Tempo | Based on cloud |
| Visualization | Grafana, Kibana, CloudWatch | Match log stack |
| Alerting | PagerDuty, OpsGenie, Grafana | Based on team size |

---

## Logging

### Structured Logging Format

```typescript
interface LogEntry {
  // Standard fields
  timestamp: string;       // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;
  version: string;
  environment: string;

  // Request context
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;

  // Error context
  error?: {
    name: string;
    message: string;
    stack: string;
    code?: string;
  };

  // Additional context
  metadata?: Record<string, any>;
}

// Logger implementation
const logger = {
  info: (message: string, context?: Partial<LogEntry>) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: process.env.SERVICE_NAME,
      version: process.env.SERVICE_VERSION,
      environment: process.env.NODE_ENV,
      ...context
    }));
  }
};
```

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| debug | Development details | Variable values, function entry/exit |
| info | Normal operations | Request received, job completed |
| warn | Potential issues | Retry attempt, deprecation warning |
| error | Failures requiring attention | Exception caught, operation failed |
| fatal | Critical failures | Startup failure, unrecoverable error |

### Request Logging

```typescript
const requestLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || uuid();

  // Log request
  logger.info('Request received', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length')
    });
  });

  req.requestId = requestId;
  next();
};
```

### Sensitive Data Handling

```typescript
// Fields to redact
const sensitiveFields = [
  'password',
  'token',
  'authorization',
  'apiKey',
  'secret',
  'creditCard',
  'ssn'
];

function redactSensitive(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(redacted)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }

  return redacted;
}
```

---

## Metrics

### Key Metrics (RED Method)

| Metric | Description | Use |
|--------|-------------|-----|
| Rate | Requests per second | Traffic volume |
| Errors | Error rate/count | Reliability |
| Duration | Latency percentiles | Performance |

### Application Metrics

```typescript
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

const registry = new Registry();

// Request metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry]
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry]
});

// Business metrics
const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['type', 'status'],
  registers: [registry]
});

// System metrics
const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Current active connections',
  labelNames: ['type'],
  registers: [registry]
});

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer({
    method: req.method,
    path: req.route?.path || 'unknown'
  });

  res.on('finish', () => {
    end();
    httpRequestsTotal.inc({
      method: req.method,
      path: req.route?.path || 'unknown',
      status: res.statusCode
    });
  });

  next();
};

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

### Custom Business Metrics

```typescript
// E-commerce example
const metrics = {
  checkout: {
    started: new Counter({ name: 'checkout_started_total', help: 'Checkouts started' }),
    completed: new Counter({ name: 'checkout_completed_total', help: 'Checkouts completed' }),
    abandoned: new Counter({ name: 'checkout_abandoned_total', help: 'Checkouts abandoned' }),
    duration: new Histogram({
      name: 'checkout_duration_seconds',
      help: 'Time from start to completion',
      buckets: [30, 60, 120, 300, 600]
    }),
    value: new Histogram({
      name: 'order_value_dollars',
      help: 'Order value distribution',
      buckets: [10, 25, 50, 100, 250, 500, 1000]
    })
  }
};
```

---

## Distributed Tracing

### Trace Context Propagation

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

// HTTP middleware for trace propagation
const tracingMiddleware = (req, res, next) => {
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.route': req.route?.path
    }
  });

  // Add trace context to request
  req.span = span;
  req.traceId = span.spanContext().traceId;
  req.spanId = span.spanContext().spanId;

  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    if (res.statusCode >= 400) {
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    span.end();
  });

  context.with(trace.setSpan(context.active(), span), () => next());
};

// Creating child spans
async function processOrder(orderId: string): Promise<void> {
  const span = tracer.startSpan('processOrder', {
    attributes: { 'order.id': orderId }
  });

  try {
    // Validate
    await tracer.startActiveSpan('validateOrder', async (validateSpan) => {
      await validateOrder(orderId);
      validateSpan.end();
    });

    // Process payment
    await tracer.startActiveSpan('processPayment', async (paymentSpan) => {
      await processPayment(orderId);
      paymentSpan.end();
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

### Trace Instrumentation

```typescript
// Auto-instrumentation setup
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  serviceName: process.env.SERVICE_NAME,
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true }
    })
  ]
});

sdk.start();
```

---

## Alerting

### Alert Definition

```yaml
# Prometheus alerting rules
groups:
  - name: application
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: Error rate is {{ $value | humanizePercentage }}

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency detected
          description: P95 latency is {{ $value | humanizeDuration }}

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Service is down
          description: '{{ $labels.instance }} has been down for more than 1 minute'
```

### Alert Severity Levels

| Severity | Response Time | Examples |
|----------|--------------|----------|
| Critical | Immediate (<15min) | Service down, data loss, security breach |
| Warning | Soon (<1hr) | High latency, disk space low, error rate elevated |
| Info | Next business day | Deprecation, capacity planning |

### On-Call Integration

```typescript
// PagerDuty integration
interface IncidentPayload {
  routingKey: string;
  eventAction: 'trigger' | 'acknowledge' | 'resolve';
  dedupKey: string;
  payload: {
    summary: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    customDetails?: Record<string, any>;
  };
}

async function createIncident(alert: Alert): Promise<void> {
  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routing_key: process.env.PAGERDUTY_ROUTING_KEY,
      event_action: 'trigger',
      dedup_key: alert.fingerprint,
      payload: {
        summary: alert.summary,
        severity: mapSeverity(alert.severity),
        source: alert.source,
        custom_details: alert.labels
      }
    })
  });
}
```

---

## Health Checks

### Health Check Endpoints

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    [name: string]: {
      status: 'pass' | 'fail';
      duration: number;
      message?: string;
    };
  };
}

// Liveness probe - is the app running?
app.get('/health/live', (req, res) => {
  res.json({ status: 'ok' });
});

// Readiness probe - can the app handle requests?
app.get('/health/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkExternalService()
  ]);

  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION,
    checks: {
      database: mapCheckResult(checks[0]),
      redis: mapCheckResult(checks[1]),
      external: mapCheckResult(checks[2])
    }
  };

  const hasFailure = Object.values(status.checks).some(c => c.status === 'fail');

  if (hasFailure) {
    status.status = 'degraded';
    return res.status(503).json(status);
  }

  res.json(status);
});

// Deep health check - detailed system status
app.get('/health/deep', async (req, res) => {
  // More comprehensive checks including:
  // - Database connection pool status
  // - Queue depths
  // - Disk space
  // - Memory usage
  // - Downstream service health
});
```

---

## Dashboards

### Dashboard Structure

```markdown
## Dashboard Layout

### Overview Dashboard
- Service health status (up/down)
- Request rate (current + trend)
- Error rate (current + trend)
- Latency P50/P95/P99
- Active users/requests

### Service Dashboard
- Request rate by endpoint
- Error rate by endpoint
- Latency by endpoint
- Database query performance
- Cache hit/miss ratio
- External dependency status

### Infrastructure Dashboard
- CPU/Memory utilization
- Disk I/O
- Network I/O
- Container/pod count
- Node health
```

### Grafana Dashboard JSON

```json
{
  "title": "Service Overview",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total[5m]))",
          "legendFormat": "requests/s"
        }
      ]
    },
    {
      "title": "Error Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
          "legendFormat": "error %"
        }
      ]
    },
    {
      "title": "Latency Percentiles",
      "type": "graph",
      "targets": [
        {
          "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "P50"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "P95"
        },
        {
          "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "P99"
        }
      ]
    }
  ]
}
```

---

## Design Document Template

```markdown
# Observability Design - [Application]

## 1. Overview
- Services covered: [list of services]
- SLOs defined: [availability, latency targets]
- On-call requirements: [24x7, business hours]

## 2. Technology Stack
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Logs | [ELK/Loki/CloudWatch] | [reason] |
| Metrics | [Prometheus/CloudWatch] | [reason] |
| Traces | [Jaeger/X-Ray/Tempo] | [reason] |
| Alerting | [PagerDuty/OpsGenie] | [reason] |

## 3. Logging
- Log format: [JSON structured]
- Log levels: [debug/info/warn/error]
- Retention: [days]
- Sensitive data handling: [redaction rules]

## 4. Metrics
### Application Metrics
| Metric | Type | Labels |
|--------|------|--------|
| [name] | [counter/gauge/histogram] | [labels] |

### SLOs
| SLO | Target | Measurement |
|-----|--------|-------------|
| Availability | [99.9%] | [calculation] |
| Latency P95 | [<200ms] | [calculation] |

## 5. Tracing
- Sampling rate: [percentage]
- Trace context: [W3C/B3]
- Retention: [days]

## 6. Alerting
| Alert | Severity | Threshold | Response |
|-------|----------|-----------|----------|
| [name] | [critical/warning] | [condition] | [action] |

## 7. Dashboards
- Overview dashboard: [link]
- Service dashboards: [links]
- Infrastructure dashboard: [link]

## 8. Runbooks
- [Link to runbook for each critical alert]
```

---

## References

- Infrastructure Design: `rules/construction/infrastructure-design.md`
- API Gateway Design: `rules/construction/api-gateway-design.md`
- Search Design: `rules/construction/search-design.md`
- Security Rules: `guidelines/security-rules.json`
