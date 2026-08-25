---
name: gitlab-operations
description: "Executes exact GitLab and remote git operations requested by another skill, returning raw results without making workflow decisions. Use when an orchestrator needs issue or MR data, remote branch checks, fetch/pull/push, or another GitLab interaction."
argument-hint: "<exact operation and inputs>"
allowed-tools: Bash, terminal, powershell, glab
disable-model-invocation: true
---

# GitLab Operations

Act as a low-effort GitLab I/O adapter. Execute the operation requested in `$ARGUMENTS` and return its result to the
calling skill.

## Boundary

- The caller owns every decision: what to fetch, which issue or branch to use, what content to send, and what to do with
  the result.
- Do not rank, filter, select, summarize, plan, review, edit content, choose branch names, or decide retries.
- Do not modify source files.
- Run only the minimum `glab` or remote `git` command needed for the exact request.
- Local-only git worktree and branch management belongs to the caller.

## Execution

Use `glab` for GitLab API, issue, and MR operations. If it is not on `PATH`, use `~/.local/bin/glab`. Use `git` only for
requested remote operations such as fetch, pull, or push.

Preserve caller-provided fields, filters, titles, descriptions, branch names, and flags exactly.

### Posting markdown (MR/issue descriptions and notes)

GitLab renders these as markdown, so the exact bytes matter: single `\n` newlines, blank lines between blocks, and
trailing double-spaces (hard line breaks) must reach GitLab unchanged. Inline `-m "..."` arguments mangle them — the
shell collapses runs of spaces and posts literal `\n` sequences as text instead of newlines.

So for any content that spans more than one line or contains markdown:

1. Write the caller's text **verbatim** to a UTF-8 temp file. Do not reflow, wrap, trim, collapse spaces, or rewrite
   `\n`/line endings — copy the bytes as given.
2. Pass it by reading that file raw, never as an inline string:
    - PowerShell: `--description (Get-Content -Raw <file>)` / `-m (Get-Content -Raw <file>)`
    - bash: `--description "$(cat <file>)"` / `-m "$(cat <file>)"`
3. Delete the temp file after the command returns.

Always use `Get-Content -Raw` (or `"$(cat ...)"`): they keep interior blank lines and trailing spaces, whereas a bare
`Get-Content` strips trailing whitespace and splits lines. Only genuinely single-line, markdown-free content may use an
inline `-m`.

Return:

1. The command executed, with secrets redacted.
2. Exit status.
3. Stdout, unchanged when machine-readable output was requested.
4. Stderr or the concise command error on failure.

Do not interpret the result or choose a follow-up operation. Return control to the caller.
