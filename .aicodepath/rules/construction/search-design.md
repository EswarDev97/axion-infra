# Search Design

**Purpose**: Design full-text search, faceted search, and analytics using Elasticsearch/OpenSearch

**When to Use**: Product search, log analytics, content discovery, autocomplete, or complex aggregations

---

## Overview

Search design defines how the application indexes, queries, and retrieves data using search engines. This stage creates search architectures that balance relevance, performance, and operational complexity.

---

## Technology Selection

### Search Engine Comparison

| Technology | Best For | Managed Options | Cost |
|------------|----------|-----------------|------|
| Elasticsearch | General search, logging | Elastic Cloud, AWS OpenSearch | $$$ |
| OpenSearch | AWS native, cost-effective | AWS OpenSearch Service | $$ |
| Algolia | E-commerce, instant search | Fully managed | $$$$ |
| Meilisearch | Simple, developer-friendly | Cloud available | $ |
| Typesense | Open source, easy setup | Cloud available | $ |

### Selection Criteria

```markdown
## Search Engine Selection

**Use Case**: [Product search / Log analytics / Content search]
**Data Volume**: [Documents count, total size]
**Query Patterns**: [Full-text / Faceted / Aggregations / Geo]
**Cloud Preference**: [AWS / Agnostic / Self-hosted]
**Budget Priority**: [Cost / Features / Performance]

**Recommendation**: [Engine] because [rationale]
```

---

## Index Design

### Mapping Strategies

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| Dynamic | Rapid prototyping | Less control |
| Explicit | Production, known schema | More maintenance |
| Strict | Critical data quality | Reindex on change |

### Explicit Mapping Example

```json
{
  "mappings": {
    "properties": {
      "id": {
        "type": "keyword"
      },
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": {
            "type": "keyword",
            "ignore_above": 256
          },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "english"
      },
      "category": {
        "type": "keyword"
      },
      "price": {
        "type": "float"
      },
      "inStock": {
        "type": "boolean"
      },
      "tags": {
        "type": "keyword"
      },
      "location": {
        "type": "geo_point"
      },
      "createdAt": {
        "type": "date"
      },
      "attributes": {
        "type": "nested",
        "properties": {
          "name": { "type": "keyword" },
          "value": { "type": "keyword" }
        }
      }
    }
  }
}
```

### Custom Analyzers

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete": {
          "type": "custom",
          "tokenizer": "autocomplete_tokenizer",
          "filter": ["lowercase", "asciifolding"]
        },
        "autocomplete_search": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      },
      "tokenizer": {
        "autocomplete_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  }
}
```

---

## Query Patterns

### Full-Text Search

```typescript
// Multi-match query
const searchQuery = {
  query: {
    bool: {
      must: [
        {
          multi_match: {
            query: searchTerm,
            fields: [
              'name^3',           // Boost name matches
              'name.autocomplete',
              'description',
              'tags^2'
            ],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        }
      ],
      filter: [
        { term: { inStock: true } },
        { range: { price: { gte: minPrice, lte: maxPrice } } }
      ]
    }
  },
  highlight: {
    fields: {
      name: {},
      description: { fragment_size: 150 }
    }
  }
};
```

### Faceted Search

```typescript
const facetedQuery = {
  query: {
    bool: {
      must: [{ match: { description: searchTerm } }],
      filter: filters
    }
  },
  aggs: {
    categories: {
      terms: {
        field: 'category',
        size: 20
      }
    },
    brands: {
      terms: {
        field: 'brand',
        size: 20
      }
    },
    price_ranges: {
      range: {
        field: 'price',
        ranges: [
          { to: 25 },
          { from: 25, to: 50 },
          { from: 50, to: 100 },
          { from: 100 }
        ]
      }
    },
    avg_price: {
      avg: { field: 'price' }
    }
  }
};
```

### Autocomplete

```typescript
const autocompleteQuery = {
  query: {
    bool: {
      should: [
        {
          match: {
            'name.autocomplete': {
              query: prefix,
              operator: 'and'
            }
          }
        },
        {
          prefix: {
            'name.keyword': {
              value: prefix,
              boost: 2
            }
          }
        }
      ]
    }
  },
  size: 10,
  _source: ['id', 'name', 'category']
};
```

### Geospatial Search

```typescript
const geoQuery = {
  query: {
    bool: {
      must: { match_all: {} },
      filter: {
        geo_distance: {
          distance: '10km',
          location: {
            lat: 40.7128,
            lon: -74.0060
          }
        }
      }
    }
  },
  sort: [
    {
      _geo_distance: {
        location: { lat: 40.7128, lon: -74.0060 },
        order: 'asc',
        unit: 'km'
      }
    }
  ]
};
```

---

## Indexing Strategies

### Real-Time Indexing

```typescript
class SearchIndexer {
  constructor(
    private esClient: ElasticsearchClient,
    private index: string
  ) {}

  async indexDocument(doc: Document): Promise<void> {
    await this.esClient.index({
      index: this.index,
      id: doc.id,
      body: this.transformForSearch(doc),
      refresh: 'false' // Don't wait for refresh
    });
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    await this.esClient.update({
      index: this.index,
      id: id,
      body: { doc: updates }
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.esClient.delete({
      index: this.index,
      id: id
    });
  }
}
```

### Bulk Indexing

```typescript
class BulkIndexer {
  private buffer: Document[] = [];
  private readonly batchSize = 1000;

  async add(doc: Document): Promise<void> {
    this.buffer.push(doc);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const body = this.buffer.flatMap(doc => [
      { index: { _index: this.index, _id: doc.id } },
      this.transformForSearch(doc)
    ]);

    const response = await this.esClient.bulk({ body });

    if (response.errors) {
      const errors = response.items.filter(item => item.index?.error);
      this.handleErrors(errors);
    }

    this.buffer = [];
  }
}
```

### Index Lifecycle Management

```json
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "7d"
          },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 },
          "set_priority": { "priority": 50 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "set_priority": { "priority": 0 }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

---

## Performance Optimization

### Query Optimization

```typescript
// Use filter context for non-scoring queries
const optimizedQuery = {
  query: {
    bool: {
      must: [
        // Only this affects scoring
        { match: { description: searchTerm } }
      ],
      filter: [
        // These don't affect scoring, can be cached
        { term: { status: 'active' } },
        { range: { createdAt: { gte: 'now-7d' } } },
        { terms: { category: ['electronics', 'computers'] } }
      ]
    }
  },
  // Limit returned fields
  _source: ['id', 'name', 'price', 'image'],
  // Limit results
  size: 20,
  // Track total hits approximately for large results
  track_total_hits: 10000
};
```

### Shard Strategy

```markdown
## Sharding Guidelines

**Primary Shards**: Set at index creation, cannot change

| Data Size | Shards | Rationale |
|-----------|--------|-----------|
| <10GB | 1 | Avoid overhead |
| 10-50GB | 2-3 | Balance distribution |
| 50-200GB | 5-10 | Parallelism |
| >200GB | Calculate: size/50GB | Optimal shard size ~50GB |

**Replicas**: Can change anytime
- Production: 1-2 replicas
- High availability: 2+ replicas
- Read-heavy: More replicas
```

### Caching

```typescript
// Request cache (for aggregations)
const cachedQuery = {
  query: { /* ... */ },
  aggs: { /* ... */ },
  request_cache: true
};

// Field data cache (for sorting/aggregations)
// Configure in index settings
{
  "settings": {
    "index.fielddata.cache": "node"
  }
}
```

---

## Relevance Tuning

### Boosting Strategies

```typescript
const relevantQuery = {
  query: {
    function_score: {
      query: {
        bool: {
          must: [{ match: { name: searchTerm } }]
        }
      },
      functions: [
        // Boost recent items
        {
          gauss: {
            createdAt: {
              origin: 'now',
              scale: '30d',
              decay: 0.5
            }
          },
          weight: 2
        },
        // Boost popular items
        {
          field_value_factor: {
            field: 'popularity',
            factor: 1.2,
            modifier: 'log1p',
            missing: 1
          }
        },
        // Boost in-stock items
        {
          filter: { term: { inStock: true } },
          weight: 3
        }
      ],
      score_mode: 'sum',
      boost_mode: 'multiply'
    }
  }
};
```

### Synonyms

```json
{
  "settings": {
    "analysis": {
      "filter": {
        "synonym_filter": {
          "type": "synonym",
          "synonyms": [
            "laptop, notebook, portable computer",
            "phone, mobile, smartphone, cell phone",
            "tv, television, monitor, display"
          ]
        }
      },
      "analyzer": {
        "synonym_analyzer": {
          "tokenizer": "standard",
          "filter": ["lowercase", "synonym_filter"]
        }
      }
    }
  }
}
```

---

## Log Analytics Pattern

### Log Index Template

```json
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs-policy"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "level": { "type": "keyword" },
        "message": { "type": "text" },
        "service": { "type": "keyword" },
        "traceId": { "type": "keyword" },
        "spanId": { "type": "keyword" },
        "userId": { "type": "keyword" },
        "metadata": { "type": "object", "enabled": false }
      }
    }
  }
}
```

### Log Query Examples

```typescript
// Error analysis
const errorQuery = {
  query: {
    bool: {
      must: [
        { term: { level: 'error' } },
        { range: { '@timestamp': { gte: 'now-1h' } } }
      ]
    }
  },
  aggs: {
    errors_by_service: {
      terms: { field: 'service' }
    },
    error_timeline: {
      date_histogram: {
        field: '@timestamp',
        calendar_interval: '5m'
      }
    }
  }
};

// Trace search
const traceQuery = {
  query: {
    term: { traceId: 'abc123' }
  },
  sort: [{ '@timestamp': 'asc' }]
};
```

---

## Design Document Template

```markdown
# Search Design - [Feature/Module]

## 1. Overview
- Purpose: [What search functionality is needed]
- Data source: [Where data comes from]
- Query patterns: [Full-text / Faceted / Geo / Analytics]

## 2. Technology Selection
- Engine: [Elasticsearch / OpenSearch / Algolia]
- Deployment: [Managed / Self-hosted]
- Cluster size: [Nodes, shards, replicas]

## 3. Index Design
```json
// Index mapping
```

## 4. Query Patterns
| Query Type | Use Case | Performance Target |
|------------|----------|-------------------|
| [type] | [use case] | [latency] |

## 5. Indexing Strategy
- Method: [Real-time / Batch / Hybrid]
- Sync mechanism: [CDC / Events / Polling]

## 6. Relevance Tuning
- Boosting rules: [field weights, recency, popularity]
- Synonyms: [configured / file-based]

## 7. Performance
- Expected QPS: [queries per second]
- Latency SLO: [P50, P99]
- Index size: [documents, GB]

## 8. Cost Estimate
| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| Cluster | [nodes x size] | $X |
| Storage | [GB] | $X |
```

---

## References

- Database Design: `rules/construction/database-design.md`
- Vector Database Design: `rules/construction/vector-database-design.md`
- Caching Design: `rules/construction/caching-design.md`
- Observability Design: `rules/construction/observability-design.md`
