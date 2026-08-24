# 🛒 Voice Command Shopping Assistant

A scalable, event-driven **microservices-based shopping list application** that allows users to manage their shopping list using **natural-language voice or text commands**, search products, and receive **personalized recommendations** based on their purchase history.

The system is designed around **Docker, Kafka, Redis, MongoDB, and REST APIs**, with clear service boundaries and asynchronous communication for command processing.

---

## 📌 Problem Statement

Build a shopping list application where a user can speak or type a command such as:

> "Add two bottles of milk"

The application converts the natural-language command into a structured shopping action and updates the user's shopping list.

In addition to voice/text commands, the application provides:

* 🛒 Shopping list management
* 🔎 Product search and browsing
* 🤖 Natural-language command processing
* 🎯 Personalized recommendations
* ⚡ Event-driven communication using Kafka
* 🚀 Redis-based recommendation caching
* 🐳 Docker-based local deployment
* ☸️ Kubernetes-ready architecture

---

# 🎯 Goals

## Functional Requirements

* Accept natural-language commands and convert them into:

  * `ADD`
  * `REMOVE`
  * `COMPLETE`
* Maintain a shopping list for each user.
* Allow users to browse and search the product catalog.
* Generate personalized recommendations based on purchase history.
* Support standard CRUD operations on shopping lists independently of voice input.
* Track purchased items and update recommendation history.

## Non-Functional Requirements

* Each domain's data is owned by exactly one service.
* No shared database tables between services.
* Services should continue operating when another service is temporarily unavailable.
* Expensive recommendation calculations should be cached.
* Architecture should remain simple enough to build, run, and demonstrate within a fixed development time.
* Services should be independently deployable and scalable.

---

# 🚫 Non-Goals

The following features are intentionally outside the scope of this project:

* Authentication and authorization
* Multi-region deployment
* Multi-tenant isolation
* Formal SLA implementation
* Payment processing
* Real-time notifications
* Advanced analytics

Authentication can later be introduced at the API Gateway.

For this project, `userId` is passed directly with requests.

A product being "purchased" simply means that the shopping item has been marked as completed.

---

# 🏗️ High-Level Architecture

```text
                         ┌─────────────────────┐
                         │   React Frontend    │
                         └──────────┬──────────┘
                                    │
                              REST / JSON
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     API Gateway     │
                         │        :3000        │
                         └──────────┬──────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
       ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐
       │ Command Service│  │ Product Service│  │ Recommendation     │
       │     :3001      │  │     :3003      │  │ Service :3004      │
       └───────┬────────┘  └───────┬────────┘  └─────────┬──────────┘
               │                   │                     │
               │                   ▼                     ▼
               │               MongoDB                Redis
               │               Products               Cache
               │
               ▼
        ┌─────────────┐
        │    Kafka    │
        │   Broker    │
        └──────┬──────┘
               │
               ▼
       ┌────────────────┐
       │ Shopping       │
       │ Service :3002  │
       └───────┬────────┘
               │
               ▼
            MongoDB
          Shopping Data

Command Service
      │
      └── Claude API / Regex Fallback
```

---

# 🧩 Microservices

| Service                |   Port | Database        | Responsibility                                     |
| ---------------------- | -----: | --------------- | -------------------------------------------------- |
| API Gateway            | `3000` | None            | Single entry point and request routing             |
| Command Service        | `3001` | None            | Converts natural language into structured commands |
| Shopping Service       | `3002` | MongoDB         | Shopping list system of record                     |
| Product Service        | `3003` | MongoDB         | Product catalog and search                         |
| Recommendation Service | `3004` | MongoDB + Redis | Purchase history and recommendations               |

---

# 🔌 Service Responsibilities

## 1. API Gateway

**Port:** `3000`

The API Gateway is the single entry point for the frontend.

Responsibilities:

* Route `/api/commands` → Command Service
* Route `/api/shopping` → Shopping Service
* Route `/api/products` → Product Service
* Route `/api/recommendations` → Recommendation Service
* Central location for future:

  * Authentication
  * Authorization
  * Rate limiting
  * Request logging
  * Monitoring

---

## 2. Command Service

**Port:** `3001`

The Command Service converts natural-language input into structured shopping intents.

Example:

```text
"add two bottles of milk"
```

becomes:

```json
{
  "event": "ADD_ITEM",
  "userId": "u1",
  "item": {
    "name": "milk",
    "quantity": 2,
    "unit": "bottle"
  }
}
```

The service can use:

* Claude API for natural-language parsing
* Regex-based fallback when the LLM is unavailable

The resulting command is published to Kafka.

### Why the fallback?

The application should still be runnable without an external LLM API key.

---

# 3. Shopping Service

**Port:** `3002`

The Shopping Service is the **system of record for shopping lists**.

Responsibilities:

* Create shopping items
* Update shopping items
* Delete shopping items
* Mark items as purchased
* Consume commands from Kafka
* Publish shopping events
* Publish purchase events

---

# 4. Product Service

**Port:** `3003`

The Product Service manages the product catalog.

Responsibilities:

* Product search
* Product browsing
* Product lookup
* Category filtering
* Price filtering
* Inventory status

Example search:

```text
GET /api/products/search?q=milk&category=dairy&maxPrice=5
```

---

# 5. Recommendation Service

**Port:** `3004`

The Recommendation Service generates personalized recommendations based on purchase history.

It maintains:

* Purchase history
* Purchase frequency
* Recommendation cache

Redis is used to make repeated recommendation requests inexpensive.

---

# 🗄️ Data Model

## Shopping Database

### ShoppingItem

| Field       | Type          | Description           |
| ----------- | ------------- | --------------------- |
| `userId`    | String        | User identifier       |
| `name`      | String        | Shopping item         |
| `quantity`  | Number        | Quantity              |
| `unit`      | String / null | bottle, bag, kg, etc. |
| `purchased` | Boolean       | Purchase status       |
| `createdAt` | Timestamp     | Creation time         |
| `updatedAt` | Timestamp     | Last update           |

`userId` is indexed.

---

## Products Database

### Product

| Field      | Type          | Description      |
| ---------- | ------------- | ---------------- |
| `name`     | String        | Product name     |
| `brand`    | String / null | Brand            |
| `category` | String        | Product category |
| `price`    | Number        | Product price    |
| `inStock`  | Boolean       | Inventory status |

`category` is indexed.

---

## Recommendations Database

### PurchaseHistory

| Field     | Type   | Description        |
| --------- | ------ | ------------------ |
| `userId`  | String | User identifier    |
| `product` | String | Purchased product  |
| `count`   | Number | Purchase frequency |

A compound index is maintained on:

```text
userId + product
```

---

# ⚡ Redis Cache

Recommendation results are cached using the following key:

```text
recommendations:<userId>
```

Example value:

```json
[
  {
    "product": "Milk",
    "timesPurchased": 8
  },
  {
    "product": "Bread",
    "timesPurchased": 6
  }
]
```

TTL:

```text
10 minutes
```

The cache is also explicitly invalidated whenever a purchase event occurs.

---

# 🌐 API Design

All client requests go through:

```text
http://<host>:3000
```

---

## Commands

### Create Command

```http
POST /api/commands
```

Request:

```json
{
  "userId": "u1",
  "text": "add two bottles of milk"
}
```

Response:

```json
{
  "accepted": true,
  "parsed": {
    "event": "ADD_ITEM",
    "item": {
      "name": "milk",
      "quantity": 2,
      "unit": "bottle"
    }
  }
}
```

The endpoint returns:

```text
202 Accepted
```

because command processing is asynchronous.

---

# 🛒 Shopping List APIs

### Get Shopping List

```http
GET /api/shopping?userId=u1
```

### Create Item

```http
POST /api/shopping
```

Request:

```json
{
  "userId": "u1",
  "name": "Milk",
  "quantity": 2,
  "unit": "bottle"
}
```

### Update Item

```http
PATCH /api/shopping/:id
```

Example:

```json
{
  "purchased": true
}
```

### Delete Item

```http
DELETE /api/shopping/:id
```

---

# 🔎 Product APIs

### Search Products

```http
GET /api/products/search?q=milk&category=dairy&maxPrice=5
```

### Get Product

```http
GET /api/products/:id
```

---

# 🎯 Recommendation API

```http
GET /api/recommendations?userId=u1
```

Example response:

```json
{
  "source": "cache",
  "recommendations": [
    {
      "product": "Milk",
      "timesPurchased": 8
    },
    {
      "product": "Bread",
      "timesPurchased": 6
    }
  ]
}
```

`source` can be:

```text
cache
```

or:

```text
computed
```

---

# 📨 Event-Driven Architecture

Kafka is used for asynchronous communication between services.

## Kafka Topics

| Topic               | Producer         | Consumer               | Purpose                           |
| ------------------- | ---------------- | ---------------------- | --------------------------------- |
| `shopping.commands` | Command Service  | Shopping Service       | Process natural-language commands |
| `shopping.events`   | Shopping Service | Future consumers       | Shopping list events              |
| `purchase.events`   | Shopping Service | Recommendation Service | Update purchase history           |

---

# 🔄 Command Flow

```text
User
 │
 │ "add milk"
 ▼
React Frontend
 │
 │ POST /api/commands
 ▼
API Gateway
 │
 ▼
Command Service
 │
 │ Parse command
 │
 │ Claude / Regex
 ▼
Kafka
 │
 │ shopping.commands
 ▼
Shopping Service
 │
 │ Consume event
 ▼
MongoDB
 │
 │ Update shopping list
 ▼
Updated Shopping List
```

The important design decision is that the Command Service does **not** directly call the Shopping Service.

---

# 🚀 Why Kafka?

### Direct HTTP

```text
Command Service
      │
      │ HTTP
      ▼
Shopping Service
      │
      ▼
    MongoDB
```

If Shopping Service is unavailable, the command fails.

### Kafka

```text
Command Service
      │
      │ publish
      ▼
    Kafka
      │
      │ consume
      ▼
Shopping Service
      │
      ▼
    MongoDB
```

If Shopping Service is temporarily unavailable, Kafka retains the message until the consumer becomes available.

This provides:

* Decoupling
* Asynchronous processing
* Better failure isolation
* Backpressure
* Future extensibility
* Independent service scaling

The trade-off is that the client receives:

```text
202 Accepted
```

rather than an immediate confirmation that the database has been updated.

For a shopping list application, this small amount of eventual consistency is acceptable.

---

# 🛍️ Purchase Event Flow

When an item is marked as purchased:

```text
Shopping Service
       │
       │ ITEM_PURCHASED
       ▼
Kafka: purchase.events
       │
       ▼
Recommendation Service
       │
       ├── Update PurchaseHistory
       │
       └── Delete Redis Cache
```

The next recommendation request causes a cache miss:

```text
GET /recommendations
        │
        ▼
   Redis Cache
        │
     MISS
        │
        ▼
Purchase History
        │
        ▼
Compute Recommendations
        │
        ▼
Store in Redis
        │
        ▼
Return Recommendations
```

---

# 🧠 Recommendation Strategy

The current recommendation engine uses purchase frequency.

For example:

```text
Milk      → 8 purchases
Bread     → 6 purchases
Eggs      → 4 purchases
Butter    → 2 purchases
```

The most frequently purchased products receive higher recommendation priority.

Future versions can extend this to:

* Category preferences
* Recently purchased products
* Collaborative filtering
* Product similarity
* ML-based recommendations
* Inventory-aware recommendations
* Price sensitivity

---

# ⚡ Caching Strategy

Only recommendations are cached.

### Why?

Recommendations are:

* More computationally expensive
* Read frequently
* User-specific
* Tolerant of small amounts of staleness

Shopping list data is not cached because it should remain immediately consistent.

Product data is also served directly from MongoDB because indexed queries are inexpensive at this project's scale.

### Cache Strategy

```text
Cache Miss
    │
    ▼
Compute Recommendations
    │
    ▼
Store in Redis
    │
    ▼
Return Result
```

### Cache Hit

```text
Request
   │
   ▼
Redis
   │
   ▼
Return cached recommendations
```

### Invalidation

When a purchase occurs:

```text
purchase.events
      │
      ▼
Recommendation Service
      │
      ▼
DEL recommendations:<userId>
```

The 10-minute TTL acts as a backup mechanism.

---

# 📈 Scalability

The architecture allows individual services to scale independently.

Stateless services such as:

* API Gateway
* Command Service

can run multiple replicas.

```text
                  Load Balancer
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          Gateway   Gateway   Gateway
```

Kafka consumer groups allow multiple instances of consumers to process events in parallel.

```text
Kafka
 │
 ├── Shopping Service Instance 1
 ├── Shopping Service Instance 2
 └── Shopping Service Instance 3
```

Messages can be keyed by `userId` so events belonging to the same user remain ordered within a partition.

---

# 🛡️ Reliability

## Failure Isolation

The Product Service and Recommendation Service do not directly depend on each other.

Therefore:

```text
Recommendation Service DOWN
          │
          X
          │
Product Service
          │
          ▼
      Still Works
```

Similarly, if Shopping Service temporarily goes down, Kafka can retain commands until the consumer is available.

---

# 🔁 Idempotency

Commands contain an `eventId`.

Example:

```json
{
  "eventId": "7f6c...",
  "event": "ADD_ITEM",
  "userId": "u1",
  "item": {
    "name": "milk",
    "quantity": 2
  }
}
```

Currently, consumer-side de-duplication is a planned improvement.

The future implementation can maintain processed event IDs to prevent duplicate processing if Kafka messages are retried.

---

# 🐳 Docker Deployment

The project is designed to run locally using Docker Compose.

The complete architecture can be started with:

```bash
docker compose up --build
```

The Docker environment contains:

```text
React Frontend
API Gateway
Command Service
Shopping Service
Product Service
Recommendation Service
Kafka
Redis
MongoDB
```

---

# ☸️ Kubernetes Deployment

The architecture is also designed to be Kubernetes-ready.

A production-style deployment could contain:

```text
Kubernetes Cluster
│
├── API Gateway
│
├── Command Service
│
├── Shopping Service
│
├── Product Service
│
├── Recommendation Service
│
├── Kafka
│
├── Redis
│
└── MongoDB
```

Each application service can have its own:

```text
Deployment
Service
ConfigMap
Secret
HPA
```

Kubernetes DNS allows services to communicate using stable names such as:

```text
shopping-service:3002
```

The application code does not need major architectural changes when moving from Docker Compose to Kubernetes.

---

# 📦 Project Structure

```text
Voice-Command-Shopping/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── api-gateway/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── command-service/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── shopping-service/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── product-service/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── recommendation-service/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── README.md
└── k8s/
    ├── gateway.yaml
    ├── command-service.yaml
    ├── shopping-service.yaml
    ├── product-service.yaml
    └── recommendation-service.yaml
```

---

# 🔐 Authentication

Authentication is intentionally not implemented in the current version.

Currently:

```text
userId
```

is passed directly through the API.

In a production system:

```text
Client
  │
  ▼
API Gateway
  │
  ├── Authentication
  ├── Authorization
  ├── Rate Limiting
  └── Request Validation
          │
          ▼
      Microservices
```

The Gateway would validate the user's identity before forwarding requests.

---

# 🧪 Graceful Degradation

The system is designed so that temporary service failures have limited impact.

### Example

If Recommendation Service is unavailable:

```text
Shopping List
      │
      ▼
   Still Works
```

If Product Service is unavailable:

```text
Shopping Commands
      │
      ▼
   Still Works
```

If Shopping Service is temporarily unavailable:

```text
Command Service
      │
      ▼
    Kafka
      │
      │ message retained
      ▼
Shopping Service
```

The command can be processed when the consumer recovers.

---

# ⚖️ Architecture Trade-offs

| Decision                       | Alternative      | Reason                                                  |
| ------------------------------ | ---------------- | ------------------------------------------------------- |
| 5 services                     | Monolith         | Demonstrates service boundaries required by the project |
| 5 services                     | 10+ services     | Avoids unnecessary service fragmentation                |
| Kafka                          | Direct REST      | Provides asynchronous processing and decoupling         |
| Redis only for recommendations | Cache everything | Avoids unnecessary cache invalidation complexity        |
| MongoDB per service            | Shared database  | Preserves true service ownership                        |
| Claude + Regex fallback        | Claude only      | Keeps project runnable without an API key               |
| Docker Compose                 | Kubernetes only  | Faster development and demonstration                    |

---

# 🧱 Why Microservices?

The architecture separates independent business domains:

```text
Command Processing
       │
       ├── Natural Language
       │
       ▼
Shopping Management
       │
       ├── Shopping List
       │
       ▼
Product Catalog
       │
       ├── Search
       │
       ▼
Recommendation Engine
       │
       └── Purchase History
```

Each service owns its own data and can evolve independently.

There are no shared database tables between services.

Cross-service communication happens through:

* REST for synchronous reads
* Kafka for asynchronous events

---

# 🔮 Future Improvements

Potential future enhancements include:

* [ ] Authentication with JWT
* [ ] Role-based authorization
* [ ] WebSocket/SSE real-time shopping updates
* [ ] Kafka dead-letter topics
* [ ] Kafka consumer idempotency
* [ ] Distributed tracing
* [ ] Prometheus + Grafana monitoring
* [ ] Centralized logging
* [ ] ML-based recommendations
* [ ] Inventory-aware recommendations
* [ ] Product-service integration with recommendations
* [ ] Kubernetes Horizontal Pod Autoscaling
* [ ] MongoDB Atlas
* [ ] Managed Kafka
* [ ] Automated CI/CD pipeline
* [ ] Unit and integration testing
* [ ] API documentation with Swagger/OpenAPI

---

# 🚧 Known Gaps

### Authentication

`userId` is currently trusted from the request.

### Kafka Deduplication

`eventId` is generated but consumer-side idempotency is a planned improvement.

### Dead Letter Queue

Messages that repeatedly fail are not currently moved to a dead-letter topic.

### Real-Time Updates

The frontend currently re-fetches the shopping list after issuing a command.

WebSockets or Server-Sent Events can be added later.

### Recommendation/Product Integration

Recommendations currently use purchase history rather than real-time product inventory.

---

# 🏁 Getting Started

## Prerequisites

Install:

* Node.js
* Docker
* Docker Compose
* Git

Optional:

* Kubernetes
* Minikube
* kubectl

---

## Clone Repository

```bash
git clone https://github.com/jayjeswani1234/Voice-Command-Shopping.git

cd Voice-Command-Shopping
```

---

## Run with Docker Compose

```bash
docker compose up --build
```

After the containers start:

```text
Frontend       → http://localhost:5173
API Gateway    → http://localhost:3000
Command        → http://localhost:3001
Shopping       → http://localhost:3002
Product        → http://localhost:3003
Recommendation → http://localhost:3004
```

---

# 🧑‍💻 Development Without Docker

Each service can also be started independently.

Example:

```bash
cd command-service
npm install
npm run dev
```

Repeat for the other services.

---

# 🧪 Example User Flow

### Step 1

User says:

```text
"Add two bottles of milk"
```

### Step 2

Frontend sends:

```http
POST /api/commands
```

### Step 3

Command Service parses the request.

```json
{
  "event": "ADD_ITEM",
  "item": {
    "name": "milk",
    "quantity": 2,
    "unit": "bottle"
  }
}
```

### Step 4

Command Service publishes:

```text
shopping.commands
```

### Step 5

Shopping Service consumes the event.

### Step 6

Shopping Service updates MongoDB.

### Step 7

Frontend fetches:

```http
GET /api/shopping?userId=u1
```

### Step 8

The user sees:

```text
☐ Milk × 2 bottles
```

---

# 🧠 Example Recommendation Flow

Suppose the user purchases:

```text
Milk → 8 times
Bread → 6 times
Eggs → 4 times
```

The Recommendation Service stores:

```text
Milk      8
Bread     6
Eggs      4
```

Recommendations are cached in Redis:

```text
recommendations:u1
```

When the user purchases milk again:

```text
Shopping Service
      │
      ▼
purchase.events
      │
      ▼
Recommendation Service
      │
      ├── count(Milk)++
      │
      └── DEL recommendations:u1
```

The next request recomputes the recommendations and stores the new result in Redis.

---

# 📊 Architecture Principles

This project follows several important distributed-system principles:

### 1. Database-per-Service

Each service owns its data.

```text
Shopping Service       → Shopping MongoDB
Product Service        → Product MongoDB
Recommendation Service → Recommendation MongoDB
```

### 2. Event-Driven Communication

Kafka handles asynchronous side effects and commands.

### 3. API Gateway

All external client traffic enters through one gateway.

### 4. Stateless Services

Services that do not require local state can be horizontally scaled.

### 5. Cache-Aside / Read-Through Strategy

Redis reduces repeated recommendation computation.

### 6. Failure Isolation

A failure in one service should not unnecessarily bring down unrelated functionality.

### 7. Eventual Consistency

Natural-language commands are processed asynchronously.

---

# 📈 Production Scaling Strategy

The first scaling target would be the Command Service because LLM processing can become the primary bottleneck.

```text
                  API Gateway
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Command #1   Command #2   Command #3
          │            │            │
          └────────────┼────────────┘
                       ▼
                      Kafka
```

Other services can independently scale based on workload.

For production:

* MongoDB → MongoDB Atlas
* Kafka → Managed Kafka
* Redis → Managed Redis
* Kubernetes → Container orchestration
* HPA → Automatic scaling
* Prometheus → Metrics
* Grafana → Dashboards

---

# 🎓 Project Highlights

This project demonstrates practical implementation of:

* Microservices Architecture
* REST API Design
* API Gateway Pattern
* Event-Driven Architecture
* Apache Kafka
* Redis Caching
* MongoDB
* Natural Language Processing
* LLM Integration
* Fault Isolation
* Eventual Consistency
* Docker
* Docker Compose
* Kubernetes
* Horizontal Scaling
* Database-per-Service Pattern
* Asynchronous Processing
* Cache Invalidation

---

# 👨‍💻 Author

**Jay Jeswani**

Computer Science Engineering Student
VIT Bhopal University

GitHub: [jayjeswani1234](https://github.com/jayjeswani1234)

---

# 📄 License

This project is intended for educational, portfolio, and demonstration purposes.
