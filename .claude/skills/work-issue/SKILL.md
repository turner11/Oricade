---
name: work-issue
description: >-
  Works on a GitLab issue using TDD (Red→Green→Refactor) with a clean branch and
  draft MR. Use when the user wants to pick up, fix, implement, or start work on
  a GitLab issue — e.g. "work on issue", "fix bug #N", "pick up an issue", or
  "start a new task". Usage: /work-issue [issue-number]
argument-hint: "[issue-number]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, terminal, powershell, glab
disable-model-invocation: true
---

Work on a GitLab issue from the repo using TDD. Argument: `$ARGUMENTS`

**GitLab CLI:** all issue/MR commands use `glab`. If `glab` is not on `PATH`, fall back to `~/.local/bin/glab` (
substitute that path in every command below).

## Step 1 — Parse Arguments

If `$ARGUMENTS` is a non-empty positive integer → treat it as the issue number and jump to **Step 3**.
If `$ARGUMENTS` is empty → continue to Step 2.
Otherwise (non-numeric string, URL, negative number, etc.) → inform the user the argument is invalid and ask for a valid issue number or leave blank to browse open issues.

## Step 2 — Fetch & Rank Open Issues

Fetch open issues as JSON (fields include `iid`, `title`, `labels`, `upvotes`, `created_at`):
```bash
glab issue list --per-page 100 -O json
```

**Rank by (in order):**
1. Issues labeled `bug` come before `enhancement`, `feature`, or anything else.
2. Within the same type, rank by label severity: `critical` > `high` > `medium` > `low` > unlabeled.
3. Tiebreak: total reaction count descending (sum all reaction types across `reactionGroups`).
4. Final tiebreak: oldest `createdAt` first (they've waited longest).

Display a clean numbered table:
```
 1. #42 [bug][high] Crash when POI list is empty (reactions: 5)
 2. #37 [bug]       Map not loading on first launch (reactions: 2)
 3. #51 [enhancement] Add filter by language (reactions: 0)
```

Ask the user which issue number they'd like to work on.

## Step 3 — Read the Issue & Explore Context

```bash
glab issue view <number> --comments
```

If the command fails (issue doesn't exist, permissions error, etc.), report the error clearly and return to Step 2.
If the issue is closed, inform the user and ask whether to proceed anyway or pick a different issue.

**Understand the issue:**
- What is broken or needed.
- Expected vs. actual behavior from the issue body.


**Explore the relevant codebase:**
- Make sure to understand the code base, the problem and affects before starting to work
- Use grep/glob to find source files related to the issue (search for relevant function names, class names, keywords from the issue).
- Read existing tests for the affected module to understand naming conventions, fixture patterns, and assertion styles.
- Note any shared utilities or helpers that might be reusable — avoid duplicating existing code.

For test commands by layer, see `references/test-commands.md`.

Print a brief summary: issue title, affected layer(s), relevant files found, and your plan.

## Step 4 — Ensure Clean State & Create Branch

**Check for uncommitted changes:**
```bash
git status --porcelain
```
If the output is non-empty, warn the user and ask whether to stash (`git stash`), commit, or abort.

**Sync with main:**
```bash
git checkout main && git pull origin main
```

**Create the feature branch.** Choose the prefix based on labels:
- `bug` label → `fix/issue-{number}-{slug}`
- Anything else → `feature/issue-{number}-{slug}`

Slug = issue title lowercased, spaces and punctuation replaced by `-`, truncated at a word boundary to max 40 chars (never cut mid-word).

```bash
git checkout -b <branch-name>
```

If the branch already exists locally or on the remote, ask the user whether to check it out and continue from where it left off, or delete it and start fresh.

## Step 5 — 🔴 Red Phase: Write Failing Tests

Write test(s) that **precisely** capture the expected behavior described in the issue.

Rules:
- Check for existing tests related to this issue first. Extend rather than duplicate.
- Tests must be specific — test the exact behavior from the issue, not general coverage.
- Do NOT write implementation code yet.
- Place tests in the appropriate test file (or create a new one following project conventions observed in Step 3).
- Run the suite and confirm the new test(s) **fail** (see `references/test-commands.md` for commands with `-k` filtering).

Report: `🔴 Red: <N> test(s) failing as expected`

Commit:
```
test: add failing tests for #<number> — <brief description>
```

## Step 6 — 🟢 Green Phase: Implement the Fix

Write the **minimal** code change to make the failing tests pass.

- Before writing new logic, check for existing utility functions, helpers, or patterns in the codebase that can be reused.
- Make sure to understand the code base, the problem and affects before starting to work
- Keep it simple and do not modify whatever is not related directly to the task at hand
- Run the targeted tests again to confirm they now pass.
- If tests still fail, investigate and adjust the implementation.

Report: `🟢 Green: <N> test(s) passing`

Commit prefix:
-[`COMPONENT / TOPIC`]
followed by based on labels:
- Issue has `bug` label → `fix:`
- Otherwise → `feat:`
  e.g. `[LLM] fix:`

```
<prefix> <short description>

Closes #<number>
```

## Step 7 — ✅ Refactor Phase

Review the new code for:
- Clarity and readability
- Duplication with existing helpers/utilities
- Consistency with surrounding code patterns (check nearby files if unsure)

Refactor if improvements are clear. Re-run targeted tests to confirm still green.

Report: `✅ Refactor: <what changed>` OR `✅ Refactor: no changes needed`

If code changed, commit:
```
refactor: clean up <description>
```

## Step 8 — Full Regression Check

Run the **complete** test suite for all affected layer(s) to catch regressions (see `references/test-commands.md` for full-suite commands).

If any pre-existing tests break, investigate and fix before proceeding. Do not push code that breaks existing tests.

Report: `✅ Full suite: <N> tests passing, 0 failures`

## Step 9 — Push + Open Draft MR

```bash
git push -u origin <branch-name>
```

If push fails (e.g., upstream changes), rebase and retry:
```bash
git pull --rebase origin main
git push -u origin <branch-name>
```

Then open a draft MR using the template in `assets/mr-template.md`. Populate the template with:

- The issue number for `Closes #<number>`.
- A 1-3 sentence summary of the change.
- The list of files changed and what was modified in each.
- The number of new tests added.
- Confirmation that the full suite passes.
- Specific manual smoke-test steps from the issue.

Write the filled-in template to a temp file, then create the MR (source branch defaults to the current branch).
PowerShell:

```powershell
glab mr create --draft --target-branch main --title "<issue title>" --description (Get-Content -Raw <filled-template-file>) --remove-source-branch --yes
```

bash equivalent: `--description "$(cat <filled-template-file>)"`.

If `glab mr create` reports an MR already exists for this branch, open it with `glab mr view --web` instead of creating
a duplicate.

Return the MR URL to the user.
