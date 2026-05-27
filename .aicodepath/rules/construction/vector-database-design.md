# Vector Database Design

**Purpose**: Design vector storage and retrieval systems for AI/ML features, semantic search, and RAG applications

**When to Use**: Any feature requiring similarity search, embeddings, recommendations, or RAG pipelines

---

## Overview

Vector database design defines how the application stores, indexes, and queries high-dimensional vector embeddings. This is essential for AI-powered features like semantic search, recommendations, and Retrieval-Augmented Generation (RAG).

---

## Provider Selection Matrix

### Managed Services

| Provider | Scale | Latency | Best For | Monthly Cost (1M vectors) |
|----------|-------|---------|----------|---------------------------|
| Pinecone | Any | <50ms | Production RAG, managed | $70-300 |
| Weaviate Cloud | Large | <50ms | Hybrid search, GraphQL | $100-400 |
| Qdrant Cloud | Large | <20ms | High performance, filtering | $50-200 |
| MongoDB Atlas | Medium | <100ms | Existing MongoDB users | $100-300 |
| Elastic Cloud | Large | <50ms | Existing ELK users | $150-500 |

### Self-Hosted Options

| Provider | Scale | Latency | Best For | Complexity |
|----------|-------|---------|----------|------------|
| pgvector | <1M | <100ms | Small scale, existing Postgres | Low |
| Qdrant | Billions | <20ms | Performance-critical | Medium |
| Milvus | Billions | <20ms | Large scale, distributed | High |
| Weaviate | Large | <50ms | Hybrid search | Medium |
| Chroma | Small | Variable | Prototyping, development | Low |

### Selection Decision Tree

```markdown
## Vector Database Selection

**Scale**: [<100K / 100K-1M / 1M-100M / >100M vectors]
**Existing Database**: [Postgres / MongoDB / Elasticsearch / None]
**Budget Priority**: [Cost / Performance / Simplicity]
**Self-hosted OK**: [Yes / No]

**Decision Path**:
1. If <1M vectors AND have Postgres → pgvector
2. If need managed AND production → Pinecone or Weaviate Cloud
3. If self-hosted AND large scale → Qdrant or Milvus
4. If prototyping → Chroma
5. If hybrid search critical → Weaviate
```

---

## Embedding Model Selection

### Model Comparison

| Model | Dimensions | Context | Quality | Speed | Cost |
|-------|-----------|---------|---------|-------|------|
| OpenAI text-embedding-3-large | 3072 | 8K | Excellent | Fast | $$$ |
| OpenAI text-embedding-3-small | 1536 | 8K | Good | Fast | $$ |
| Cohere embed-v3 | 1024 | 512 | Excellent | Fast | $$ |
| Voyage AI | 1024 | 16K | Excellent | Fast | $$ |
| BGE-large-en | 1024 | 512 | Good | Medium | Free |
| E5-large-v2 | 1024 | 512 | Good | Medium | Free |
| all-MiniLM-L6 | 384 | 256 | Fair | Fast | Free |

### Embedding Strategy

```markdown
## Embedding Configuration

**Primary Model**: [model name]
**Dimensions**: [768/1024/1536/3072]
**Batch Size**: [32/64/128]
**Rate Limit**: [requests per minute]

**Fallback Strategy**:
1. Primary: OpenAI text-embedding-3-small
2. Fallback: Local E5-large-v2
3. Cache: Redis with 24h TTL
```

---

## Schema Design

### Collection/Index Structure

```typescript
interface VectorDocument {
  // Unique identifier
  id: string;

  // Vector embedding
  vector: number[]; // dimensions: 1536

  // Metadata for filtering
  metadata: {
    source: string;           // document source
    type: 'article' | 'faq' | 'manual';
    category: string;
    language: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId?: string;        // multi-tenant
  };

  // Original content (optional, for retrieval)
  content?: {
    text: string;
    title?: string;
    url?: string;
  };
}
```

### Multi-Tenant Design

```markdown
## Multi-Tenancy Strategy

**Approach**: [Namespace / Metadata Filter / Separate Collections]

**Namespace (Recommended for <1000 tenants)**:
- Collection: `documents`
- Namespace: `tenant_{tenant_id}`
- Query includes namespace filter

**Metadata Filter (Simple)**:
- Collection: `documents`
- Filter: `metadata.tenantId == tenant_id`
- Requires efficient filtering

**Separate Collections (High isolation)**:
- Collection: `documents_{tenant_id}`
- Complete isolation
- Higher management overhead
```

---

## Indexing Strategies

### Index Algorithm Selection

| Algorithm | Build Time | Query Time | Memory | Best For |
|-----------|-----------|------------|--------|----------|
| HNSW | Slow | Very Fast | High | Production, accuracy |
| IVF | Fast | Fast | Medium | Large scale, cost |
| PQ | Very Fast | Medium | Low | Memory constrained |
| Flat | None | Slow | Low | Small datasets |

### HNSW Configuration

```json
{
  "index_type": "HNSW",
  "metric_type": "COSINE",
  "params": {
    "M": 16,              // connections per node (8-64)
    "efConstruction": 200, // build quality (100-500)
    "efSearch": 100        // query quality (50-500)
  }
}
```

### Quantization for Scale

```markdown
## Quantization Strategy

**Scalar Quantization (SQ)**:
- Reduces 4 bytes → 1 byte per dimension
- ~25% memory reduction
- Minimal accuracy loss

**Product Quantization (PQ)**:
- Reduces 4 bytes → 0.5-1 byte per dimension
- ~75% memory reduction
- Some accuracy loss

**Binary Quantization**:
- Reduces to 1 bit per dimension
- ~97% memory reduction
- Significant accuracy loss
- Good for initial filtering
```

---

## Chunking Strategies

### Chunking Methods

| Method | Chunk Size | Overlap | Best For |
|--------|-----------|---------|----------|
| Fixed Size | 500-1000 tokens | 50-100 | General purpose |
| Semantic | Variable | None | High quality |
| Sentence | 3-5 sentences | 1 sentence | Conversational |
| Paragraph | Natural breaks | None | Structured docs |
| Recursive | Variable | 10-20% | Complex documents |

### Chunking Configuration

```typescript
interface ChunkingConfig {
  method: 'fixed' | 'semantic' | 'recursive';
  chunkSize: number;      // target tokens
  chunkOverlap: number;   // overlap tokens
  separators: string[];   // split points
  metadata: {
    includePosition: boolean;
    includeParent: boolean;
    includeNeighbors: boolean;
  };
}

const config: ChunkingConfig = {
  method: 'recursive',
  chunkSize: 512,
  chunkOverlap: 50,
  separators: ['\n\n', '\n', '. ', ' '],
  metadata: {
    includePosition: true,
    includeParent: true,
    includeNeighbors: false
  }
};
```

---

## RAG Pipeline Design

### Basic RAG Architecture

```
User Query
    │
    ▼
Query Preprocessing
    │ (expansion, rewriting)
    ▼
Embedding Generation
    │
    ▼
Vector Search (top-k)
    │
    ▼
Reranking (optional)
    │
    ▼
Context Assembly
    │
    ▼
LLM Generation
    │
    ▼
Response
```

### Retrieval Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| Similarity | Top-k by cosine similarity | Default, general use |
| MMR | Maximum Marginal Relevance | Avoid redundancy |
| Hybrid | Vector + keyword (BM25) | Technical content |
| Multi-query | Multiple query variations | Complex questions |
| Self-query | LLM generates filters | Structured data |

### Hybrid Search Configuration

```typescript
interface HybridSearchConfig {
  vectorWeight: number;    // 0.0 - 1.0
  keywordWeight: number;   // 0.0 - 1.0
  algorithm: 'rrf' | 'linear';  // Reciprocal Rank Fusion
  keywordFields: string[];
  vectorField: string;
}

const config: HybridSearchConfig = {
  vectorWeight: 0.7,
  keywordWeight: 0.3,
  algorithm: 'rrf',
  keywordFields: ['content', 'title'],
  vectorField: 'embedding'
};
```

---

## Query Optimization

### Query Preprocessing

```typescript
interface QueryPreprocessor {
  // Expand query with synonyms
  expandQuery(query: string): string[];

  // Rewrite for better retrieval
  rewriteQuery(query: string): string;

  // Generate hypothetical document (HyDE)
  generateHypothetical(query: string): string;

  // Extract filters from natural language
  extractFilters(query: string): FilterCondition[];
}
```

### Reranking

```typescript
interface RerankerConfig {
  model: 'cohere' | 'cross-encoder' | 'colbert';
  topN: number;           // rerank top N results
  returnTopK: number;     // return top K after rerank
}

// Reranking improves precision at cost of latency
const reranker: RerankerConfig = {
  model: 'cohere',
  topN: 50,
  returnTopK: 10
};
```

---

## Caching Strategy

### Multi-Layer Cache

```markdown
## Caching Architecture

**Layer 1: Query Cache**
- Key: hash(query + filters)
- TTL: 1 hour
- Storage: Redis

**Layer 2: Embedding Cache**
- Key: hash(text)
- TTL: 24 hours
- Storage: Redis

**Layer 3: Result Cache**
- Key: hash(query + context)
- TTL: 15 minutes
- Storage: Redis
```

### Cache Implementation

```typescript
interface CacheConfig {
  queryCache: {
    enabled: boolean;
    ttlSeconds: number;
    maxSize: number;
  };
  embeddingCache: {
    enabled: boolean;
    ttlSeconds: number;
    maxSize: number;
  };
}
```

---

## Monitoring and Evaluation

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Query latency P50 | <100ms | >200ms |
| Query latency P99 | <500ms | >1000ms |
| Retrieval precision | >0.8 | <0.6 |
| Index freshness | <5min | >30min |
| Error rate | <0.1% | >1% |

### Evaluation Metrics

```typescript
interface RAGEvaluation {
  // Retrieval metrics
  precision: number;      // relevant / retrieved
  recall: number;         // relevant retrieved / total relevant
  mrr: number;            // Mean Reciprocal Rank
  ndcg: number;           // Normalized DCG

  // Generation metrics
  faithfulness: number;   // factual consistency
  relevance: number;      // answer relevance
  groundedness: number;   // grounded in context
}
```

---

## Design Document Template

```markdown
# Vector Database Design - [Feature/Module]

## 1. Overview
- Purpose: [What AI/search features enabled]
- Data volume: [Number of documents/vectors]
- Query patterns: [Semantic search / RAG / Recommendations]

## 2. Provider Selection
- Selected: [Provider name]
- Rationale: [Why this provider]
- Fallback: [Backup option if any]

## 3. Embedding Configuration
| Aspect | Configuration |
|--------|---------------|
| Model | [embedding model] |
| Dimensions | [768/1024/1536] |
| Batch size | [32/64/128] |

## 4. Schema Design
```typescript
// Collection schema
```

## 5. Chunking Strategy
- Method: [fixed/semantic/recursive]
- Chunk size: [tokens]
- Overlap: [tokens]

## 6. Index Configuration
- Algorithm: [HNSW/IVF/PQ]
- Metric: [cosine/dot/euclidean]
- Parameters: [M, ef, etc.]

## 7. RAG Pipeline (if applicable)
- Retrieval: [similarity/hybrid/mmr]
- Reranking: [yes/no, model]
- Context window: [tokens]

## 8. Cost Estimate
| Component | Monthly Cost |
|-----------|--------------|
| Vector storage | $X |
| Embedding API | $X |
| Query costs | $X |

## 9. Monitoring
- Latency SLO: [P50, P99]
- Quality metrics: [precision, recall]
```

---

## References

- Database Design: `rules/construction/database-design.md`
- NoSQL Design: `rules/construction/nosql-design.md`
- AI Implementation: `rules/construction/ai-implementation.md`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
