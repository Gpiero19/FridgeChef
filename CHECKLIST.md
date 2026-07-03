# New project checklist

Complete every item before telling the orchestrator to begin.
Do not skip items. Do not move to the next section until the current one is done.

---

## 1. Git

- [ ] `git init` run in project root
- [ ] `git branch -M main` run to set main branch
- [ ] Scaffold files copied into project (no `ARCHITECTURE.md` present — if it exists, delete it)
- [ ] `PROTOCOL.md` present in project root (your step-by-step guide)

---

## 2. Environment files

- [ ] `.env` created (real values, never committed)
- [ ] `.env.example` created (keys only, no values — this gets committed)
- [ ] `.gitignore` in place and includes `.env`

---

## 3. MCP configuration

- [ ] `.claude/settings.json` updated with `mcpServers` for this project
- [ ] GitHub MCP token verified: run `echo $GITHUB_TOKEN` in terminal — must print a value
- [ ] DB MCP token verified (if using Supabase or Postgres): run `echo $SUPABASE_ACCESS_TOKEN` or `echo $DATABASE_URL`
- [ ] Playwright installed (if using Playwright MCP): `npx playwright install`
- [ ] MCP tools configured in `.claude/settings.json`

---

## 4. SPEC — brainstorm-agent session

- [ ] brainstorm-agent session completed and SPEC-0X file saved to `docs/specs/`
- [ ] User has reviewed and confirmed the SPEC file before execution began

---

## 5. SPEC-0X — task list

- [ ] Every task has an explicit **Type** (`setup` or `feature`) — a missing Type silently defaults to `feature`, so set it deliberately
- [ ] Every task has a clear **What**, **Why**, **Files**, **Existing files modified**, and **Acceptance criteria**
- [ ] Tasks ordered so that no task depends on a task that comes after it
- [ ] Acceptance criteria are testable — if you cannot write a test for it, rewrite the criterion

---

## 6. Initial commit

- [ ] `git add .`
- [ ] `git commit -m "chore: initialize project scaffold"`

---

## Ready

All boxes checked? Open Claude Code and say:

> "Read docs/specs/SPEC-0X-<name>.md and begin"

The orchestrator will confirm the SPEC-0X file exists in `docs/specs/` and has been approved, run architect-agent, and pause for your review of `ARCHITECTURE.md` before any code is written.

---

## Architecture review (after orchestrator produces ARCHITECTURE.md)

Do not approve without reading every section.

- [ ] **API contract** — error format correct, endpoints match your expectations, versioning right
- [ ] **Data architecture** — schema matches your mental model, relationships correct, migration strategy clear
- [ ] **Auth approach** — matches what you specified, token storage matches your infrastructure
- [ ] **External dependencies** — every service listed, fallbacks realistic
- [ ] **Async jobs** — all slow operations (email, file processing, etc.) listed
- [ ] **Performance baseline** — numbers pulled from the active SPEC-0X file correctly
- [ ] **ADRs** — every "assumed because the active SPEC-0X file did not specify" entry reviewed and either accepted or corrected

Only reply "approved" when you would be comfortable building the entire project on this document.
