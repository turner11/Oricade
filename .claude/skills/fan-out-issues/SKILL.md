---
name: fan-out-issues
description: "Orchestrates work on multiple GitLab issues in parallel, delegating all GitLab I/O to gitlab-operations and each implementation to work-issue. Ranks and assigns non-conflicting issues, enforces tests, and opens an MR per issue. Use when the user wants to batch through the backlog or parallelize issue work. Usage: /fan-out-issues [concurrency]"
argument-hint: "[concurrency]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, Agent, terminal, powershell
disable-model-invocation: true
---

Fan out across the open GitLab backlog and work several issues **in parallel**, each in its own git worktree. This skill
is the decision-making orchestrator: it ranks and assigns issues, then delegates per-issue work to `work-issue`
and every GitLab interaction to `gitlab-operations`. Argument: `$ARGUMENTS` = max parallel workers.

## Delegation Boundary

- This skill owns ranking, filtering, wave composition, branch naming, prompts, MR content, review gates, retries, and
  all other workflow decisions.
- Run `gitlab-operations` for every GitLab or remote-git interaction: issue/MR reads and writes, API calls, remote
  branch checks, fetch, pull/rebase, and push.
- Give `gitlab-operations` the exact operation and inputs. Consume its raw result and decide the next step here.
- Never ask `gitlab-operations` which issue, branch, action, content, retry, or workflow path to choose.
- Local git status, branch, and worktree operations stay in this orchestrator.

## Model Selection — Budget Optimization & Auto Routing

**Cost-effectiveness is a strict requirement.** Heavy reliance on premium models for standard tasks rapidly drains the
budget. Set the model per subagent via the Task tool's `model` parameter using this exact tiering:

- **Execution + Fixes (High Volume) — ALWAYS use `auto`.** Executing a finished plan (Step 5c) and applying the
  reviewer's listed fixes (Step 7c) is mechanical and safely guarded by the full test suite. This represents the bulk of
  the tokens and scales with `concurrency`. You must use `auto` for all execution tasks to maximize budget utilization.
- **Planning + Review (Auto Default, Premium Allowed).** Plan (Step 5b) and adversary review (Step 7a) are the
  low-volume, high-leverage tasks where errors carry a high price. Over-engineering in the plan affects the whole diff,
  and a missed bug during review ships to production. Use `auto` by default for these steps, but you may allocate
  premium models (e.g., Opus/Sonnet thinking variants) when justified by the scope, complexity, and required effort of
  the specific task.
- **Escalation — Mid Tier.** If an `auto` executor stalls (cannot get tests green, or the same 🔴 persists), retry that
  **one** specific fix pass by bumping it from `auto` to a mid-tier model. Do not run the entire wave at a premium
  level.


## Step 1 — Parse Arguments

- `$ARGUMENTS` is a positive integer → that's the concurrency (max parallel workers) for this wave.
- Empty → default concurrency = **3**.
- Otherwise → tell the user it's invalid and ask for a positive integer or blank for the default.

one run = one wave of up to `concurrency` issues. Re-run the skill to process the next wave. Upgrade path: wrap Steps
2–7 in a loop until the eligible queue is empty.

## Step 2 — Fetch Open Issues + Dependency Links Through GitLab Operations

Run `gitlab-operations` to fetch up to 20 open issues as machine-readable JSON with `iid`, `title`, `description`,
`labels`, `weight`, `upvotes`, and `created_at`.

For each returned issue, run `gitlab-operations` again to fetch `projects/:id/issues/<iid>/links`. Use each link's
`link_type` (`blocks`, `is_blocked_by`, or `relates_to`) without asking the I/O skill to interpret it.

## Step 3 — Rank & Filter Eligible Issues

**Exclude (ineligible this wave):**

- Any issue that `is_blocked_by` another **open** issue.
- Any issue that already has an open MR or a live branch (`fix/issue-<iid>-*` / `feature/issue-<iid>-*`).
- Any issue that is labeled "later".

**Sort the remaining eligible issues by (in order):**

1. **Priority** — `weight` descending, then `upvotes` descending.
2. **Blocking others** — number of open issues this one `blocks`, descending.
3. **Open time** — oldest `created_at` first.

## Step 4 — Predict Files & Assemble a Non-Conflicting Wave

The **top priority is avoiding merge conflicts between parallel workers**. Build the wave by greedy selection down the
ranked list:

1. Predict the likely touched-file set for each candidate issue (title + body text), confirming with a quick `grep`/
   `glob`.
2. Walk the ranked list top-down. Add an issue to the wave **only if** its predicted file set is disjoint from every
   issue already selected.
3. Stop when the wave holds `concurrency` issues or the list is exhausted.

Print the plan before spawning anything:

```text
Wave (concurrency 3):
 1. #42 [weight 5] Crash on empty POI list        → poi/service.py, poi/models.py
 2. #37 [weight 3, blocks 2] Map fails first load  → map/loader.py
 3. #51 [weight 1] Add language filter             → filters/lang.py
Deferred (file overlap or blocked): #40 (overlaps #42), #33 (blocked by #37)
```

## Step 5 — Fan Out: Plan (Auto / Premium) → Execute (Auto)

Run up to `concurrency` issue-pipelines **concurrently**.

**a. Create an isolated worktree on a fresh branch off `origin/master`.** First run `gitlab-operations` with the exact
request to fetch `origin`. Branch name follows work-issue's rule: `bug` label → `fix/issue-<iid>-<slug>`, else
`feature/issue-<iid>-<slug>` (slug = title lowercased, non-alphanumerics → `-`, max 40 chars).

```bash
git worktree add -b <branch> ../clarify-<iid> origin/master
```

**b. Phase 1 — Plan (Auto / Premium).** Launch a subagent running the **plan-issue** skill. **Use Auto / premium
reasoning model** (decided by scope, complexity, and required effort of the specific task) via the Task tool's `model`
parameter. Prompt:

> Working directory: `../clarify-<iid>`. Run the **plan-issue** skill for issue **#<iid>**. Write the plan to
> `../clarify-<iid>-plan.md`. Return the plan path and a short summary. For every GitLab read, run **gitlab-operations**
> with the exact operation and inputs; do not run `glab` directly.

Await this phase — the executor needs the finished plan.

**c. Phase 2 — Execute (Auto).** Launch a background subagent (`generalPurpose`, `run_in_background: true`). **You MUST
set the model to `auto`** via the Task tool to save budget. Prompt verbatim, filled in:

> Working directory: `../clarify-<iid>`. Read the plan at `../clarify-<iid>-plan.md` and follow it. Run the
> **work-issue** skill for issue **#<iid>**. **Skip work-issue Steps 3 and 4** and start at Step 5 (🔴 Red) using the plan.
> Follow it through Red → Green → Refactor → full regression → push → open MR. Stay within the plan's "Out of scope"
> boundaries. Run tests with `uv run pytest`. For every GitLab or remote-git operation, run **gitlab-operations** with the
> exact operation, branch, title, description, and flags. **Fail gate:** if you cannot get the full test suite green, do
> NOT open an MR. Stop, leave the worktree, and report back. On success, report the MR URL.

Launch every pipeline's executor concurrently.

## Step 6 — Collect Results & Enforce the Test Gate

When each worker completes:

- **Success** (suite green, MR opened) → record the MR URL. **Keep the worktree**.
- **Failure** (tests failed, or errored) → record the reason. **Leave the worktree**. No MR is opened, no review runs.

## Step 7 — Adversary Review ↔ Fix Loop (Premium ↔ Auto)

For **each successful MR**, run a review→fix loop capped at **3** iterations.

**a. Review (Auto / Premium).** Launch a background subagent running **adversary-review** on the MR. **Use Auto /
premium reasoning model** (decided by scope, complexity, and required effort of the specific task) via the Task tool's
`model` parameter:

> Run the **adversary-review** skill on MR **!<mr-id>**. Judge it against YAGNI and the ponytail guidelines, post your
> notes to the MR, and return the bottom-line verdict (READY TO MERGE / NEEDS CHANGES / BLOCK) plus every **open** 🔴 and
> 🟡 item. Run **gitlab-operations** for every MR read or write; do not run `glab` directly.

**b. Branch on the verdict:**

- **READY TO MERGE** → The loop is done. Remove the worktree: `git worktree remove ../clarify-<iid>` and delete the
  plan.
- **NEEDS CHANGES** → Run a fix pass (step c), then loop back to (a).
- **BLOCK** → Stop looping. Keep the worktree and surface it for user input (step d).

**c. Fix pass (Auto → Mid).** Launch a background subagent (`generalPurpose`, `run_in_background: true`). **You MUST set
the model to `auto`** by default. If the *previous* fix pass on this MR stalled (couldn't get green, or same 🔴
returned), escalate to a **mid-tier model** for the retry. Prompt:

> Working directory: `../clarify-<iid>`. Address these open items — must-fix (🔴): <verbatim 🔴 items>; should-change
> (🟡): <verbatim 🟡 items>. Make the smallest correct change, staying inside the plan at `../clarify-<iid>-plan.md`. Re-run
> the suite with `uv run pytest`. **Fail gate:** if you cannot get the suite green, do NOT push — stop and report what
> failed. On green, commit and push via **gitlab-operations**, then report done.

**d. Stop and hand back to the user** when:

- **BLOCK** verdict.
- The **same 🔴 persists** across two consecutive reviews **even after the mid-tier escalation retry**.
- A fix pass **can't get the suite green even on the mid tier**.
- The **iteration cap (3)** is reached.

## Step 8 — Report

Print a single summary table showing a severity icon **only for a category that still has open items**.

```text
✅ #42  fix/issue-42-crash-empty-poi     → MR !210 (draft) — review: READY ✅ after 2 rounds (worktree removed)
🛑 #37  fix/issue-37-map-first-load      → MR !211 (draft) — review: BLOCK, needs your call (2 🔴), worktree kept at ../clarify-37
🔧 #51  feature/issue-51-language-filter → MR !212 (draft) — review: stalled at cap (1 🟡 open), worktree kept at ../clarify-51
❌ #60  feature/issue-60-add-export      → tests failing (test_export), worktree left at ../clarify-60
⏭  Deferred to next wave: #40, #33
```

When done summarize for user: how many MRs opened; each MR's final verdict showing only the severity icons that still
have open
items; which MRs need a human decision and why (BLOCK, stalled at cap, same 🔴 unresolved, or a fix pass that couldn't go
green) and where their worktrees are; which issues failed before review; and that re-running `/fan-out-issues` picks up
the deferred + newly-unblocked issues.
