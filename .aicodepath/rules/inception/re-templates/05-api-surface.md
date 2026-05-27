# API Surface — RE Template

## Route Gate

**Included in routes**:
- `greenfield`: SKIP — no existing codebase to analyze
- `brownfield-shallow`: INCLUDE
- `brownfield-deep`: INCLUDE

If `re_route` = `greenfield`: stop here, do not generate this document.

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

Output file: `aicodepath-docs/inception/reverse-engineering/05-api-surface.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__search_entities` and `mcp__aicodepath-code-graph__callers_of` are available, call:

```
mcp__aicodepath-code-graph__search_entities(query="route endpoint handler get post put patch delete", entity_type=None, limit=20)
mcp__aicodepath-code-graph__search_entities(query="controller router api view", limit=20)
mcp__aicodepath-code-graph__callers_of(qualified_name="<router or app module>", max_depth=1)
```

Use results to enumerate all HTTP endpoints, their handlers, and which services/modules they invoke.

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: API Style and Protocol [DATA SOURCE: llm-only]

Identify the API style(s) in use:
- **REST**: route files with HTTP method decorators or `router.get/post/put/delete` patterns
- **GraphQL**: presence of `schema.graphql`, `typeDefs`, `resolvers`, `graphene`, `strawberry`, `apollo-server`
- **gRPC**: `.proto` files, `grpc` package imports, `stub` patterns
- **WebSocket**: `ws://`, `socket.io`, `websockets` package, `@WebSocketGateway`
- **CLI**: `click`, `argparse`, `cobra`, `clap` — command-line interface surface
- **Event-driven**: message consumer/producer handlers (Kafka, SQS, RabbitMQ consumers)

State each protocol found with file evidence.

---

#### Section 2: HTTP Endpoint Inventory [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities` results targeting route/endpoint entities, extract all HTTP endpoints. For each, attempt to call `callers_of` to determine which services/handlers process the request.

**LLM-only path**: Scan route definition files (identified by names like `routes.py`, `router.ts`, `routes.rb`, `urls.py`, `api.go`). Extract all route definitions using pattern: `@app.route`, `router.get(`, `Route::get(`, `@Get(`, `mux.Handle(`.

For each endpoint found, record:
| Method | Path | Handler Function | Auth Required | Notes |
|--------|------|-----------------|---------------|-------|

Group endpoints by resource (e.g., `/users/*`, `/orders/*`, `/products/*`).

---

#### Section 3: Request/Response Contracts [DATA SOURCE: llm-only]

For the 5–10 most significant endpoints (prioritize write operations and complex reads), document:

```
**[METHOD] /path/to/endpoint**
- Handler: <function name>
- Request body: <fields and types, from schema/validator/serializer>
- Path params: <list>
- Query params: <list>
- Response: <shape on success, shape on error>
- Auth: <required auth mechanism>
- Side effects: <what changes in the system>
```

Derive request/response shapes from: Pydantic models, Zod schemas, JSON Schema validators, TypeScript interfaces, OpenAPI spec files (`openapi.yaml`, `swagger.json`), or by reading handler code.

---

#### Section 4: GraphQL Schema Summary [DATA SOURCE: llm-only]

If GraphQL is detected in Section 1:
- List all Query types with their return types
- List all Mutation types with their arguments and return types
- List all Subscription types
- Note any custom directives (`@auth`, `@deprecated`, `@cacheControl`)
- Identify the N+1 query risk areas (resolvers that fetch in a loop without DataLoader)

If GraphQL not detected, skip this section.

---

#### Section 5: API Versioning and Stability [DATA SOURCE: llm-only]

Identify versioning strategy:
- URL-based: `/v1/`, `/v2/` prefixes in routes
- Header-based: `Accept-Version`, `API-Version` header handling
- No versioning: single surface with no version identifier

Assess stability signals:
- Deprecated endpoints (marked with `@deprecated`, `# deprecated`, or `TODO: remove` comments)
- Experimental endpoints (feature-flagged routes)
- Breaking changes risk (endpoints with ambiguous types or no input validation)

---

#### Section 6: API Surface Risk Assessment

Evaluate:
- **Missing validation**: Endpoints that accept request bodies without schema validation
- **Missing auth**: Endpoints that appear to modify state but have no auth middleware
- **Inconsistent error handling**: Mix of error response formats across endpoints
- **Undocumented endpoints**: Endpoints with no docstring, comment, or OpenAPI annotation

Provide a prioritized list of API surface concerns for the new feature team to address.

Set `data_source` in frontmatter to `graph` if MCP entity search was used, otherwise `llm-only`.
