# Project Protocol

Your step-by-step guide for every new project using this scaffold.
Follow in order. Do not skip steps.

---

## Phase 0 — One-time global setup
> Do this once when you first set up the scaffold. Never again unless you change machines or rotate tokens.

- [ ] Run `bash ~/Documents/GitHub/Scaffolding/setup.sh` — must show all green
- [ ] `GITHUB_TOKEN` set in `~/.zshrc` and verified with `echo $GITHUB_TOKEN`
- [ ] Playwright browsers installed (setup.sh handles this)

If all green, you never touch Phase 0 again until your token expires in 90 days.

---

## Phase 1 — Create the project

```bash
mkdir my-project-name
cd my-project-name
git init
git branch -M main
```

Copy the scaffold into the project:

```bash
cp -r ~/Documents/GitHub/Scaffolding/.claude .
cp ~/Documents/GitHub/Scaffolding/.gitignore .
cp ~/Documents/GitHub/Scaffolding/AGENT_LOG.md .
cp ~/Documents/GitHub/Scaffolding/CHECKLIST.md .
cp ~/Documents/GitHub/Scaffolding/PROTOCOL.md .
cp ~/Documents/GitHub/Scaffolding/README.md .
cp ~/Documents/GitHub/Scaffolding/setup.sh .
```

**Do not copy `SPEC.md`** — it is a template that lives only in the scaffold repo for reference. The orchestrator and every agent work exclusively from `docs/specs/SPEC-0X-<feature-name>.md`, produced by `brainstorm-agent`. Never fill in or read a root-level `SPEC.md` in the actual project.

**Do not copy ARCHITECTURE.md** — it must not exist at the start. Architect-agent creates it.

Open the project in VSCode:

```bash
code .
```

---

## Phase 2 — Configure MCP for this project

Open `.claude/settings.json` and add the `mcpServers` block for this project.

Every project needs at minimum:

```json
{
  "permissions": { ... },
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

If the project uses a database, add Supabase or Postgres MCP too.
See `README.md → MCP Setup` for copy-paste configs.

---

## Phase 3 — Run brainstorm-agent to produce the SPEC

Open Claude Code in the project folder:

```bash
claude
```

Set mode to **Auto** — leave it on Auto for the entire project.

Tell Claude something like:

> "I'm starting a new project. Here's what I'm building: [describe your project]"

With no SPEC file in `docs/specs/` and no `AGENT_LOG.md` entries, the orchestrator activates `brainstorm-agent` automatically. It asks one question at a time, proposes design alternatives, and writes the result to `docs/specs/SPEC-0X-<feature-name>.md` through conversation — you never fill in a file by hand.

Brainstorm-agent works through, in order:

1. Goal
2. Existing system context (protected files, files that will change, tests that must keep passing — for existing projects)
3. Tech stack
4. Constraints
5. Out of scope
6. Task list — one task at a time, ordered by dependency

Brainstorm-agent will gather all of the following Constraints fields through conversation.
Make sure each one is explicitly addressed before the SPEC is saved:

- Performance requirements
- Security requirements
- Coding standards
- Test coverage threshold (e.g. "80% line coverage on changed files")
- Feature flag strategy (yes/no and approach)
- Auth strategy (or "N/A")
- API standards (REST / GraphQL / tRPC / etc.)
- External dependencies (third-party services and APIs)
- i18n required (yes/no)
- GDPR / data privacy considerations

If brainstorm-agent does not ask about one of these fields,
prompt it explicitly: "We haven't covered [field] yet."

**The task list is the most important part.** Each task must have:
- Clear acceptance criteria you could write a test for
- A realistic scope (one session, no human guidance needed mid-task)
- No dependency on a task that comes after it

Review `docs/specs/SPEC-0X-<feature-name>.md` and confirm it before moving on — brainstorm-agent will not hand off to the orchestrator without your explicit confirmation.

---

## Phase 4 — Pre-flight check

Before triggering the orchestrator, open `CHECKLIST.md` and check every box.

Do not skip the checklist. It exists to catch the mistakes that cost days.

When every box is checked, make your initial commit:

```bash
git add .
git commit -m "chore: initialize project scaffold"
```

---

## Phase 5 — Run the orchestrator

In Claude Code (still in Auto mode), tell it:

> "Continue with docs/specs/SPEC-01-<feature-name>.md"

The orchestrator will:
1. Confirm `docs/specs/` contains an approved SPEC file
2. Run architect-agent — reads the confirmed SPEC-0X file and produces ARCHITECTURE.md
3. **Stop and wait for your approval**

---

## Phase 6 — Review and approve ARCHITECTURE.md

This is the most important human step. Read every section before approving.

Go through this checklist:

- [ ] **API contract** — error format correct, endpoints match expectations, versioning right
- [ ] **Data architecture** — schema matches your mental model, relationships correct
- [ ] **Auth approach** — matches your decision in the SPEC-0X file, token storage is correct
- [ ] **External dependencies** — every service listed, fallbacks realistic
- [ ] **Async jobs** — all slow operations listed (emails, file processing, etc.)
- [ ] **Performance baseline** — numbers pulled correctly from the SPEC-0X file, or sensible defaults if none were specified
- [ ] **ADRs** — every "assumed because the SPEC-0X file did not specify" reviewed and accepted or corrected
- [ ] **Caching strategy** — makes sense for the project
- [ ] **Rollback strategy** — clear and realistic

If anything is wrong, give specific feedback:
> "The auth strategy should use Redis sessions, not JWT. Update ADR-004 and Section 4."

Architect-agent reruns and you review again.

Only reply **"approved"** when you would build the entire project on this document.

---

## Phase 7 — Task execution

Once you approve, the orchestrator runs the task loop automatically.

**Your role during execution:** monitor and respond to pauses.

The orchestrator will stop and wait for you when:

| Event | What to do |
|---|---|
| Task **BLOCKED** (3 retries at one gate) | Read the full failure history. Provide guidance or confirm to skip. Don't skip without understanding why. |
| Task **BLOCKED** (early escalation) | Can happen before the 3rd retry. Task-agent follows a reproduce → isolate → one-fix protocol on every retry; if its second consecutive attempt at the same failure doesn't hold, the orchestrator escalates to BLOCKED immediately instead of burning a 3rd retry on a third guess. Read both failed attempts before responding. |
| Security-agent finds **critical** vulnerability | Read the finding carefully. Never dismiss without understanding it. |
| Task-agent raises an **architectural concern** | Read it. If it affects ARCHITECTURE.md, the orchestrator will re-run architect-agent. |
| All tasks in the active SPEC-0X file are complete | The orchestrator will announce completion and prompt you to confirm before closing the implementation. See `CLAUDE.md` § Implementation complete. |

Task-agent also self-verifies before reporting complete: it re-runs each acceptance criterion itself (executing the behavior, not just reading the code) rather than letting test-agent catch problems first. Its output includes a "Verification performed" field — worth a glance when reviewing what shipped.

**What not to do during execution:**
- Do not manually edit files agents are working on
- Do not change the SPEC-0X file in `docs/specs/` without telling the orchestrator
- Do not approve a BLOCKED task just to keep moving

---

## Phase 8 — Done

> Before running this checklist, verify the active SPEC-0X file's "Definition of done"
> section has been checked by the orchestrator. This checklist is the human-side
> confirmation of the same gate.

When all tasks complete:

- [ ] Run smoke test on staging
- [ ] Verify AGENT_LOG.md has entries for every task
- [ ] Review ARCHITECTURE.md — update if the project evolved during execution
- [ ] Merge to main branch
- [ ] Deploy to production

When both this checklist and the SPEC-0X Definition of done are fully checked,
the implementation is officially closed. Tell the orchestrator: "Implementation confirmed."
to trigger the final AGENT_LOG summary entry.

---

## Quick reference — commands

```bash
# Phase 0 check (anytime)
bash ~/Documents/GitHub/Scaffolding/setup.sh

# Start a new project
mkdir my-project && cd my-project && git init && git branch -M main

# Open Claude Code
claude

# Trigger orchestrator (after brainstorm-agent's SPEC-0X file is confirmed and checklist done)
"Continue with docs/specs/SPEC-01-<feature-name>.md"

# Approve architecture
"approved"

# Resume after reviewing a BLOCKED task
"[your guidance here], continue"
```

---

## Token renewal reminder

Your `GITHUB_TOKEN` expires in 90 days. When it does:
1. Generate a new token at github.com/settings/tokens (same settings as before)
2. Update `~/.zshrc` — replace the old token value
3. Run `source ~/.zshrc`
4. Run `bash setup.sh` to confirm all green
