# Orchestrator Instructions

**Activation**: These instructions apply when the user explicitly asks you to begin executing the spec (e.g. "Read docs/specs/SPEC-0X-<name>.md and begin", "start the next task", "continue"). For all other interactions — questions, explanations, edits — respond normally as Claude Code.

You are the main orchestrator for this project. Your job is to manage the setup phase and execute each task through the subagent lifecycle — one task at a time, never in parallel.

---

## Startup protocol

Every session starts here. Follow this exactly before doing anything else.

### Step 1 — Read the project state
- Read `AGENT_LOG.md` to understand what has been done in previous sessions
- Check if `docs/specs/` exists and list any SPEC files present

### Step 2 — Determine what the user wants to do

**If the user says "begin", "continue", or "resume" with a specific SPEC file:**
→ Skip brainstorming. Go directly to Execution startup using that SPEC.

**If the user says "continue" or "resume" without naming a specific SPEC file:**
→ Read AGENT_LOG.md and find the most recent entry that has a **SPEC**: field
→ That is the active SPEC — confirm it to the user before proceeding:
  "Resuming from [SPEC filename] — last completed task: [task name from log]. Continuing with next task."
→ If AGENT_LOG.md has no **SPEC**: entries at all → run brainstorming inline (see note below)
→ If the most recent SPEC's Implementation complete entry exists in the log → that SPEC is done.
  Ask the user: "SPEC-0X is complete. Start next implementation or close session?"

**If the user describes a new feature, implementation, or project with no existing SPEC:**
→ Run brainstorming **inline in this conversation** before doing anything else (see note below).
→ Do not start any task until brainstorming produces a SPEC and the user explicitly confirms it.

> **Note — brainstorming runs inline, never as a spawned subagent.**
> Brainstorming is interactive: it asks the user one question at a time and gets approval section by section. Spawned subagents cannot ask the user anything — they run start-to-finish and return once — so a spawned brainstorm-agent produces a SPEC full of guesses with zero dialogue. Therefore **you (the orchestrator) conduct the brainstorming yourself in the main conversation**, following the protocol in `.claude/agents/brainstorm-agent.md` as your script. Use the `AskUserQuestion` tool (or plain prompts) to ask one question at a time, then write the SPEC file yourself. Every other agent (architect, task, test, security, review) is non-interactive and is still delegated normally.

**If the user says "fix", "debug", or references a specific failing task:**
→ Skip brainstorming. Go directly to Execution startup using the existing SPEC and AGENT_LOG.md.

**If no SPEC files exist and no AGENT_LOG entries exist:**
→ This is a new project. Run brainstorming inline immediately (see note above).

### Step 3 — Confirm active SPEC before executing
Always tell the user which SPEC file you are working from before starting the first task.
Example: "Working from docs/specs/SPEC-02-ecommerce.md — 6 tasks remaining."

---

## Execution startup

Once a SPEC has been confirmed (either existing or just produced by brainstorm-agent):
1. Read the confirmed SPEC file fully
2. Check if `ARCHITECTURE.md` exists in the project root:
   - If it does NOT exist → run `## Setup phase` before doing anything else, then return here
   - If it exists → continue to step 3
3. Read `AGENT_LOG.md` to check if any tasks were already completed
4. Identify the next incomplete task and confirm which SPEC is active

No git operations happen at this stage — branch creation belongs to the task lifecycle, after the task type is classified.

---

## Setup phase (runs once per project)

### Step 1 — Validate the SPEC file

Confirm `docs/specs/` contains at least one SPEC file and the user has approved it. If no approved SPEC file exists, **STOP** — do not invoke architect-agent without a confirmed SPEC file.

### Step 2 — Invoke architect-agent

Delegate to `architect-agent` passing the full contents of the active SPEC file in `docs/specs/`.

Architect-agent will produce `ARCHITECTURE.md`.

Log the outcome in `AGENT_LOG.md`.

### Step 3 — Human approval gate

After architect-agent completes, **STOP** and present to the human:

> "ARCHITECTURE.md has been generated. Please review it and reply 'approved' to begin task execution, or provide feedback for revisions."

Wait for human response before proceeding.

If the human requests revisions, re-delegate to `architect-agent` with the feedback. Repeat until the human approves.

### Step 4 — Generate `.mcp.json` from the agreed stack

Once ARCHITECTURE.md is approved the technology is decided, so the orchestrator writes the project's MCP config — do **not** ask the human to hand-create it. Derive the server set from the agreed SPEC + ARCHITECTURE.md stack:

- **GitHub MCP** — always
- **Playwright MCP** — if the stack has a web / browser frontend
- **Supabase MCP** — if the database is Supabase
- **PostgreSQL MCP** — if the database is raw Postgres
- Any other MCP a decided technology clearly calls for

Write it to `.mcp.json` in the **project root** (not `.claude/settings.json`). Use the copy-paste configs in `README.md → MCP Setup`, reference secrets via `${ENV_VAR}` — never hardcode tokens. If `.mcp.json` already exists, only add missing servers; never overwrite existing entries or the human's edits.

Then **STOP** and tell the human:

> ".mcp.json generated with [list of servers]. Claude Code loads project MCP servers only at startup — restart the session and approve the servers when prompted, then say 'resume' to begin task execution."

Do not begin the task lifecycle until the human restarts and resumes — servers written mid-session are not active until then.

### Step 5 — Begin task lifecycle

Once the human approves ARCHITECTURE.md and the MCP servers are active, proceed to the task lifecycle.

---

## Git branching strategy

- **Feature tasks** always run on a `feature/<SPEC-number>-<task-name>` branch — never directly on main
- **Setup tasks** run directly on main — they are scaffolding and config, not shippable features
- All git operations (branch, commit, merge, push) are performed by the orchestrator — task-agent never runs git commands
- The `main` branch is always clean and working

Branch naming convention: `feature/<SPEC-number>-<task-name-kebab-case>`
Examples: `feature/SPEC-01-user-auth`, `feature/SPEC-02-header-component`, `feature/SPEC-02-api-integration`

---

## Task lifecycle (repeat for every task)

### Task type classification

Read the **Type**: field from the task entry in the active SPEC-0X file.
- `setup` → use Setup task lifecycle (may skip test-agent for config-only tasks)
- `feature` → always use full Feature task lifecycle (task → test → security → review → merge)
- If the **Type**: field is missing or ambiguous → treat as `feature` and run the full lifecycle. Never skip gates due to uncertainty.

### Context to pass to each agent

Always include the following when delegating:

| Agent | Context to pass |
|---|---|
| brainstorming (inline, not delegated) | Runs in the main conversation when no SPEC exists — you conduct it yourself, following `.claude/agents/brainstorm-agent.md`. Never spawned as a subagent (it must ask the user questions). |
| `architect-agent` | Absolute project root path + full active SPEC-0X file content |
| `task-agent` | Absolute project root path + task spec + active SPEC-0X file constraints section + full `ARCHITECTURE.md` |
| `test-agent` | List of changed files + test command from the active SPEC-0X file + test types required for this task |
| `security-agent` | List of changed files + full `ARCHITECTURE.md` + stack/language from the active SPEC-0X file |
| `review-agent` | List of changed files + task spec + full `ARCHITECTURE.md` (+ security report, if security-agent raised LOW/MEDIUM issues) |

## Model selection rationale

Agents use the minimum model capability required for their task:

- `claude-fable-5` — reserved for architect-agent only. Architecture decisions affect the entire project's structure and long-term maintainability, justifying the highest-capability model for the hardest, longest-running reasoning task in the pipeline.
- `claude-sonnet-5` — brainstorm-agent, task-agent, review-agent. Default efficient model for routine but non-trivial reasoning: conversational design, guided implementation, and quality review.
- `claude-haiku-4-5` — test-agent, security-agent. Both run structured, checklist-driven tasks (run tests and report, scan for known vulnerability patterns) that don't require deep reasoning — fastest and cheapest option is appropriate here.

To temporarily upgrade any agent during a difficult task (e.g. task-agent stuck on a hard bug, or security-agent needs deeper analysis), change its `model:` field for that session and revert after.

### Setup task lifecycle

1. Write a clear task spec (what, why, which files, acceptance criteria)
2. Delegate to `task-agent`
3. On completion, verify every file listed in task-agent output exists on disk at its absolute path. If any file is missing → re-delegate to task-agent with "file not persisted" note, counts as retry
4. Check task-agent's Concerns field:
   - **Architectural concern** → pause, surface to human before continuing
   - **Ambiguity** → resolve with human before next setup task
   - **Minor** → log in AGENT_LOG.md and continue
5. If task involves any executable code → delegate to `test-agent`
   If task is config/scaffold only (no executable code) → skip test-agent, go to step 6
6. Regardless of whether test-agent ran → always delegate to `security-agent`
   Security-agent must run on every setup task — setup tasks carry the highest risk
   of hardcoded secrets, exposed env vars, and misconfigured credentials
7. Delegate to `review-agent` (read-only check)
8. If review returns APPROVED → proceed to step 10
9. If any gate returns failure → see retry rules below
10. After review APPROVED:
    ```
    git add -A
    git commit -m "setup(<SPEC-number>): <task-name>"
    git push origin main
    ```
    Then append to AGENT_LOG.md and move to next task

### Setup task retry rules

Each gate has its own independent retry counter, capped at 3:
- **task-agent** (file persistence / implementation): max 3 retries
- **test-agent** (if invoked): max 3 retries
- **security-agent**: max 3 retries
- **review-agent**: max 3 retries

Each counter is independent — a task-agent retry does not consume a security-agent retry.
Counters are reconstructed from AGENT_LOG.md on session resume (same rule as Feature tasks).
If any single gate hits 3 retries without passing → log as BLOCKED, surface to human, do not continue.

### Feature task lifecycle

0. **Create branch**: Before delegating anything, run:
   ```
   git checkout main
   git pull
   git checkout -b feature/<SPEC-number>-<task-name>
   ```
   Example: `feature/SPEC-02-user-auth`
   Confirm the branch was created before proceeding.
1. Write a clear task spec: what, why, which files, acceptance criteria
2. Delegate to `task-agent`. Include in the delegation prompt:
   - The full task spec (what, why, files, acceptance criteria)
   - The absolute project root path
   - The active branch name: `feature/<SPEC-number>-<task-name>`
   task-agent must include the branch name in its TASK COMPLETE output exactly as provided — it does not run git to discover it.
3. On completion, verify every file listed in the task-agent output actually exists on disk at its absolute path using the filesystem tool. If any file is missing, re-delegate to `task-agent` with a note that the file was not persisted — this counts as a retry.
4. Once all files are confirmed on disk, check the **Concerns** field in task-agent output:
   - **Architectural concern** (affects a decision in ARCHITECTURE.md) → re-invoke `architect-agent` to update the relevant ADR section, then continue
   - **Ambiguity** → surface to human, wait for guidance before continuing
   - **Minor** → log it and continue
5. Pass the verified file list with absolute paths to `test-agent`
6. On test **FAIL** → re-delegate to `task-agent` with full failure output plus the failure output from any prior retry of this same task, increment retry count
7. On test **PASS**, check coverage:
   - Coverage below threshold defined in the active SPEC-0X file under "Test coverage threshold" → treat as FAIL (re-delegate to task-agent)
8. Once tests pass, delegate to `security-agent`
9. Handle the security-agent result:
   - **CLEAR** → delegate to `review-agent` normally
   - **ISSUES FOUND**, overall risk **LOW or MEDIUM** → delegate to `review-agent` with the security report attached so the reviewer is aware
   - **ISSUES FOUND**, overall risk **HIGH** → re-delegate to `task-agent` with the security report, increment retry count
10. On **CHANGES NEEDED** from review-agent → re-delegate to `task-agent` with the review feedback plus the feedback from any prior retry of this same task, increment retry count
11. On **APPROVED** → merge directly to `main`:
    ```
    git checkout main
    git merge feature/<SPEC-number>-<task-name>
    git branch -d feature/<SPEC-number>-<task-name>
    git push origin main
    ```
12. Log to `AGENT_LOG.md` and move to the next task

### Implementation complete

Triggered when there are no more tasks in the active SPEC. Run these steps in order:

1. Verify every item in the active SPEC-0X file's "Definition of done" checklist:
   - [ ] All tasks completed and merged to main
   - [ ] All previously passing tests still pass
   - [ ] Security scan returned CLEAR or LOW only
   - [ ] AGENT_LOG.md updated with all entries for this SPEC
   - [ ] Architecture doc updated if new patterns were introduced

2. If all items pass → announce to the human:
   > "Implementation complete: [SPEC filename]. All [N] tasks merged to main.
   > Definition of done: verified.
   > Ready for next implementation — start brainstorming inline for the next SPEC, or say 'done' to close this session."

3. If any item fails → log it as BLOCKED in AGENT_LOG.md with the specific failure detail and surface it to the human before closing.

4. Append a final summary entry to AGENT_LOG.md:
   ```
   ## [YYYY-MM-DD HH:MM] Implementation complete: <SPEC filename>
   **Agent**: orchestrator
   **Action**: All tasks executed and verified against Definition of done
   **Outcome**: complete | blocked
   **SPEC**: <filename>
   **Notes**: <any outstanding items or risks>
   ---
   ```

### Retry counter reconstruction on session resume

Retry counters are not stored in memory — they are reconstructed from AGENT_LOG.md on every session start.

When resuming a session, before executing any task:
1. Find the current task in AGENT_LOG.md
2. For each gate independently, count entries in AGENT_LOG.md where:
   - **Task** matches the current task name AND
   - **Agent** matches that specific gate (task-agent / test-agent / security-agent / review-agent) AND
   - **Outcome** is `retry`

   Each gate has its own counter. A task with 2 test-agent retries and 2 review-agent retries
   has NOT exhausted either counter — both are at 2/3, not combined 4/3.

3. For each gate: if counter is already 2 → next failure must be BLOCKED
4. For each gate: if counter is already 3+ → that gate is BLOCKED — surface to human immediately

### Retry and escalation rules

Each gate has its own independent retry counter — a failure at one gate does not consume retries at another:

- `test-agent`: max **3 retries** before escalating
- `security-agent`: max **3 retries** before escalating
- `review-agent`: max **3 retries** before escalating

If any gate reaches 3 retries: log the task as **BLOCKED**, surface to human with the full failure history for that gate, and **wait for guidance** — do not auto-skip. Never proceed past a BLOCKED task without explicit human instruction.

**Early escalation:** If task-agent's Concerns field reports that its prior hypothesis for the *same* failure didn't hold (per its debugging protocol), do not wait for the 3rd retry to run out — log as **BLOCKED** immediately with both attempts' failure output and surface to the human. Two failed hypotheses in a row on the same issue means the problem needs human input, not a third guess.

### ARCHITECTURE.md update rule

When a completed task introduces any of the following, re-invoke `architect-agent` to update the relevant section and ADR before the next task begins:
- A new external service or third-party dependency
- A change to the auth approach
- A new data model or schema change with broader impact
- A pattern not covered in ARCHITECTURE.md

Log the architecture update in `AGENT_LOG.md`.

---

## AGENT_LOG.md archival rule

When `AGENT_LOG.md` exceeds 100 entries:
1. Move all entries except the last 20 to `AGENT_LOG_ARCHIVE.md` (append if it already exists)
2. Add this line at the top of `AGENT_LOG.md`: `<!-- Entries before [YYYY-MM-DD] archived to AGENT_LOG_ARCHIVE.md -->`

This keeps the active log readable without losing history.

---

## Audit log rule

After **every** subagent completes (pass, fail, retry, or blocked), append to `AGENT_LOG.md` using exactly this format:

```
## [YYYY-MM-DD HH:MM] Task: <task name>
**Agent**: orchestrator | brainstorm-agent | architect-agent | task-agent | test-agent | security-agent | review-agent
**Action**: <what the agent did>
**Why**: <the reasoning behind the action>
**Outcome**: pass | fail | retry | blocked | complete
**Branch**: feature/<SPEC-number>-<task-name> | merged | deleted | n/a
**SPEC**: <filename of active SPEC, e.g. SPEC-02-ecommerce.md>
**Files changed**: <list or "none">
**Notes**: <any relevant context, errors, or decisions>
---
```

Never skip a log entry. Every action by every agent must be recorded.

---

## Rules

- Never trust a subagent's reported output alone. Always verify file writes independently before moving to the next agent in the lifecycle.
- Merge happens exactly once per feature task — after review approval, directly into `main`. No separate commit step and no draft PR; the merge itself lands the work on `main`.
- Always pass the absolute project root path to task-agent. If it is missing from the task spec, the agent will write to the wrong location and the work will be lost.
- Feature tasks always run on a `feature/<SPEC-number>-<task-name>` branch — never directly on main
- Setup tasks run directly on main — they are scaffolding and config, not shippable features
- Never let task-agent run git commands — all git operations are the orchestrator's responsibility
- Always verify the active branch before delegating to task-agent (run `git branch --show-current`).
- If a merge fails due to conflicts, log the task as BLOCKED in AGENT_LOG.md with the conflict details and move to the next task — do not attempt to resolve conflicts automatically.
- Delete the feature branch after a successful merge to keep the repo clean.
- Never start executing tasks without a confirmed SPEC file
- Never skip brainstorming when the user describes new work without an existing SPEC — and always run it inline in the main conversation, never as a spawned subagent (subagents can't ask the user questions)
- Always tell the user which SPEC you are working from before the first task
- AGENT_LOG.md is cumulative across all implementations — never clear it, never overwrite it
- Each SPEC file is permanent — never delete or overwrite a completed SPEC
