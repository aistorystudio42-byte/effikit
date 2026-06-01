<!-- @keywords: architecture diagrams, C4 model, system design, component diagram, sequence diagram, Mermaid -->

# Architecture — Diagrams and Visual Documentation

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to diagrams.

## Principles

### Level 1: System Context Diagram
```mermaid
graph TD
    User[👤 Customer\n Web Browser / Mobile]
    Admin[👤 Admin\n Dashboard]
    System[🖥️ MyApp\n E-commerce Platform]
    Email[📧 Email Service\n SendGrid]
    Payment[💳 Payment Gateway\n Stripe]
    Analytics[📊 Analytics\n Mixpanel]

    User -->|Browse, order, pay| System
    Admin -->|Manage products, orders| System
    System -->|Send emails| Email
    System -->|Process payments| Payment
    System -->|Track events| Analytics
```

---

### Level 2: Container Diagram
```mermaid
graph TD
    subgraph "Customer's Browser"
        SPA[React SPA]
    end

    subgraph "MyApp System"
        API[API Server\n Node.js / Express\n Port 3000]
        Worker[Background Worker\n BullMQ]
        DB[(PostgreSQL\n Primary Data Store)]
        Cache[(Redis\n Cache + Queue)]
        CDN[Static Assets\n S3 + CloudFront]
    end

    subgraph "External Services"
        Stripe[Stripe API]
        SendGrid[SendGrid API]
    end

    SPA -->|HTTPS + JSON| API
    API -->|Read/Write| DB
    API -->|Cache, Queue jobs| Cache
    Worker -->|Read queue| Cache
    Worker -->|Update records| DB
    Worker -->|Send emails| SendGrid
    API -->|Charge payments| Stripe
    SPA -->|Load assets| CDN
```

---

### Level 3: Component Diagram (API Server)
```mermaid
graph TD
    subgraph "API Server"
        Router[Express Router\n Route definitions]
        Auth[Auth Middleware\n JWT validation]
        Controllers[Controllers\n HTTP handling]
        Services[Services\n Business logic]
        Repos[Repositories\n Data access]
        EventBus[Event Bus\n Domain events]
    end

    DB[(PostgreSQL)]
    Redis[(Redis)]

    Router --> Auth
    Auth --> Controllers
    Controllers --> Services
    Services --> Repos
    Services --> EventBus
    Repos --> DB
    EventBus --> Redis
```

---

### Sequence Diagrams — Request Flows
```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthMiddleware
    participant OrderService
    participant PaymentService
    participant DB
    participant Queue

    Client->>API: POST /api/orders {items, paymentMethod}
    API->>AuthMiddleware: validate JWT
    AuthMiddleware-->>API: user context
    API->>OrderService: createOrder(dto)
    OrderService->>DB: validate product availability
    DB-->>OrderService: stock OK
    OrderService->>PaymentService: charge(amount, paymentMethod)
    PaymentService-->>OrderService: payment confirmed
    OrderService->>DB: insert order record
    OrderService->>Queue: enqueue(send-confirmation-email)
    OrderService-->>API: Order{id, status: "confirmed"}
    API-->>Client: 201 Created, Location: /api/orders/123

    Note over Queue: Async — after response sent
    Queue->>EmailWorker: process job
    EmailWorker-->>Customer: confirmation email
```

---

### State Machine Diagrams
```mermaid
stateDiagram-v2
    [*] --> pending: Order created
    pending --> processing: Payment confirmed
    pending --> cancelled: User cancelled / payment failed
    processing --> shipped: Warehouse dispatched
    processing --> cancelled: Cancelled before shipment
    shipped --> delivered: Carrier confirmed delivery
    shipped --> returned: User initiated return
    delivered --> returned: User initiated return (within 30 days)
    returned --> refunded: Refund processed
    cancelled --> [*]
    refunded --> [*]
    delivered --> [*]
```

---

### Data Flow Diagrams
```mermaid
flowchart LR
    subgraph "Data Sources"
        API[API Requests]
        Events[Domain Events]
        Webhooks[External Webhooks]
    end

    subgraph "Processing"
        Queue[Job Queue\nRedis/BullMQ]
        Workers[Worker Processes]
    end

    subgraph "Storage"
        DB[(PostgreSQL\nSource of Truth)]
        Search[(Elasticsearch\nSearch Index)]
        Analytics[(ClickHouse\nAnalytics)]
    end

    API --> DB
    API --> Queue
    Events --> Queue
    Webhooks --> Queue
    Queue --> Workers
    Workers --> DB
    DB --> Search
    DB --> Analytics
```

---

### Diagram Guidelines
```
When to create a diagram:
  ✓ Onboarding new team members
  ✓ Explaining a complex flow to stakeholders
  ✓ Designing a new feature before implementation
  ✓ Post-incident: documenting what happened

When NOT to create a diagram:
  ✗ To document something that code and tests already express clearly
  ✗ When it will be outdated before it's used

Keeping diagrams current:
  - Store diagrams as code (Mermaid, PlantUML) in the repo
  - Treat diagram updates as required part of feature PRs
  - Delete diagrams that are outdated and not worth maintaining

Level of detail:
  - System context: non-technical stakeholders can read it
  - Container: senior developers and architects
  - Component: developers working in that area
  - Sequence: developers debugging a specific flow
```

---

### Diagram Tools
```
Mermaid    → Text-based, renders in GitHub/GitLab, ideal for repos
PlantUML   → More diagram types, needs Java runtime
Excalidraw → Hand-drawn style, good for whiteboard sessions
Lucidchart → Professional, great for stakeholder presentations
draw.io    → Free, broad format support
C4 DSL     → Purpose-built for C4 model (Structurizr)
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

The C4 model provides a hierarchy of diagrams, each addressing a different audience.

```
Level 1: System Context  → "What does the system do and who uses it?"
Level 2: Container       → "What are the deployable pieces?"
Level 3: Component       → "What are the major structural blocks?"
Level 4: Code            → "How is a component structured?" (rarely needed)
```

---

- [ ] System context diagram exists (how system fits in the world)
- [ ] Container diagram exists (deployable pieces and relationships)
- [ ] Sequence diagram for every critical user journey
- [ ] State machine diagram for any multi-state domain object
- [ ] Diagrams stored as code in the repository (not image files)
- [ ] Diagrams reviewed as part of architecture changes
- [ ] Outdated diagrams removed (stale docs are worse than no docs)
