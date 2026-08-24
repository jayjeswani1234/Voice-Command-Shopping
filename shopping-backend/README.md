# Voice shopping assistant — backend

A microservice backend for a voice-driven shopping list. An API gateway routes
requests to four independent services; natural-language commands are turned
into structured intents and applied asynchronously through Kafka; Redis caches
recommendation results and is invalidated on purchase events.

## Services

| Service | Port | Owns | Responsibility |
|---|---|---|---|
| `api-gateway` | 3000 | — | Single entry point, routes `/api/*` to the right service |
| `command-service` | 3001 | — | Parses free-text commands into intents (Claude, or regex fallback), publishes to Kafka |
| `shopping-service` | 3002 | MongoDB `shopping` | Owns the shopping list; consumes commands, exposes REST CRUD |
| `product-service` | 3003 | MongoDB `products` | Product search/catalog |
| `recommendation-service` | 3004 | MongoDB `recommendations`, Redis | Cached recommendations; invalidated on purchase |

Infrastructure: Kafka (topics `shopping.commands`, `shopping.events`,
`purchase.events`), Redis, MongoDB.

## Running it

```bash
cp .env.example .env        # optional: add ANTHROPIC_API_KEY for real LLM parsing
docker compose up --build
```

Then seed some sample products:

```bash
docker compose exec product-service node seed.js
```

Health checks: `curl http://localhost:3000/health` (gateway), and similarly for
each service on its own port.

## Trying the voice-command flow

```bash
# 1. Send a natural-language command through the gateway
curl -X POST http://localhost:3000/api/commands \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","text":"add two bottles of milk"}'

# 2. A moment later, the shopping service will have applied it
curl "http://localhost:3000/api/shopping?userId=u1"

# 3. Mark it purchased -- this also fires a purchase event
curl -X PATCH http://localhost:3000/api/shopping/<item-id> \
  -H "Content-Type: application/json" \
  -d '{"purchased": true}'

# 4. Recommendations are now cached and will be invalidated on the next purchase
curl "http://localhost:3000/api/recommendations?userId=u1"
```

## Without an LLM

`command-service` works with no API key: it falls back to a small regex
parser (`src/llm.service.js`) that recognizes add/remove/complete verbs,
quantities, and common units. Set `ANTHROPIC_API_KEY` in `.env` to switch to
real Claude-based parsing — no code changes needed.

## Why it's built this way

- **API gateway**: the frontend never needs to know how many services exist
  or where they live.
- **Kafka between command and shopping**: decouples them. If shopping-service
  is briefly down, commands queue in Kafka instead of failing outright.
- **Each service owns its database**: shopping, product, and recommendation
  data never cross service boundaries directly.
- **Redis in front of recommendations only**: it's the one read-heavy,
  write-light endpoint where caching actually pays for itself, and it's
  invalidated precisely (per user) on purchase events rather than on a timer
  alone.

## Scope note

This intentionally stops at Docker Compose. If you need Kubernetes on top,
add deployment + service manifests per service (see the architecture
discussion above) once the app itself is verified working — don't spend your
time budget on manifests before `docker compose up` succeeds end to end.
