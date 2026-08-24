1. Problem statement

Build a shopping list app where a user can speak or type a command like "add two bottles of milk" and have it show up on their list, alongside product search and personalized recommendations based on purchase history.

2. Goals and non-goals

Functional requirements

Accept a natural-language command and turn it into an add/remove/complete action on a per-user shopping list.
Let a user browse and search a product catalog.
Show a small set of personalized recommendations that improve as the user makes purchases.
Support standard CRUD on the shopping list independent of voice input.

Non-functional requirements

Each domain's data is owned by exactly one service — no shared tables.
The system should degrade gracefully: if one service is briefly down, the others keep working.
Reads that are expensive to compute (recommendations) should be cheap to serve on repeat requests.
The whole thing needs to be buildable and demoable inside a short, fixed time budget — architecture should not outrun the time available to implement it.

Non-goals

Auth/authorization (the API gateway is the natural place to add it later, but it's out of scope here — userId is passed directly).
Multi-region deployment, multi-tenant isolation, formal SLAs.
Payment processing — "purchased" just means "checked off," not "paid for."
3. High-level architecture
text
                         ┌──────────────────┐
                         │  React frontend   │
                         └────────┬──────────┘
                                  │  REST (JSON)
                                  ▼
                         ┌──────────────────┐
                         │   API gateway     │  :3000
                         └────────┬──────────┘
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
     ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
     │   Command     │     │   Product     │     │  (fan-out cont'd  │
     │   service     │     │   service     │     │   below)          │
     │   :3001       │     │   :3003       │     └──────────────────┘
     └──────┬────────┘     └──────┬────────┘
            │                     │
            ▼                     ▼
        Claude API           MongoDB
     (or regex fallback)     (products)

             │  publishes intent
             ▼
        ┌─────────┐
        │  Kafka  │   topics: shopping.commands, shopping.events, purchase.events
        └────┬────┘
             │ consumes
             ▼
     ┌──────────────┐        ┌──────────────────┐
     │   Shopping    │  purchase.events →│ Recommendation   │
     │   service     │───────────────────►│   service        │  :3004
     │   :3002       │                    └────────┬─────────┘
     └──────┬────────┘                             │
            ▼                                       ▼
        MongoDB                                  Redis (cache) +
       (shopping)                              MongoDB (purchase history)

Two things distinguish this from "five services glued together":

Synchronous vs asynchronous paths are deliberately different. Reads (list, search, recommendations) are plain REST through the gateway. Writes that originate from natural language go through Kafka so the command service never has to know whether the shopping service is up.
Every service owns its data. No service queries another service's database directly — cross-service reads happen through that service's API, and cross-service side effects happen through Kafka events.
4. Service breakdown
Service	Port	Data store	Responsibility
api-gateway	3000	none	Single entry point; routes /api/* by prefix; future home for auth, rate limiting, request logging
command-service	3001	none (stateless)	Turns free text into a structured intent (ADD / REMOVE / COMPLETE + item); publishes it to Kafka
shopping-service	3002	MongoDB shopping	System of record for the shopping list; applies commands consumed from Kafka; exposes REST CRUD for direct edits
product-service	3003	MongoDB products	Product catalog and search
recommendation-service	3004	MongoDB recommendations, Redis	Purchase-frequency-based recommendations; Redis-cached, invalidated per user on purchase

Deliberately not built as separate services: notifications and analytics. Both are natural Kafka consumers on shopping.events / purchase.events and can be added later without touching any existing service — that's the payoff of decoupling through a bus instead of direct calls.

5. Data model

shopping DB — ShoppingItem

Field	Type	Notes
userId	string	indexed
name	string	
quantity	number	default 1
unit	string | null	e.g. "bottle", "bag"
purchased	boolean	default false
createdAt / updatedAt	timestamp	

products DB — Product

Field	Type	Notes
name	string	
brand	string | null	
category	string	indexed
price	number	
inStock	boolean	default true

recommendations DB — PurchaseHistory

Field	Type	Notes
userId	string	compound-indexed with product
product	string	
count	number	incremented on each purchase event

Redis

Key pattern	Value	TTL
recommendations:<userId>	JSON array of {product, timesPurchased}	10 min, or deleted early on purchase
6. API design

All client traffic goes through the gateway at http://<host>:3000.

Commands

POST /api/commands
  { "userId": "u1", "text": "add two bottles of milk" }
  → 202 { accepted: true, parsed: { event, item, ... } }

This is fire-and-forget from the client's perspective — the actual list update happens a moment later via Kafka. The client re-fetches (or, in a fuller build, subscribes to shopping.events over a websocket) to see the result.

Shopping list

GET    /api/shopping?userId=u1
POST   /api/shopping            { userId, name, quantity, unit }
PATCH  /api/shopping/:id        { purchased: true, ... }
DELETE /api/shopping/:id

Products

GET /api/products/search?q=milk&category=dairy&maxPrice=5
GET /api/products/:id

Recommendations

GET /api/recommendations?userId=u1
  → { source: "cache" | "computed", recommendations: [...] }
7. Event-driven design

Topics

Topic	Producer	Consumer(s)	Payload
shopping.commands	command-service	shopping-service	{ event, userId, item, raw, timestamp }
shopping.events	shopping-service	(future: analytics, notifications)	{ event, userId, item }
purchase.events	shopping-service	recommendation-service	{ event: "ITEM_PURCHASED", userId, product }

Why Kafka instead of a direct HTTP call from command-service to shopping-service:

text
Direct HTTP                          Through Kafka
------------                         -------------
command-service                      command-service
      │ blocks on response                 │ publish, return immediately
      ▼                                     ▼
shopping-service (must be up)             Kafka topic
      │                                     │ message waits if consumer is down
      ▼                                     ▼
  200 / error                        shopping-service (processes when ready)

The trade-off: the client gets an immediate "accepted" rather than a confirmed "done." For a shopping list that's an acceptable trade — losing a few hundred milliseconds of consistency is cheap; a command failing outright because a downstream pod was mid-restart is not.

Sequence — voice command to list update

text
User          Frontend      Gateway      Command svc     Kafka      Shopping svc
 │  "add milk"   │               │              │             │              │
 ├──────────────►│               │              │              │              │
 │               │  POST /commands              │              │              │
 │               ├──────────────►│──────────────►               │              │
 │               │               │              │  parse intent│              │
 │               │               │              │  (Claude/regex)             │
 │               │               │              │  publish ───►│              │
 │               │◄──────────────┤◄─────────────┤ 202 accepted │              │
 │               │  poll/refetch │               │              │  consume ──►│
 │               │  GET /shopping│               │              │             │ write Mongo
 │               ├──────────────►│───────────────────────────────────────────►│
 │               │◄──────────────┤◄──────────────────────────────────────────┤
 │◄ updated list ┤               │              │              │              │

Sequence — purchase invalidates the recommendation cache

text
Shopping svc          Kafka (purchase.events)      Recommendation svc      Redis
     │  item marked purchased      │                        │                  │
     ├─────────────────────────────►│                        │                  │
     │                              │──────consume──────────►│                  │
     │                              │                        │ upsert count     │
     │                              │                        │ DEL recs:<user>  │
     │                              │                        ├─────────────────►│
                                                              │
                        next GET /recommendations for that user → cache MISS → recompute → SET with TTL
8. Caching strategy

Only recommendations are cached — it's the one endpoint that's read-heavy, expensive-ish to compute, and tolerant of a few minutes of staleness.

Read-through: on a cache miss, compute from PurchaseHistory and set the key with a 10-minute TTL.
Explicit invalidation: a purchase event deletes that user's key immediately, so the next read is always fresh rather than waiting out the TTL. The TTL is a backstop for keys that are never explicitly invalidated, not the primary invalidation mechanism.
Shopping list and product data are not cached — they're either already fast (indexed Mongo queries) or need to be immediately consistent after a write.
9. Scalability and reliability
Stateless services (api-gateway, command-service) scale horizontally with zero coordination — just add replicas behind the gateway/load balancer.
Kafka consumer groups: shopping-service and recommendation-service can each run multiple instances in the same consumer group; Kafka partitions the load across them automatically as long as messages are keyed by userId (which they are — see producer code), so all events for one user stay ordered.
Idempotency: shopping.commands messages carry an eventId. It's not yet enforced in the consumer, but it's the natural place to de-duplicate if a producer ever retries a publish (noted as a follow-up in §12).
Backpressure: if shopping-service falls behind, messages queue in Kafka rather than piling up as failed HTTP calls or timeouts at the gateway.
Failure isolation: product-service and recommendation-service have no dependency on each other; an outage in one doesn't touch the other's read/write path.
10. Deployment

Local / demo: docker compose up — every service, Kafka (single-node KRaft, no ZooKeeper), Redis, and MongoDB in one command. This is the actual deliverable for this project's time budget.

Path to production, if extended:

text
Kubernetes cluster
   ├── Deployment + Service per app service (gateway, command, shopping,
   │   product, recommendation)
   ├── Redis and Kafka as in-cluster Deployments (or managed equivalents)
   └── MongoDB as a managed service (e.g. Atlas) rather than self-hosted —
       running a HA Mongo replica set in-cluster is a project of its own

Kubernetes' DNS gives every service a stable name (shopping-service:3002), so the only config change moving from Compose to K8s is swapping localhost/container-name hosts for the cluster's service names — the application code doesn't change. Horizontal Pod Autoscaling on command-service (the one doing LLM calls, and therefore most likely to become the bottleneck under load) is the first scaling lever worth pulling.

11. Trade-offs and alternatives considered
Decision	Alternative	Why this choice
5 services	1 monolith	Monolith would be faster to build for this scope alone, but the assignment specifically calls for demonstrating service boundaries and event-driven design
5 services	10+ finer-grained services	More services than this doesn't map to a real bounded context here — it would be splitting for the sake of a diagram, not for independent scaling or ownership
Kafka for command → shopping	Direct REST call	Direct call is simpler and would work fine at this scale; Kafka is chosen to demonstrate decoupling and because it generalizes better if notifications/analytics consumers get added later
Redis only for recommendations	Cache everything	Shopping list and product data don't have the read/write ratio or compute cost that justifies cache-invalidation complexity
MongoDB per service	One shared database	Shared DB is the fastest way to accidentally couple services; per-service databases keep the boundary real, not just nominal
LLM parsing with regex fallback	LLM-only	A hard dependency on an API key would make the project fail to run for anyone without one; the fallback keeps docker compose up working out of the box
12. Known gaps / follow-ups
No auth — userId is trusted as given. A real system would authenticate at the gateway and stop trusting client-supplied user IDs downstream.
No de-duplication on Kafka consumers yet, despite carrying eventId for exactly this purpose — a producer retry could currently double-apply a command.
No dead-letter topic — a message that repeatedly fails to process will retry indefinitely rather than being parked for inspection.
No real-time push to the frontend (websocket/SSE on shopping.events) — the client currently has to re-fetch after issuing a command.
Product and recommendation data don't yet talk to each other (e.g. recommending specific in-stock products, not just product names from purchase history) — a reasonable next feature once both services exist.
