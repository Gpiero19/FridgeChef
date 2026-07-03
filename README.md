# FridgeChef

A stateless, mobile-first web app that turns a photo of your fridge or pantry
into recipe suggestions. Upload an image, an LLM (Claude) identifies the
ingredients, then suggests recipes you can make with them. Nothing is
persisted — no accounts, no database, no stored images.

Built with Next.js 15 (App Router) + TypeScript, deployed on Vercel.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and set ANTHROPIC_API_KEY
npm run dev
```

App runs at http://localhost:3000.

## Required environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Server-side only. Never commit it, never expose it to the client. |
| `CLAUDE_MODEL` | No | `claude-haiku-4-5-20251001` | Override to use a different Claude model. |

Env vars are read only through the central config module (see
`ARCHITECTURE.md`) — never accessed directly via `process.env` elsewhere in
the codebase.

## Testing

```bash
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright E2E tests
```

`npm run test:e2e` builds the app and boots a production server
automatically (see `playwright.config.ts`) — no need to start `npm run dev`
first.

## Deployment (Vercel)

1. Import the repo into Vercel.
2. In the Vercel dashboard, set `ANTHROPIC_API_KEY` (and optionally
   `CLAUDE_MODEL`) under Project Settings → Environment Variables. Never
   commit real values to the repo.
3. Vercel runs the standard Next.js build/start (`next build` / `next
   start`) — no custom build command needed.

## Data privacy

FridgeChef stores nothing. Uploaded images are processed in-memory only and
are never written to disk or logged. Ingredient lists and recipe contents
returned by the LLM are never logged either. Structured request logs record
only metadata (timestamp, route, status, duration, request ID) — never image
data, ingredients, recipes, or the API key. There are no user accounts, so no
`userId` is ever logged.

## Docs

- `docs/specs/SPEC-01-fridgechef.md` — product/feature spec
- `ARCHITECTURE.md` — architecture decisions and system design
