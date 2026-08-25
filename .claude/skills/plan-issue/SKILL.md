---
name: plan-issue
description: "Produce a minimal, YAGNI/ponytail-aligned implementation plan for a GitLab issue: root cause, exact files and functions to change, the failing tests to write, the smallest fix, reuse notes, and what to leave alone. Runs at higher effort and hands the plan to a cheaper worker to execute. Use as the planning step in fan-out-issues, or before implementing any issue. Usage: /plan-issue <issue-number>"
argument-hint: "<issue-number>"
allowed-tools: Bash, Read, Grep, Glob, Write, glab
disable-model-invocation: true
---

Plan the smallest correct change for a GitLab issue, then hand the plan off for a cheaper worker to execute. You do the
thinking so the executor doesn't have to. **Do NOT write implementation or test code** — only the plan. Argument:
`$ARGUMENTS` = issue number.

**GitLab CLI:** all commands use `glab`. If `glab` is not on `PATH`, fall back to `~/.local/bin/glab`.

**Run at higher effort.** Planning is where over-engineering is prevented or introduced — reason hard about the
*smallest* change before committing to the plan.

## Step 1 — Read the Issue

```bash
glab issue view <number> --comments
```

Nail down: what's actually broken or needed, expected vs. actual behavior, and the real acceptance criteria.

## Step 2 — Explore Before You Plan

- `grep`/`glob` for the function/class/keyword names from the issue to find the true source files.
- Read the affected code **and** its existing tests (learn the naming, fixtures, assertion style).
- Hunt for reusable helpers/utils/patterns already in the repo — the plan must reuse, not reinvent.
- Note the test command (this repo: `uv run pytest`; see work-issue's `references/test-commands.md`).

## Step 3 — Pick the Smallest Correct Change (ponytail ladder)

Stop at the first rung that holds, and record which one in the plan:

1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse it.
3. Does the stdlib / an installed dep / a native feature already do this?
4. Can it be one line?
5. Only then: the minimum code that works.

If it's a bug: find the **root cause**, not the symptom. Grep every caller of the function you'd touch — fix the shared
function once rather than patching one call path and leaving siblings broken.

## Step 4 — Write the Plan to the Handoff File

Write the plan to the path given by the caller (fan-out uses `../clarify-<iid>-plan.md`, a sibling of the worktree so
it's never committed). Use this format:

```markdown
# Plan: #<number> <title>

## Root cause / goal

<what and why, 2-4 sentences. For bugs: the actual cause, not the symptom.>

## Ladder rung

<which rung the change stops at, e.g. "Rung 2 — reuse existing `foo_util`">

## Files to change

- `path/to/file.py` — <exact function/class and what changes>

## Reuse (do not reinvent)

- <existing helper/pattern to use, with its path>

## 🔴 Red — tests to add

- `tests/test_x.py::test_<name>` — <exact behavior it asserts, tied to acceptance criteria>

## 🟢 Green — minimal implementation

<the smallest approach that makes the tests pass. No code, just the approach.>

## The one runnable check

<the single check that fails if this logic breaks (unless the change is a trivial one-liner)>

## Out of scope — do NOT touch

<files/behaviors the executor must leave alone, to prevent scope creep>

## Open risks

<edge cases, calibration needs, or unknowns the executor should watch>
```

## Step 5 — Hand Off

Return: the plan file path and a 2-3 sentence summary (root cause + chosen rung + number of tests planned) so the caller
can launch the cheaper execution worker.
