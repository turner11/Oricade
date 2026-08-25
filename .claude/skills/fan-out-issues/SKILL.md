---
name: fan-out-issues
description: "Fan out across the open GitHub backlog and work several issues in parallel, each in its own git worktree. Ranks and assigns issues, delegates per-issue work to work-issue, and every GitHub interaction to github-operations. Usage: /fan-out-issues [concurrency]"
argument-hint: "[concurrency]"
allowed-tools: Bash, Read, Grep, Glob, Agent, terminal, powershell, gh, git
disable-model-invocation: true
---

Fan out across the open GitHub backlog and work several issues **in parallel**, each in its own git worktree. This
skill is the decision-making orchestrator: it ranks and assigns issues, then delegates per-issue work to `work-issue`
and every GitHub interaction to `github-operations`. Argument: concurrency (max parallel workers).

## Delegation Boundary

- This skill owns ranking, filtering, wave composition, branch naming, prompts, PR content, review gates, retries, and
  all other workflow decisions.
- Run `github-operations` for every GitHub or remote-git interaction: issue/PR reads and writes, API calls, remote
  branch checks, fetch, pull/rebase, and push.
- Give `github-operations` the exact operation and inputs. Consume its raw result and decide the next step here.
- Never ask `github-operations` which issue, branch, action, content, retry, or workflow path to choose.
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

- A positive integer → that's the concurrency (max parallel workers) for this wave.
- Empty → default concurrency = **3**.
- Otherwise → tell the user it's invalid and ask for a positive integer or blank for the default.

one run = one wave of up to `concurrency` issues. Re-run the skill to process the next wave. Upgrade path: wrap Steps
2–7 in a loop until the eligible queue is empty.

## Step 2 — Fetch Open Issues + Dependency Text Through GitHub Operations

Run `github-operations` to fetch up to 100 open issues as machine-readable JSON:

```bash
gh issue list --state open --limit 100 --json number,title,body,labels,createdAt,reactionGroups
```

This repo has no formal issue-link graph — dependencies are expressed as prose in the body, e.g. `Depends on: GoJ 04 -
...` or `Depends on #43` (see existing issues for the convention). For each returned issue:

- Scan its `body` for a `Depends on` line. If it names another issue (by `#<number>` or by matching another fetched
  issue's title), that is a dependency.
- If a named dependency's issue is still open (check the fetched set, or `gh issue view <N> --json state` if it wasn't
  in the first 100), this issue `is_blocked_by` that one.
- Derive the reverse relation (`blocks`) by noting, for each issue, how many other fetched issues declare it as their
  dependency.

## Step 3 — Rank & Filter Eligible Issues

**Exclude (ineligible this wave):**

- Any issue that `is_blocked_by` another **open** issue (per the `Depends on` text scan above).
- Any issue that already has an open PR or a live branch (`fix/issue-<number>-*` / `feat/issue-<number>-*`) — check
  with `gh pr list --state open --head <branch>` / `git ls-remote --heads origin`.
- Any issue that is labeled "later".

**Sort the remaining eligible issues by (in order):**

1. Issues labeled `bug` come before `enhancement`/`feature`/anything else.
2. Label severity: `critical` > `high` > `medium` > `low` > unlabeled.
3. **Blocking others** — number of open issues this one `blocks` (from Step 2), descending.
4. Reaction count descending (sum all reaction counts across `reactionGroups`).
5. Oldest `createdAt` first.

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
 1. #42 [bug][high] Crash on empty POI list      → poi/service.js, poi/models.js
 2. #37 [bug, blocks 2] Map fails first load      → map/loader.js
 3. #51 [enhancement] Add language filter          → filters/lang.js
Deferred (file overlap or blocked): #40 (overlaps #42), #33 (blocked by #37)
```

## Step 5 — Fan Out: Plan (Auto / Premium) → Execute (Auto)

Run up to `concurrency` issue-pipelines **concurrently**.

**a. Create an isolated worktree on a fresh branch off `origin/master`.** First run `github-operations` with the exact
request to fetch `origin`. Branch name follows work-issue's rule: `bug` label → `fix/issue-<number>-<slug>`, else
`feat/issue-<number>-<slug>` (slug = title lowercased, non-alphanumerics → `-`, max 40 chars).

```bash
git worktree add -b <branch> ../issue-<number> origin/master
```

**b. Phase 1 — Plan (Auto / Premium).** Launch a subagent running the **plan-issue** skill. **Use Auto / premium
reasoning model** (decided by scope, complexity, and required effort of the specific task) via the Task tool's `model`
parameter. Prompt:

> Working directory: `../issue-<number>`. Run the **plan-issue** skill for issue **#<number>**. Write the plan to
> `../issue-<number>-plan.md`. Return the plan path and a short summary. For every GitHub read, run **github-operations**
> with the exact operation and inputs; do not run `gh` directly.

Await this phase — the executor needs the finished plan.

**c. Phase 2 — Execute (Auto).** Launch a background subagent (`generalPurpose`, `run_in_background: true`). **You MUST
set the model to `auto`** via the Task tool to save budget. Prompt verbatim, filled in:

> Working directory: `../issue-<number>`. Read the plan at `../issue-<number>-plan.md` and follow it. Run the
> **work-issue** skill for issue **#<number>**. **Skip work-issue Steps 3 and 4** and start at Step 5 (🔴 Red) using the
> plan. Follow it through Red → Green → Refactor → full regression → push → open draft PR. Stay within the plan's "Out
> of scope" boundaries. Run tests with `npm run test`. For every GitHub or remote-git operation, run
> **github-operations** with the exact operation, branch, title, description, and flags. **Fail gate:** if you cannot
> get the full test suite green, do NOT open a PR. Stop, leave the worktree, and report back. On success, report the PR
> URL.

Launch every pipeline's executor concurrently.

## Step 6 — Collect Results & Enforce the Test Gate

When each worker completes:

- **Success** (suite green, PR opened) → record the PR URL. **Keep the worktree**.
- **Failure** (tests failed, or errored) → record the reason. **Leave the worktree**. No PR is opened, no review runs.

## Step 7 — Adversary Review ↔ Fix Loop (Premium ↔ Auto)

For **each successful PR**, run a review→fix loop capped at **3** iterations.

**a. Review (Auto / Premium).** Launch a background subagent running **adversary-review** on the PR. **Use Auto /
premium reasoning model** (decided by scope, complexity, and required effort of the specific task) via the Task tool's
`model` parameter:

> Run the **adversary-review** skill on PR **#<pr-number>**. Judge it against YAGNI and the ponytail guidelines, post
> your notes to the PR, and return the bottom-line verdict (READY TO MERGE / NEEDS CHANGES / BLOCK) plus every **open**
> 🔴 and 🟡 item. Run **github-operations** for every PR read or write; do not run `gh` directly.

**b. Branch on the verdict:**

- **READY TO MERGE** → The loop is done. Remove the worktree: `git worktree remove ../issue-<number>` and delete the
  plan.
- **NEEDS CHANGES** → Run a fix pass (step c), then loop back to (a).
- **BLOCK** → Stop looping. Keep the worktree and surface it for user input (step d).

**c. Fix pass (Auto → Mid).** Launch a background subagent (`generalPurpose`, `run_in_background: true`). **You MUST set
the model to `auto`** by default. If the *previous* fix pass on this PR stalled (couldn't get green, or same 🔴
returned), escalate to a **mid-tier model** for the retry. Prompt:

> Working directory: `../issue-<number>`. Address these open items — must-fix (🔴): <verbatim 🔴 items>; should-change
> (🟡): <verbatim 🟡 items>. Make the smallest correct change, staying inside the plan at `../issue-<number>-plan.md`.
> Re-run the suite with `npm run test`. **Fail gate:** if you cannot get the suite green, do NOT push — stop and report
> what failed. On green, commit and push via **github-operations**, then report done.

**d. Stop and hand back to the user** when:

- **BLOCK** verdict.
- The **same 🔴 persists** across two consecutive reviews **even after the mid-tier escalation retry**.
- A fix pass **can't get the suite green even on the mid tier**.
- The **iteration cap (3)** is reached.

## Step 8 — Report

Print a single summary table showing a severity icon **only for a category that still has open items**.

```text
✅ #42  fix/issue-42-crash-empty-poi     → PR #210 (draft) — review: READY ✅ after 2 rounds (worktree removed)
🛑 #37  fix/issue-37-map-first-load      → PR #211 (draft) — review: BLOCK, needs your call (2 🔴), worktree kept at ../issue-37
🔧 #51  feat/issue-51-language-filter    → PR #212 (draft) — review: stalled at cap (1 🟡 open), worktree kept at ../issue-51
❌ #60  feat/issue-60-add-export         → tests failing (test_export), worktree left at ../issue-60
⏭  Deferred to next wave: #40, #33
```

When done summarize for user: how many PRs opened; each PR's final verdict showing only the severity icons that still
have open items; which PRs need a human decision and why (BLOCK, stalled at cap, same 🔴 unresolved, or a fix pass that
couldn't go green) and where their worktrees are; which issues failed before review; and that re-running
`/fan-out-issues` picks up the deferred + newly-unblocked issues.
