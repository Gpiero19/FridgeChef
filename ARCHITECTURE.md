# ARCHITECTURE.md — FridgeChef (SPEC-01)

Governing document for all 8 tasks in `docs/specs/SPEC-01-fridgechef.md`.
Everything here is derived from SPEC-01. Decisions the SPEC left open are documented as ADRs and flagged **"assumed because SPEC did not specify — human should review"**.

---

## 1. System overview

FridgeChef is a stateless, mobile-first Next.js 15 (App Router) web app deployed on Vercel. Users provide ingredients by typing or photographing their fridge; the client calls two server-side route handlers which invoke the Anthropic Claude API (Haiku 4.5) and return 3 structured recipes. There are no accounts, no database, and no persistence of any kind. The system boundary is: browser client ↔ two Next.js route handlers ↔ Anthropic API. Nothing else.

```mermaid
flowchart LR
    subgraph Browser["Browser (mobile-first)"]
        UI["app/page.tsx\nuseReducer state machine\n(input -> confirm -> recipes)"]
        IMG["browser-image-compression\n(~1024px long edge, EXIF fix)"]
    end

    subgraph Vercel["Vercel (Next.js 15 serverless)"]
        MW["rate-limit check\nlib/rate-limit.ts (in-memory, per-IP)"]
        EXT["POST /api/extract-ingredients\n(multipart image -> string[])"]
        SUG["POST /api/suggest-recipes\n(ingredients + staples -> 3 recipes)"]
        CL["lib/claude.ts\nAnthropic SDK singleton\nCLAUDE_MODEL env"]
        SCH["lib/schemas.ts (Zod)\nlib/types.ts (Recipe, Ingredient)"]
    end

    ANTH["Anthropic Claude API\nclaude-haiku-4-5-20251001"]

    UI -->|photo| IMG -->|compressed image| MW
    UI -->|"ingredients + staples (JSON)"| MW
    MW --> EXT
    MW --> SUG
    EXT --> CL
    SUG --> CL
    CL --> ANTH
    EXT --> SCH
    SUG --> SCH
```

### Module layout

```
app/
  layout.tsx              # root layout, globals.css import
  globals.css             # Tailwind
  page.tsx                # entire UI: useReducer state machine (input | confirm | recipes)
  api/
    extract-ingredients/route.ts   # POST — image → ingredient list
    suggest-recipes/route.ts       # POST — ingredients + staples → 3 recipes
middleware.ts             # per-IP rate limit on /api/* (Task 8; see ADR-005 for placement)
lib/
  claude.ts               # Anthropic SDK client singleton + CLAUDE_MODEL constant (sole env access for model/key)
  types.ts                # Recipe, Ingredient domain types — no UI/stateful concerns
  schemas.ts              # Zod schemas: request bodies + LLM output validation
  rate-limit.ts           # in-memory sliding-window limiter keyed by IP
components/               # UI pieces extracted from page.tsx as needed (chips, cards, skeleton)
```

Rule: `lib/types.ts` and `lib/schemas.ts` are pure — no React, no Next imports — so SPEC-02's DB layer can consume them unchanged.

---

## 2. API contract

- **Versioning**: none — routes are `/api/extract-ingredients` and `/api/suggest-recipes` exactly as SPEC-01 defines them. The SPEC explicitly names these paths; introducing `/api/v1/` would contradict the approved SPEC (see ADR-001).
- **Auth**: none. Both routes are public, guarded only by rate limiting. No auth headers.
- **Error format** (every non-2xx response, both routes):

```json
{
  "error": "<machine_code>",
  "message": "<human-readable detail>"
}
```

  Machine codes: `invalid_request` (400), `file_too_large` (413), `unsupported_media_type` (415), `rate_limited` (429, plus `Retry-After` header, body may omit `message`), `llm_error` (502 — Claude call failed or output failed Zod validation after retry), `internal_error` (500).

### Endpoints

| Method | Path | Auth | Request | Response (200) | Description |
|---|---|---|---|---|---|
| POST | `/api/extract-ingredients` | none (rate-limited) | `multipart/form-data`, field `image`: jpeg/png/webp, ≤ 5 MB | `{ "ingredients": string[] }` | Sends image to Claude vision, returns detected ingredient names |
| POST | `/api/suggest-recipes` | none (rate-limited) | JSON `{ "ingredients": string[], "pantryStaples": string[] }` | `{ "recipes": Recipe[] }` — exactly 3 | Generates 3 structured recipes; `missingIngredients` excludes anything in `pantryStaples` |

Request bodies are validated with Zod at the route-handler entry point (the only validation site — see §11). Empty `ingredients` array → 400 `invalid_request`.

---

## 3. Data architecture

**N/A — SPEC-01 explicitly excludes all persistence**: no database, no localStorage, no cookies, no server-side storage. Consequently:

- Migrations: N/A — no schema exists.
- Connection pooling: N/A — no database connections.
- Pagination: N/A — the only list responses are a fixed 3-recipe array and a short ingredient array; both are bounded by construction.

### Domain types (in-memory only, `lib/types.ts`)

```ts
type Difficulty = "easy" | "medium" | "hard";

interface Recipe {
  name: string;
  cuisine: string;
  usedIngredients: string[];
  missingIngredients: string[];   // never contains a pantryStaples entry
  cookTimeMinutes: number;
  difficulty: Difficulty;
  steps: string[];
}

// Ingredient is a plain string alias in v1 (type Ingredient = string).
// Kept as a named type so SPEC-02 can widen it to an object (id, quantity, …)
// without touching call sites that only pass names.
```

Zod schemas in `lib/schemas.ts` mirror these exactly and are the single source of truth for validating LLM output. `Recipe[]` is validated as `z.array(recipeSchema).length(3)`.

Ephemeral data rule (SPEC constraint): uploaded image Buffers live only in the route handler's scope, are never written to disk, never logged, and are eligible for GC as soon as the response is sent. Ingredient lists are likewise never logged.

---

## 4. Auth and authorization

**N/A — SPEC-01 states "Auth strategy: N/A — stateless, no user accounts."** There are no protected routes, no sessions, no tokens, no roles. All routes are public. The only access control is the per-IP rate limit (§ rate limiting, Task 8). The one secret in the system, `ANTHROPIC_API_KEY`, authenticates the *server* to Anthropic, is read only inside `lib/claude.ts`, and must never appear in a client bundle (verified in build output per Definition of done). Auth arrives in SPEC-02 and is explicitly out of scope here.

---

## 5. State management (frontend)

Confirmed in SPEC-01 decisions 5 and 10:

- **Pattern**: single-page client state machine via React `useReducer` in `app/page.tsx`. Reducer state: `{ step: "input" | "confirm" | "recipes", ingredients: string[], pantryStaples: string[], recipes: Recipe[], loading: boolean, error: string | null }` (exact shape finalised in Task 5; step union is SPEC-mandated).
- **No external store** (no Zustand/Redux/Jotai/TanStack Query), **no URL routing between steps**.
- Rules: all cross-step state lives in the single reducer; purely presentational state (e.g. a card's expanded/collapsed steps) stays as local `useState` in the component; there is no server cache — every "Generate/Regenerate" is a fresh API call by design (stateless app).
- Pre-selected staples: Salt, Pepper, Olive oil on; Butter, Garlic, Common spices off (SPEC decision 2).

---

## 6. Infrastructure and environments

- **Environments**: local dev (`npm run dev`, Node 20 LTS) and Vercel production. No staging environment — SPEC-01 defines only local + Vercel deploy (Task 7); Vercel preview deployments come for free with the platform and use the same env vars as production (ADR-002).
- **Environment variables** (keys only):
  - `ANTHROPIC_API_KEY` — required, server-only, both environments. Never `NEXT_PUBLIC_`.
  - `CLAUDE_MODEL` — optional, defaults to `claude-haiku-4-5-20251001` in `lib/claude.ts`.
  - `.env.local.example` (Task 1) lists both keys with no values.
- **Central config rule**: both variables are read **only** in `lib/claude.ts`. No other file touches `process.env` for these. Any future env var gets a similar single access point.
- **Statelessness**: fully satisfied by design — no sessions to store, no file uploads persisted (images are in-memory Buffers only, discarded post-response). No object storage needed because nothing is stored.

---

## 7. External dependencies

Exactly one external service (SPEC constraint: "External dependencies: Anthropic Claude API only").

| Service | Purpose | Fallback if down | Timeout | Retry policy |
|---|---|---|---|---|
| Anthropic Claude API (`claude-haiku-4-5-20251001` via `@anthropic-ai/sdk`) | Ingredient extraction from images (vision) and 3-recipe JSON generation | None — return 502 `llm_error`; UI shows an error state with a "Try again" action. No cached/canned recipes (would contradict statelessness). | 30 s per call (SDK client timeout; see ADR-003) | SDK default retries for transient network/5xx (max 2). Plus **one** application-level retry if Claude's output fails Zod validation — re-prompt once, then 502 (ADR-003). |

Vercel and npm packages (zod, browser-image-compression, Tailwind, Vitest, Playwright) are platform/build dependencies, not runtime external services.

---

## 8. Async jobs

**N/A — no job queue.** The only slow operations are the two Claude calls (~2–6 s, SPEC constraint), and they intentionally run inline within the HTTP request because the client is synchronously waiting for the result — this is a request/response product, not background work. Handling of the slowness:

- Client shows a loading/skeleton state for the duration of both calls (SPEC-mandated; Tasks 4–6).
- The 30 s LLM timeout keeps requests within Vercel serverless function limits.
- No emails, file processing, PDF generation, or external syncs exist in SPEC-01, so no queue, retry counts, DLQ, or alerting are needed. If SPEC-02+ adds background work, this section gets a real queue and a new ADR.

---

## 9. Caching strategy

Deliberately minimal — the app is stateless and every LLM response should be fresh (users expect "Regenerate" to produce new recipes).

| What | Where | TTL | Invalidation |
|---|---|---|---|
| API route responses (`/api/*`) | Not cached — `Cache-Control: no-store` on both routes | n/a | n/a |
| Static assets (JS/CSS/fonts) | Vercel CDN (Next.js defaults: immutable hashed assets) | Framework default (1 year, content-hashed) | New deploy = new hashes |
| Landing page HTML | Vercel CDN via Next.js static/ISR defaults | Framework default | New deploy |
| DB query cache | N/A — no database | — | — |

No application-layer cache (no Redis, no LRU on LLM responses). ADR-004 records this.

---

## 10. Observability

- **Error tracking**: Vercel's built-in function logs and error reporting only — no third-party tracker (Sentry etc.) in v1 (ADR-006; assumed, human should review).
- **Metrics**: Vercel Analytics/function metrics provide response times and error rates per route. Watch: route p50/p95 latency (expect 2–6 s, LLM-bound), 429 rate (rate-limiter pressure), 502 rate (LLM/Zod failures).
- **Tracing**: N/A — a two-route monolith calling one external API has nothing to trace across.
- **Structured logging**: route handlers log one JSON line per request via a tiny helper:

```json
{ "timestamp": "ISO-8601", "level": "info|warn|error", "event": "extract_ingredients|suggest_recipes|rate_limited|llm_error", "requestId": "<crypto.randomUUID() per request>", "status": 200, "durationMs": 3120 }
```

  `userId` is permanently absent — there are no users.
- **PII exclusion (SPEC-mandated, stricter than usual)**: never log image Buffers/base64, ingredient lists, recipe contents, the API key, or full raw IPs. The rate limiter keys on IP in memory but logs at most a truncated/hashed form on 429 events. Enforced in code review and by security-agent.

---

## 11. Security baseline

- **CORS**: same-origin only. No CORS headers are added to `/api/*` — the API exists solely for the app's own frontend on the same origin, in every environment. Any cross-origin browser call is rejected by default (ADR-007).
- **Rate limiting**: `lib/rate-limit.ts`, in-memory sliding-window keyed by client IP (`x-forwarded-for`, first hop — trustworthy on Vercel). Limit: **5 recipe generations per hour per IP**, guarding both `/api/extract-ingredients` and `/api/suggest-recipes` as a shared budget (both spend Anthropic tokens; see ADR-005 for the shared-vs-separate decision). Exceeding → `429 { "error": "rate_limited" }` + `Retry-After` (seconds until window frees). Known ceiling, stated in SPEC: state is per-serverless-instance and resets on cold start — best-effort throttling of casual abuse, not durable. A `// ponytail:` comment in the code names this ceiling and the SPEC-05 Upstash upgrade path.
- **Input validation**: Zod, at route-handler entry points **only** — never inside `lib/claude.ts` or other helpers. Three validation sites: (1) `suggest-recipes` request body, (2) `extract-ingredients` upload (size ≤ 5 MB via `Content-Length` + actual Buffer length; MIME ∈ {image/jpeg, image/png, image/webp} checked on the file's declared type), (3) LLM JSON output from both routes (trust boundary: the LLM is untrusted input).
- **Security headers** (set in `next.config.ts` headers()):
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'` — `blob:`/`data:` needed for client-side image preview/compression; `'unsafe-inline'` is the pragmatic Next.js baseline (ADR-008; assumed, human should review if a stricter nonce-based CSP is wanted).
- **HTTPS / canonical URL**: Vercel enforces HTTPS and http→https redirect platform-side. Canonical host is the bare Vercel-assigned domain; no www variant exists in v1. No custom domain is in SPEC-01 scope.
- **Secret hygiene** (SPEC-mandated): `ANTHROPIC_API_KEY` server-side only, accessed solely in `lib/claude.ts`; Definition of done requires verifying its absence from the client bundle.

---

## 12. Performance baseline

From SPEC-01 (which sets no hard SLA); items the SPEC omitted use conservative defaults (ADR-009):

- **LLM latency**: ~2–6 s per generation, LLM-bound. No hard SLA. Loading/skeleton state required on every LLM-backed transition (SPEC-mandated).
- **Image handling (SPEC-mandated)**: client-side downscale to ~1024px long edge via `browser-image-compression` (also corrects EXIF rotation) before base64 encoding; server rejects > 5 MB and non-{jpeg,png,webp}.
- **Core Web Vitals targets** (defaults — SPEC did not specify): LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on the landing page over mobile 4G.
- **JS bundle limit** (default — SPEC did not specify): ≤ 200 KB gzipped first-load JS for `app/page.tsx`. `browser-image-compression` is dynamically imported only when the user picks photo mode, so text-mode users never download it.
- **UI images**: the app ships essentially no static imagery (mobile-first, chip/card UI); any icons are inline SVG. User-uploaded previews use object URLs, `loading="lazy"` where offscreen.
- **Pagination / N+1**: N/A — no database and no unbounded lists (3 recipes, short ingredient arrays). The no-query-in-a-loop rule applies trivially: there is exactly one Claude call per request, never in a loop.

---

## 13. Feature flags and rollout

**None — SPEC-01: "Feature flag strategy: none."** No flag library, no percentage rollouts. Rollout mechanism for all 8 tasks is the SPEC's own git flow: each feature lands on `main` only after the test → security → review gates pass, and Vercel deploys `main`. Vercel preview deployments serve as the "dark deploy" check before merge when needed. Risky-change rollout beyond this is out of scope until the app has users and state (SPEC-02+).

---

## 14. Rollback strategy

- **Code rollback**: two equivalent levers — (a) Vercel "Instant Rollback" to the previous production deployment (fastest, zero git churn), or (b) `git revert <merge-commit>` on `main`, which triggers a fresh deploy. Prefer (a) for immediate mitigation, then (b) to make the tree match production. Every merge to `main` is an independently deployable, gate-approved state, so any prior deployment is a valid rollback target.
- **Database rollback**: N/A — no database, no migrations, nothing to roll back. (The blanket up/down-migration rule activates in SPEC-02 when a DB appears.)
- **Communication**: single-maintainer project — the human operator (repo owner) performs and is inherently aware of any rollback; the orchestrator records it in `AGENT_LOG.md`. No external stakeholders or on-call rotation exist.

---

## 15. Architecture Decision Records

### ADR-001: No API version prefix
**Date**: 2026-07-03
**Status**: Accepted
**Context**: House convention defaults to `/api/v1/...`, but SPEC-01 explicitly names the routes `POST /api/extract-ingredients` and `POST /api/suggest-recipes`, and the Playwright E2E specs and tasks reference those exact paths.
**Options considered**: (1) `/api/v1/` prefix per convention; (2) SPEC-verbatim paths.
**Decision**: SPEC-verbatim paths. The SPEC is user-approved and unambiguous.
**Consequences**: A future breaking API change would need `/api/v2/` alongside — acceptable for a 2-route app. Zero risk of drift between SPEC, tests, and code today.

### ADR-002: Two environments only (local + Vercel production)
**Date**: 2026-07-03
**Status**: Accepted
**Context**: SPEC-01 defines local development and a Vercel deploy (Task 7); it never mentions staging. *Assumed because SPEC did not specify — human should review.*
**Options considered**: (1) dev/staging/prod triple; (2) dev + prod, with Vercel's automatic preview deployments filling the pre-prod-check role.
**Decision**: Option 2. A stateless app with no DB has nothing that a staging environment would isolate.
**Consequences**: Simpler env-var management (one production set). Preview deployments consume the same `ANTHROPIC_API_KEY` — acceptable given the rate limiter and low traffic; revisit in SPEC-05.

### ADR-003: Vercel Hobby plan — 10s function limit
**Date**: 2026-07-03
**Status**: Accepted
**Context**: The deploy target is Vercel Hobby (free tier). Serverless function limit is 10s — the previous 30s SDK timeout and one-retry design would be killed by Vercel before executing.
**Decision**: SDK timeout set to 8s (leaves ~2s for network overhead and Zod parsing). No retry on bad JSON — if Claude returns invalid JSON, return a structured error immediately. Both route handlers must export: `export const maxDuration = 10`
**Rationale**: Haiku 4.5 typically responds in 1-3s. 8s covers edge cases without hitting the Vercel ceiling.
**Consequences**: Upgrade path: moving to Vercel Pro unlocks 60s maxDuration — restore retry logic at that point (SPEC-02 or later).

### ADR-004: No application-layer caching of LLM responses
**Date**: 2026-07-03
**Status**: Accepted
**Context**: Identical ingredient lists could theoretically reuse a cached recipe response to save tokens. SPEC is silent. *Assumed because SPEC did not specify — human should review.*
**Options considered**: (1) in-memory LRU keyed on sorted ingredients; (2) no cache.
**Decision**: No cache. "Regenerate" is a first-class feature — users explicitly want *different* recipes for the same inputs, so caching fights the product. Cache-hit rates across per-instance serverless memory would be negligible anyway. `Cache-Control: no-store` on both API routes.
**Consequences**: Every generation costs Anthropic tokens; the per-IP rate limit is the cost control. Easier: correctness and privacy (nothing retained). Harder: nothing.

### ADR-005: Rate limit applies to /api/suggest-recipes only
**Date**: 2026-07-03
**Status**: Accepted
**Context**: SPEC Task 8 says "applied in middleware.ts or per-route" (an explicit either/or left to architecture) and says the limit "guards both API routes" without stating whether each route gets its own 5/hour counter.
**Decision**: The 5/hour per-IP counter tracks only recipe generation calls. `/api/extract-ingredients` is exempt — it is an auxiliary step, not the protected resource.
**Rationale**: Photo users call extract + generate per attempt. Counting both would give photo users ~2 full attempts/hour vs text users' 5 — penalising FridgeChef's primary differentiator.
**Implementation**: rate-limit middleware checks route path before incrementing counter.

### ADR-006: Observability = Vercel built-ins only, no third-party error tracker
**Date**: 2026-07-03
**Status**: Accepted
**Context**: SPEC-01 mentions no observability tooling. *Assumed because SPEC did not specify — human should review.*
**Options considered**: (1) Sentry; (2) Vercel function logs + Analytics only.
**Decision**: Option 2. A 2-route, no-user, no-persistence v1 does not justify a Sentry dependency, DSN secret, and PII-scrubbing config — especially under the SPEC's strict never-log-ingredients/images rule, where a default error tracker capturing request bodies would itself be a violation.
**Consequences**: Easier: zero new deps/secrets, no accidental PII capture. Harder: no alerting/aggregation — acceptable until SPEC-02 adds users; add a tracker (with request-body scrubbing) then.

### ADR-007: Same-origin API, no CORS headers
**Date**: 2026-07-03
**Status**: Accepted
**Context**: SPEC is silent on CORS. The API serves only FridgeChef's own frontend. *Assumed because SPEC did not specify — human should review.*
**Options considered**: (1) explicit allow-list of origins; (2) emit no CORS headers at all.
**Decision**: Option 2 — the browser's same-origin default is the allow-list. Nothing to configure per environment because the frontend and API always share an origin (Next.js monolith).
**Consequences**: Third-party browser clients are blocked by default (desired — protects the Anthropic budget alongside the rate limiter). Non-browser callers (curl) are unaffected by CORS by nature; the rate limiter handles those.

### ADR-008: Pragmatic CSP with 'unsafe-inline', not nonce-based
**Date**: 2026-07-03
**Status**: Accepted
**Context**: SPEC requires no CSP; house baseline requires one. Next.js App Router needs inline scripts/styles unless a nonce pipeline is built. *Assumed because SPEC did not specify — human should review.*
**Options considered**: (1) strict nonce-based CSP via middleware (extra machinery, fights Tailwind/Next defaults); (2) static CSP allowing `'unsafe-inline'`, everything else locked to `'self'` (+ `data:`/`blob:` for image previews).
**Decision**: Option 2. The app renders no user-generated HTML and has no auth/session to steal, so XSS blast radius is minimal; a strict CSP buys little for its cost here.
**Consequences**: Weaker XSS mitigation than a nonce CSP — acceptable for v1's threat model. Revisit in SPEC-02 when sessions exist and XSS gains a payoff.

### ADR-009: Default performance numbers where SPEC gave none
**Date**: 2026-07-03
**Status**: Accepted
**Context**: SPEC-01 sets image-size and latency expectations but no Core Web Vitals or bundle-size targets. *Assumed because SPEC did not specify — human should review.*
**Options considered**: leave unspecified vs. adopt standard "good" CWV thresholds and a 200 KB gzipped first-load JS ceiling.
**Decision**: Adopt LCP ≤ 2.5 s / INP ≤ 200 ms / CLS ≤ 0.1 and ≤ 200 KB first-load JS, with `browser-image-compression` dynamically imported.
**Consequences**: review-agent has concrete numbers to check against; a mobile-first single-page app comfortably fits these. If they prove wrong, they're targets, not contracts — amend via a new ADR.

### ADR-010: Ingredient as `type Ingredient = string` in v1
**Date**: 2026-07-03
**Status**: Accepted
**Context**: SPEC Task 2 says define shared `Recipe`/`Ingredient` types but the Recipe shape uses plain `string[]` for ingredient lists, and the Notes require types clean of UI/stateful concerns for SPEC-02.
**Options considered**: (1) object type `{ name: string }` now for forward compatibility; (2) named string alias.
**Decision**: Named alias `type Ingredient = string`. The v1 domain genuinely has no ingredient attributes; an object wrapper would be speculative structure (YAGNI). The named alias still gives SPEC-02 a single widening point.
**Consequences**: Zero ceremony now; SPEC-02 widens the alias and follows compiler errors to every touch point.

---

*End of ARCHITECTURE.md — SPEC-01. Append new ADRs sequentially; never edit existing ones.*
