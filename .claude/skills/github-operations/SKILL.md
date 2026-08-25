---
name: github-operations
description: "Executes exact GitHub and remote git operations requested by another skill, returning raw results without making workflow decisions. Use when an orchestrator needs issue or PR data, remote branch checks, fetch/pull/push, or another GitHub interaction."
argument-hint: "<exact operation and inputs>"
allowed-tools: Bash, terminal, powershell, gh
disable-model-invocation: true
---

# GitHub Operations

Act as a low-effort GitHub I/O adapter. Execute the operation requested in `$ARGUMENTS` and return its result to the
calling skill.

## Boundary

- The caller owns every decision: what to fetch, which issue or branch to use, what content to send, and what to do with
  the result.
- Do not rank, filter, select, summarize, plan, review, edit content, choose branch names, or decide retries.
- Do not modify source files.
- Run only the minimum `gh` or remote `git` command needed for the exact request.
- Local-only git worktree and branch management belongs to the caller.

## Execution

Use `gh` for GitHub API, issue, and PR operations. Use `git` only for requested remote operations such as fetch, pull,
or push.

Preserve caller-provided fields, filters, titles, descriptions, branch names, and flags exactly.

### Posting markdown (PR/issue descriptions and comments)

`gh` accepts a `--body-file <path>` flag on `gh issue create`, `gh pr create`, `gh issue comment`, and `gh pr comment` —
it reads the file's bytes directly, so multi-line markdown, blank lines, and trailing hard-line-breaks survive intact.
Never pass multi-line or markdown content inline via `-b`/`--body`; the shell mangles embedded newlines.

So for any content that spans more than one line or contains markdown:

1. Write the caller's text **verbatim** to a UTF-8 temp file. Do not reflow, wrap, trim, or rewrite line endings.
2. Pass it with `--body-file <file>`.
3. Delete the temp file after the command returns.

Only genuinely single-line, markdown-free content may use an inline `-b`/`--body`.

To dedupe a comment across re-runs (avoid posting the same status twice), use `--edit-last --create-if-none` on
`gh pr comment` / `gh issue comment`: it edits the caller's own most recent comment if one exists on that issue/PR,
otherwise it creates a new one. `--edit-last` alone errors when no prior comment exists — `--create-if-none` is
required for the fallback.

Return:

1. The command executed, with secrets redacted.
2. Exit status.
3. Stdout, unchanged when machine-readable output (`--json ...`) was requested.
4. Stderr or the concise command error on failure.

Do not interpret the result or choose a follow-up operation. Return control to the caller.
