# SPEC-01: FridgeChef — Fridge-to-Recipe Web App

> Produced through inline brainstorming with the user. Saved to docs/specs/SPEC-01-fridgechef.md.
> SPEC.md in the project root is a reference template only — never filled in directly.

---

## Goal

Build and deploy FridgeChef: a stateless, mobile-first web app that turns fridge leftovers into recipe suggestions to reduce food waste. Users input ingredients by typing them or photographing their fridge; the app returns 3 structured recipes with full cooking steps. No accounts, no database, no persistence. Deployed on Vercel.

## Existing system context

N/A — this is a new project. The repository contains only documentation files (AGENT_LOG.md, README.md, PROTOCOL.md, FridgeChef_Project_Brief.md, setup.sh, CHECKLIST.md) and no application code.

- What currently exists and works: documentation files only; no application code
- Files that must NOT be modified: AGENT_LOG.md, PROTOCOL.md, FridgeChef_Project_Brief.md, CHECKLIST.md
- Files that WILL be modified: README.md (Task 7 rewrites it with run instructions)
- Tests currently passing that must continue to pass: none
- Current deployment platform: none (deploying to Vercel in Task 7)
- Environment variables already in use: none

## Tech stack

- Language: TypeScript (strict mode)
- Framework: Next.js 15 (App Router)
- Runtime version: Node.js 20 LTS
- Package manager: npm
- Test command: `npm run test` (Vitest unit tests), `npm run test:e2e` (Playwright)
- Lint/format command: `npm run lint` (ESLint Next.js defaults), `npm run format` (Prettier)
- New dependencies required:
  - `@anthropic-ai/sdk` — Claude API client
  - `zod` — LLM JSON output validation
  - `browser-image-compression` — client-side image downscaling (handles EXIF orientation)
  - `vitest`, `@vitejs/plugin-react`, `@testing-library/react` — unit/component tests
  - `@playwright/test` — E2E tests

## Constraints

- Performance requirements: Recipe response is LLM-bound (~2–6s); a loading/skeleton state is required. No hard SLA. Uploaded images are downscaled client-side to ~1024px long edge (via `browser-image-compression`, which also corrects EXIF rotation) before base64 encoding, to cut image-input tokens and latency.
- Security requirements: `ANTHROPIC_API_KEY` is server-side only — never referenced in client components or exposed via public env vars. All Claude calls go through Next.js route handlers only. Image uploads validated: max 5 MB, MIME restricted to image/jpeg, image/png, image/webp. **Abuse protection (v1):** a best-effort per-IP rate limit of **5 recipe generations per hour** guards the two API routes, so a public deploy cannot drain the Anthropic budget (see Task 8).
- Coding standards: TypeScript strict. ESLint Next.js default config. Prettier defaults. No `any` without an explicit suppression comment.
- Test coverage threshold: 80% line coverage on changed files. Mandatory on the two API route handlers, the Zod parsers, and the rate-limit helper. Playwright E2E covering two happy paths: (1) text input → staples → recipe cards, (2) image upload → confirmation → staples → recipe cards.
- Feature flag strategy: none.
- Auth strategy: N/A — stateless, no user accounts.
- API standards: REST via Next.js App Router route handlers. `POST /api/extract-ingredients` (image → ingredient list), `POST /api/suggest-recipes` (ingredients + pantry staples → 3 recipes).
- External dependencies: Anthropic Claude API only. Model: `claude-haiku-4-5-20251001` (Haiku 4.5), chosen over Sonnet because ingredient extraction and recipe-JSON generation are pattern tasks, not hard reasoning. The model ID lives in exactly one place — a `CLAUDE_MODEL` env var defaulting to the Haiku ID in `lib/claude.ts` — so switching to Sonnet is a one-line change.
- i18n required: no — English only in v1.
- GDPR / data privacy considerations: no PII collected or stored. Uploaded images are processed in-memory in the route handler and discarded after the response; never written to disk, stored, or logged. Ingredient lists are likewise never logged. Stated in README and enforced in code.

## Definition of done

- [ ] All 8 tasks completed and merged to main
- [ ] All previously passing tests still pass
- [ ] Security scan returned CLEAR or LOW only
- [ ] AGENT_LOG.md updated with all entries for this SPEC
- [ ] ARCHITECTURE.md updated if new patterns introduced
- [ ] Both API routes and the Zod parsers have ≥ 80% line coverage
- [ ] Rate-limit helper has ≥ 80% line coverage
- [ ] Playwright E2E: text-input happy path passes
- [ ] Playwright E2E: image-upload happy path passes
- [ ] App deployed to Vercel and reachable at a public URL
- [ ] `ANTHROPIC_API_KEY` absent from any client bundle (verified in build output)
- [ ] Uploaded images confirmed not logged or persisted (code review + security-agent)

## Out of scope

- User accounts, authentication, session management
- Database / any persistence (no localStorage, cookies, or server-side storage)
- Saved recipes, favourites, meal planning
- Multi-language support
- Distributed/durable rate limiting (v1 is best-effort in-memory; Upstash-backed limiting is SPEC-05)
- Monetisation features
- PWA / offline support
- Nutritional information
- Shopping list generation
- Wiring any model other than Haiku 4.5 by default (Sonnet swap is one-line, not a task)

## Future SPECs for this project

- SPEC-02: User accounts + persistent pantry and saved recipes (requires DB + auth; v1 types designed to slot in cleanly)
- SPEC-03: Meal planning and shopping list generation (depends on SPEC-02)
- SPEC-04: Monetisation / subscription gating (depends on SPEC-02 auth)
- SPEC-05: Durable, distributed rate limiting + abuse prevention (Upstash Redis), replacing v1's best-effort in-memory limiter

### Notes for future development

v2 monetisation hinges on persistent pantry and meal-planning, which need a database and auth layer. The v1 `Recipe` and `Ingredient` types (Task 2) are kept clean of UI/stateful concerns so a DB/ORM layer (e.g. Prisma + PostgreSQL) slots into SPEC-02 without refactoring the core domain types.

---

## Task list (ordered)

Each task = one full agent lifecycle: task-agent → test-agent → security-agent → review-agent → merge

---

### Task 1 — Project scaffold and tooling

**Type**: setup

**What**: Initialise Next.js 15 App Router with TypeScript strict and Tailwind. Configure ESLint (Next defaults) and Prettier. Install/configure Vitest (unit) and Playwright (E2E). Create the Anthropic SDK client singleton in `lib/claude.ts` with the `CLAUDE_MODEL` constant. Add `.env.local.example`. Ensure no server-only env vars leak to the client.

**Why**: Everything else depends on the project existing, the SDK initialised, and test tooling in place. Runs on main.

**Files**:
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`
- `.eslintrc.json`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`
- `lib/claude.ts`, `.env.local.example`
- `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (minimal placeholder)

**Existing files modified**: `.gitignore` — ensure `.env.local` is ignored.

**Acceptance criteria**:
- `npm run build` succeeds, no TS or lint errors
- `npm run lint` exits 0
- `npm run test` runs Vitest and exits 0 (no tests yet is fine)
- `npm run test:e2e` runs Playwright (no tests yet — exits 0 or skips)
- `lib/claude.ts` exports an Anthropic singleton and `CLAUDE_MODEL` (default `"claude-haiku-4-5-20251001"`, overridable by env)
- `ANTHROPIC_API_KEY` appears in `.env.local.example` but not in any committed file
- `next.config.ts` does not expose `ANTHROPIC_API_KEY` via `env`/`publicRuntimeConfig`

---

### Task 2 — POST /api/suggest-recipes route handler

**Type**: feature

**What**: Implement `POST /api/suggest-recipes`. Accept `{ ingredients: string[], pantryStaples: string[] }`. Build a Claude prompt passing both lists, requesting exactly 3 recipes as structured JSON. Parse/validate with a Zod schema. Return the validated array or a structured error. Define shared `Recipe`/`Ingredient` types in `lib/types.ts` and schemas in `lib/schemas.ts`.

**Why**: The core value-generating endpoint. Building it before the vision route and UI lets test-agent harden the schema and prompt first.

**Files**:
- `app/api/suggest-recipes/route.ts`, `lib/types.ts`, `lib/schemas.ts`
- `__tests__/api/suggest-recipes.test.ts`

**Existing files modified**: none (imports `lib/claude.ts` read-only).

**Acceptance criteria**:
- Valid body → HTTP 200 + JSON matching Zod `RecipeArraySchema` (exactly 3 recipes)
- Each recipe: `name: string`, `cuisine: string`, `usedIngredients: string[]`, `missingIngredients: string[]`, `cookTimeMinutes: number`, `difficulty: "easy"|"medium"|"hard"`, `steps: string[]`
- `missingIngredients` excludes anything in `pantryStaples` (prompt-enforced, E2E-confirmed in Task 6)
- Malformed Claude JSON → HTTP 500 `{ error: "recipe_parse_error" }`; raw LLM output never returned to client
- Missing/invalid body → HTTP 400 `{ error: "invalid_request" }`
- Vitest (Anthropic SDK mocked) covers: valid path, malformed JSON, missing body, empty ingredients
- Coverage on `route.ts` + `lib/schemas.ts` ≥ 80%

---

### Task 3 — POST /api/extract-ingredients route handler

**Type**: feature

**What**: Implement `POST /api/extract-ingredients`. Accept `multipart/form-data` with an image field. Validate max 5 MB and MIME in {jpeg,png,webp}. Read into memory as a Buffer, base64-encode, send to Claude vision requesting a JSON array of ingredient strings. Parse with Zod. Return the list. Buffer must not be logged or written to disk.

**Why**: The image path is FridgeChef's differentiator. Separate from recipe generation so the UI can insert the confirmation step.

**Files**:
- `app/api/extract-ingredients/route.ts`, `__tests__/api/extract-ingredients.test.ts`

**Existing files modified**: `lib/schemas.ts` — add `IngredientsArraySchema` (`z.array(z.string())`).

**Acceptance criteria**:
- Valid image ≤ 5 MB → HTTP 200 `{ ingredients: string[] }`
- File > 5 MB → HTTP 413 `{ error: "file_too_large" }`
- Non-image MIME → HTTP 415 `{ error: "unsupported_media_type" }`
- Missing file → HTTP 400 `{ error: "invalid_request" }`
- Image processed in-memory; never written to filesystem or logged
- Vitest (SDK mocked) covers: valid image, oversized, wrong MIME, missing file, malformed Claude response
- Coverage on `route.ts` ≥ 80%

---

### Task 4 — Input screen (text and image upload)

**Type**: feature

**What**: Build `app/page.tsx` landing with two input modes: (1) text input (comma-separated or one-per-line), (2) photo upload. Compress images client-side to ~1024px long edge via `browser-image-compression` before sending to `/api/extract-ingredients`. Mobile-first Tailwind layout. Mode toggle between text/photo. "Find Recipes" for text; photo upload auto-advances to confirmation.

**Why**: Entry point. Both paths lead into Task 5, so this UI must exist first.

**Files**:
- `app/page.tsx`, `components/IngredientTextInput.tsx`, `components/PhotoUpload.tsx`, `components/ModeToggle.tsx`

**Existing files modified**: `app/page.tsx` — replaces Task 1 placeholder.

**Acceptance criteria**:
- Mode toggle with "Type ingredients" / "Upload photo"
- Text mode: input + "Find Recipes" button, disabled when empty
- Photo mode: file input restricted to jpeg/png/webp; on select, compress (≤1024px) and upload; loading state shown
- Client-side block of files > 5 MB with a user-facing message before any request
- Usable at 375px width
- No API keys / server-only values referenced in any component

---

### Task 5 — Ingredient confirmation and pantry staples step

**Type**: feature

**What**: Confirmation screen after both paths. Image path shows Claude-extracted ingredients as editable chips; text path shows parsed input as editable chips. Below, a pantry-staples section with quick-tap toggle chips (Salt, Pepper, Olive oil, Butter, Garlic, Common spices) plus a free-text add. **Salt, Pepper, and Olive oil are pre-selected by default** (user can uncheck). "Generate Recipes" calls `/api/suggest-recipes` with `{ ingredients, pantryStaples }` and advances to recipe cards. Client-side state machine (`step: "input" | "confirm" | "recipes"`).

**Why**: The safety net for the image path (user corrects extraction) and the staples feature (both paths) so recipes don't list common items as missing. Bridge between input and output.

**Files**:
- `components/IngredientConfirmation.tsx`, `components/PantryStaples.tsx`, `components/IngredientChip.tsx`

**Existing files modified**: `app/page.tsx` — wire the confirm step into the page-level state machine.

**Acceptance criteria**:
- Text submission → confirmation shows entered ingredients as removable chips
- Image upload → confirmation shows extracted ingredients as removable chips
- User can add an ingredient via a text field
- Staples section shows at least: Salt, Pepper, Olive oil, Butter, Garlic, Common spices as toggle chips
- **Salt, Pepper, Olive oil start selected**; the rest start unselected
- Free-text staple entry adds a chip on Enter/comma
- Selected staples visually distinct from unselected
- "Generate Recipes" disabled while the call is in flight; loading state shown
- On API error, message shown and user can retry without re-uploading
- The `pantryStaples` array sent contains only currently-selected/added staples

---

### Task 6 — Recipe cards UI

**Type**: feature

**What**: Results screen with 3 recipe cards. Each shows name, cuisine, cook time, difficulty badge, used-ingredients (green), missing-ingredients (amber, minimal/hidden if empty), and expandable steps. "Regenerate" re-calls `/api/suggest-recipes` with the same payload. "Start over" returns to input and clears state.

**Why**: Output surface — end of both happy paths, last feature before deploy.

**Files**:
- `components/RecipeCard.tsx`, `components/RecipeList.tsx`, `components/DifficultyBadge.tsx`
- `e2e/text-input-flow.spec.ts`, `e2e/image-upload-flow.spec.ts`, `e2e/fixtures/` (fixture image + mocked API responses)

**Existing files modified**: `app/page.tsx` — wire the recipes step into the state machine.

**Acceptance criteria**:
- 3 cards render for a valid response
- Each card: name, cuisine, cook time ("X min"), difficulty badge colour-coded (easy=green, medium=amber, hard=red)
- `usedIngredients` highlighted (green/checkmark); `missingIngredients` highlighted (amber/warning); empty missing section hidden
- Steps collapsed by default; "Show steps" expands inline
- "Regenerate" re-calls with same payload; loading state shown
- "Start over" returns to input and clears all state
- E2E `text-input-flow.spec.ts`: type → confirm → staples → generate → assert 3 cards (API mocked)
- E2E `image-upload-flow.spec.ts`: upload fixture → confirm → generate → assert 3 cards (API mocked)
- No hard-coded recipe data; all from the API response

---

### Task 7 — Vercel deployment configuration and README

**Type**: setup

**What**: Verify `next.config.ts` is Vercel-safe. Add `vercel.json` only if non-default config is needed. Document required env vars. Rewrite README.md: description, local setup (`npm install`, `.env.local`, `npm run dev`), test instructions, deploy instructions, and the data-privacy statement (images in-memory, never persisted).

**Why**: App must be publicly reachable on Vercel to meet the Definition of Done.

**Files**:
- `vercel.json` (only if needed — task-agent decides), `README.md`

**Existing files modified**: README.md — full rewrite.

**Acceptance criteria**:
- `npm run build` succeeds cleanly
- README covers: local dev, required env vars, `npm run test` / `npm run test:e2e`, Vercel deploy, data-privacy statement
- `ANTHROPIC_API_KEY` listed as a required Vercel env var (dashboard-set, not committed)
- Deployed URL reachable; landing page renders (smoke test)
- Any `vercel.json` created exposes no secrets

---

### Task 8 — Per-IP rate limiting on the API routes

**Type**: feature

**What**: Add a best-effort per-IP rate limit of **5 recipe generations per hour** guarding `/api/suggest-recipes` and `/api/extract-ingredients`. Implement as a small helper (`lib/rate-limit.ts`) using an in-memory sliding-window/token-bucket keyed by client IP (from `x-forwarded-for`), applied in Next.js middleware (`middleware.ts`) or at the top of each route handler. Exceeding the limit returns HTTP 429 `{ error: "rate_limited" }` with a `Retry-After` header. Document the ceiling: in-memory state is per-serverless-instance and resets on cold start, so it throttles casual abuse and bot loops but is not globally durable — SPEC-05 upgrades to Upstash Redis.

**Why**: The app is public and every call costs real Anthropic money; a light cap protects the API budget without adding a managed service. Placed last so it wraps finished routes without blocking their development.

**Files**:
- `lib/rate-limit.ts`, `middleware.ts`, `__tests__/rate-limit.test.ts`

**Existing files modified**: `app/api/suggest-recipes/route.ts`, `app/api/extract-ingredients/route.ts` — invoke the limiter (only if not enforced via middleware).

**Acceptance criteria**:
- 6th generation from the same IP within an hour → HTTP 429 `{ error: "rate_limited" }` + `Retry-After` header
- Under-limit requests pass through unchanged
- Limit is per-IP (distinct IPs don't share a bucket)
- A `// ponytail:` comment names the in-memory ceiling and the Upstash upgrade path
- Vitest covers: under limit, at limit boundary, over limit, window reset, distinct IPs isolated
- Coverage on `lib/rate-limit.ts` ≥ 80%

---

## Decisions confirmed with the user (not guesses)

1. **Model**: Haiku 4.5 behind a single `CLAUDE_MODEL` constant (cheaper/faster; confirmation step is the safety net for missed items).
2. **Pantry-staples step**: included on both paths; **Salt/Pepper/Olive oil pre-selected**, rest off.
3. **Stateless**: no accounts, no DB in v1.
4. **Rate limiting**: 5 generations/hour per IP, best-effort in-memory via middleware (Task 8) — cheap, no managed service; Upstash is SPEC-05.
5. **Navigation**: single-page state machine (`useReducer`), no URL routing between steps.
6. **Test runner**: Vitest (native ESM fit with App Router).
7. **Image compression**: `browser-image-compression` (handles EXIF rotation on phone photos).
8. **Node**: 20 LTS.
9. **`vercel.json`**: skipped unless Task 7 finds a concrete need.
10. **State management**: React `useReducer` in `page.tsx`, no external store.
