# Diagram Templates Reference

Complete Mermaid templates for each supported diagram type.

## 1. Flowchart

**Best for**: Process flows, decision trees, algorithms, user journeys.

```mermaid
flowchart TD
    Start([Start]) --> Input[/User Input/]
    Input --> Validate{Valid?}
    Validate -->|Yes| Process[Process Data]
    Validate -->|No| Error[Show Error]
    Error --> Input
    Process --> Store[(Database)]
    Store --> End([End])
```

**Best Practices**:
- Use `([text])` for start/end (stadium shape)
- Use `{text}` for decisions (diamond)
- Use `[(text)]` for database (cylinder)
- Use `[/text/]` for input/output (parallelogram)
- Keep flows left-to-right or top-to-bottom
- Group related nodes with subgraphs
- Max 15-20 nodes for readability

**Anti-patterns**: Crossing lines (reorganize nodes), too many decision branches, mixing horizontal and vertical flows.

---

## 2. Sequence Diagram

**Best for**: API interactions, service communication, user workflows.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant A as API Gateway
    participant S as Auth Service
    participant D as Database

    U->>+A: POST /login
    A->>+S: Validate credentials
    S->>+D: Query user
    D-->>-S: User data
    S-->>-A: JWT token
    A-->>-U: 200 OK + token

    Note over U,A: Token stored in httpOnly cookie
```

**Best Practices**:
- Use `autonumber` for step numbering
- Use `participant` aliases for long names
- `->>` for requests, `-->>` for responses
- `+/-` for activation/deactivation
- Add `Note over` for important context
- Keep to 5-7 participants max
- Show error paths with `alt/else`

Error path pattern:
```mermaid
sequenceDiagram
    alt Success
        A->>B: Request
        B-->>A: 200 OK
    else Failure
        A->>B: Request
        B-->>A: 400 Error
    end
```

---

## 3. Class Diagram

**Best for**: Domain models, OOP design, type relationships.

```mermaid
classDiagram
    class User {
        +String id
        +String email
        +String passwordHash
        +DateTime createdAt
        +login(password) bool
        +updateProfile(data) void
    }

    class Order {
        +String id
        +User customer
        +OrderItem[] items
        +Decimal total
        +OrderStatus status
        +calculateTotal() Decimal
    }

    class OrderItem {
        +Product product
        +int quantity
        +Decimal unitPrice
    }

    User "1" --> "*" Order : places
    Order "1" *-- "*" OrderItem : contains
```

**Relationship notation**:
- `-->` association
- `--*` composition
- `--o` aggregation
- `--|>` inheritance
- `..|>` implementation
- Add cardinality: `"1"`, `"*"`, `"0..1"`

**Visibility**: `+` public, `-` private, `#` protected. Include key methods only, not all methods.

---

## 4. Entity Relationship Diagram (ERD)

**Best for**: Database schema, data modeling, table relationships.

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        uuid id PK
        string email UK
        string password_hash
        timestamp created_at
        timestamp updated_at
    }

    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        uuid id PK
        uuid user_id FK
        decimal total
        enum status
        timestamp created_at
    }

    ORDER_ITEM }|--|| PRODUCT : references
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }

    PRODUCT {
        uuid id PK
        string name
        text description
        decimal price
        int stock
    }
```

**Relationship notation**:
- `||--||` one-to-one
- `||--o{` one-to-many (optional)
- `||--|{` one-to-many (required)
- `}|--|{` many-to-many

**Best Practices**: Mark `PK`/`FK`/`UK`, include data types, show only important columns.

---

## 5. State Diagram

**Best for**: Finite state machines, order status, workflow states.

```mermaid
stateDiagram-v2
    [*] --> Draft

    Draft --> Submitted: submit()
    Draft --> Cancelled: cancel()

    Submitted --> UnderReview: assign_reviewer()
    Submitted --> Cancelled: cancel()

    UnderReview --> Approved: approve()
    UnderReview --> Rejected: reject()
    UnderReview --> Submitted: request_changes()

    Approved --> Published: publish()

    Rejected --> Draft: revise()

    Cancelled --> [*]
    Published --> [*]

    note right of UnderReview
        Reviewer has 5 days
        to complete review
    end note
```

**Best Practices**: Use `[*]` for start/end states, label transitions with action names, add notes for business rules, keep to 7-10 states max, show all valid transitions.

---

## 6. C4 Context Diagram

**Best for**: System boundaries, external actors, high-level architecture.

```mermaid
C4Context
    title System Context Diagram - E-Commerce Platform

    Person(customer, "Customer", "A user who shops online")
    Person(admin, "Admin", "Manages products and orders")

    System(ecommerce, "E-Commerce Platform", "Allows customers to browse and purchase products")

    System_Ext(payment, "Payment Gateway", "Processes payments")
    System_Ext(shipping, "Shipping Provider", "Handles delivery")
    System_Ext(email, "Email Service", "Sends notifications")

    Rel(customer, ecommerce, "Browses, purchases")
    Rel(admin, ecommerce, "Manages")
    Rel(ecommerce, payment, "Processes payments")
    Rel(ecommerce, shipping, "Creates shipments")
    Rel(ecommerce, email, "Sends emails")
```

**Best Practices**: Focus on WHAT not HOW, show external systems and actors, use verb labels for relationships, limit to 5-10 elements.

---

## 7. C4 Container Diagram

**Best for**: Service architecture, deployment units, technology choices.

```mermaid
C4Container
    title Container Diagram - E-Commerce Platform

    Person(customer, "Customer", "A user who shops online")

    Container_Boundary(ecommerce, "E-Commerce Platform") {
        Container(web, "Web App", "React", "Customer-facing UI")
        Container(api, "API", "Node.js", "REST API")
        Container(worker, "Worker", "Node.js", "Background jobs")
        ContainerDb(db, "Database", "PostgreSQL", "Stores orders, products")
        ContainerDb(cache, "Cache", "Redis", "Session, hot data")
        Container(queue, "Queue", "RabbitMQ", "Async processing")
    }

    System_Ext(payment, "Payment Gateway")

    Rel(customer, web, "Uses", "HTTPS")
    Rel(web, api, "Calls", "HTTPS/JSON")
    Rel(api, db, "Reads/Writes", "TCP")
    Rel(api, cache, "Caches", "TCP")
    Rel(api, queue, "Publishes", "AMQP")
    Rel(worker, queue, "Consumes", "AMQP")
    Rel(api, payment, "Processes", "HTTPS")
```

**Best Practices**: Show technology choices in descriptions, include data stores explicitly, label protocols on relationships, show async paths (queues, workers).

---

## 8. Git Graph

**Best for**: Branching strategy, release flow, merge history.

```mermaid
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Feature A"
    branch feature/auth
    checkout feature/auth
    commit id: "Add login"
    commit id: "Add register"
    checkout develop
    merge feature/auth
    commit id: "Feature B"
    checkout main
    merge develop tag: "v1.0.0"
    checkout develop
    commit id: "Feature C"
```

**Best Practices**: Show standard branches (main, develop, feature), use meaningful commit IDs, tag releases, keep history linear where possible.

---

## 9. Gantt Chart

**Best for**: Project timelines, sprint planning, milestones.

```mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1 - Foundation
        Requirements    :a1, 2026-02-01, 5d
        Design          :a2, after a1, 7d
        Database setup  :a3, after a2, 3d
    section Phase 2 - Development
        API development :b1, after a3, 14d
        Frontend        :b2, after a3, 14d
        Integration     :b3, after b1 b2, 5d
    section Phase 3 - Launch
        Testing         :c1, after b3, 7d
        Deployment      :milestone, c2, after c1, 1d
```

**Best Practices**: Use sections for phases, define dependencies with `after`, include milestones, keep to 2-4 week sprints for readability.

---

## 10. Pie Chart

**Best for**: Distribution, composition, percentages.

```mermaid
pie showData
    title Error Distribution
    "4xx Client Errors" : 45
    "5xx Server Errors" : 15
    "Timeouts" : 25
    "Network Errors" : 15
```

**Best Practices**: Use for 3-7 categories, order by size (largest first), use `showData` to display percentages, keep labels short.
