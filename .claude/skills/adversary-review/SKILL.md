---
name: adversary-review
description: "Adversarially review a GitHub pull request against YAGNI and ponytail (lazy senior dev) guidelines. Flags unnecessary code, abstractions, dependencies, and boilerplate; verifies the fix targets root cause and is covered by a real check; posts notes to the PR and returns a bottom-line merge-readiness verdict. Use when reviewing a PR, gating a merge, or as the review step in fan-out-issues. Usage: /adversary-review <pr-number-or-branch>"
argument-hint: "<pr-number-or-branch>"
allowed-tools: Bash, Read, Grep, Glob, gh
disable-model-invocation: true
---

Play the adversary on a pull request. Your job is not to be nice — it's to find the code that shouldn't exist, then
decide if the PR is safe to merge. Argument: `$ARGUMENTS` = PR number or branch.

**GitHub CLI:** all commands use `gh`.

**Run at higher effort.** This review demands more scrutiny than the code that produced the PR — reason carefully before
writing the verdict.

## Step 1 — Load the PR, Its Diff, and the Issue

```bash
gh pr view <pr> --comments
gh pr diff <pr>
```

Read the linked issue (from the `Closes #N` in the description) with `gh issue view <N>` so you can judge **scope** —
the diff should solve that issue and nothing else.

**Check for a prior review.** The `--comments` output already lists the notes — scan for an earlier
`### Adversary review` comment. If one exists, record its **bottom-line verdict** and its **🔴 + 🟡 list**; on this run
you must assess what moved against them.

## Step 2 — Attack the Diff Against YAGNI + Ponytail

For every added chunk, ask the ladder in order and flag the first rung it fails:

1. **Does this need to exist at all?** (YAGNI) Speculative config, options, hooks, or "future-proofing" nobody asked
   for → cut it.
2. **Does it reinvent something already in the repo?** Duplicated helper/util/pattern instead of reusing the existing
   one → flag it (grep to prove the original exists).
3. **Does it ignore the stdlib / an installed dep / a native platform feature?** Hand-rolled code for a solved problem →
   flag it.
4. **Could it be shorter?** Boilerplate, needless abstraction/indirection, a class where a function would do, clever
   over boring → flag it.
5. **New dependency** that could have been avoided → flag it, name the avoidance.

Then the correctness checks ponytail does *not* skip:

- **Root cause, not symptom.** If this is a bug fix, is the shared function fixed once, or was only the reported call
  path patched while sibling callers stay broken? Grep the callers to confirm.
- **The one runnable check.** Non-trivial logic must leave behind ONE check that fails if the logic breaks. Missing →
  flag it. (Trivial one-liners are exempt.)
- **Trust-boundary input validation, error handling that prevents data loss, security, accessibility** — ponytail is
  never lazy about these.
- **Scope creep.** Anything in the diff unrelated to the issue → flag it for removal or a separate PR.
- Any `ponytail:` shortcut comment: is the named ceiling acceptable, and is the upgrade path honest?

## Step 3 — Post Notes to the PR + Return the Verdict

Post one consolidated comment to the PR. Use `--edit-last --create-if-none` so re-runs update the same comment instead
of piling up new ones (plain `--edit-last` errors when there's no prior comment to edit):

```bash
gh pr comment <pr> --body-file <review-file> --edit-last --create-if-none
```

**Write for a human skimming the PR.** The comment must be short, concise, and self-contained — a reviewer should grasp
what changed, why, and your verdict without opening the diff or the issue. Keep the whole comment under ~150 words.
Plain language, no filler, no restating the diff line by line, no praise padding. Omit any severity bullet that would
just say "none".

Use this body format:

```markdown
### Adversary review

**What & why:** <1-2 plain sentences: what this PR actually changes, why it exists, and your overall read on its
quality (from the diff + linked issue). Self-contained — the reader shouldn't need to open anything else.>

**Assessment:** <1-2 sentences judging it against YAGNI/ponytail — is it the smallest correct change?>

**Since last review:** <ONLY if a prior review exists: in plain words, which previously-flagged items are now fixed and
which are still open, plus any regression, and whether the verdict moved. Do NOT print a severity icon for a category
with no open items — write "the two blockers are fixed", never "all 🔴 resolved".>

- 🔴 Must fix before merge: <blocking issue>
- 🟡 Should change: <cheap simplification/cleanup>
- 🟢 Optional: <nice-to-have>

**Bottom line:** READY TO MERGE ✅ | NEEDS CHANGES 🔧 | BLOCK ⛔ — <one sentence why>
```

Show a severity icon (🔴/🟡/🟢) **only where that category has at least one open item**: list only the bullets that apply,
and never write any line that displays an icon for an empty category (no "all 🔴 resolved"). A reader must see at a
glance which severities are still live. Drop the "Since last review" line entirely on a first review.

Verdict rules:

- **READY TO MERGE** — no 🔴, tests present and passing, scope matches the issue.
- **NEEDS CHANGES** — one or more 🔴 or 🟡 that are cheap to address.
- **BLOCK** — wrong approach, symptom-only fix, missing tests on non-trivial logic, or scope far beyond the issue.
- **On a re-run**, judge the *current* state, but explicitly flag any unresolved prior 🔴 and any regression (a
  previously-fixed item that broke again). If every prior 🔴/🟡 is resolved and nothing new is wrong → READY TO MERGE.

Return the bottom-line verdict and the 🔴 list to whoever invoked you (e.g. the fan-out orchestrator).
