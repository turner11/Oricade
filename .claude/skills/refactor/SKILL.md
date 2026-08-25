---
name: refactor
description: >-
  Performs surgical code refactoring to improve maintainability without changing
  behavior. Use when code is hard to understand, functions are too large, code
  smells need addressing, adding features is difficult, or the user asks to
  clean up or refactor code.
license: MIT
---

# Refactor

Improve code structure and readability without changing external behavior. Refactoring is gradual evolution, not
revolution — use for improving existing code, not rewriting from scratch. Target high cohesion and low coupling.

## When to Use

- Code is hard to understand or maintain
- Functions or classes are too large
- Code smells need addressing
- Adding features is difficult due to code structure
- User asks to "clean up this code", "refactor this", or "improve this"

## Parse Arguments

- If `$ARGUMENTS` is a path to a folder or file, refactor that scope.
- If empty, use the project root.

## Golden Rules

1. **Behavior is preserved** — refactoring changes how, not what.
2. **Small steps** — tiny changes, test after each.
3. **Version control** — commit before and after each safe state.
4. **Tests are essential** — without tests, you're editing, not refactoring.
5. **One thing at a time** — don't mix refactoring with feature changes.

## When NOT to Refactor

- Code that works and won't change again
- Critical production code without tests (add tests first)
- Under a tight deadline
- Without a clear purpose

## Workflow

1. Ensure tests exist for the target code; add them if missing.
2. Identify the smell or structural problem (see [reference.md](reference.md)).
3. Apply one small transformation.
4. Run tests.
5. Commit if green; repeat.

## Refactoring Checklist

- [ ] All existing tests pass
- [ ] New tests cover refactored paths if coverage was missing
- [ ] No behavior changes
- [ ] Code is more readable than before
- [ ] No new warnings
- [ ] Commit message explains the refactoring

## Additional Resources

For the full code smell catalog, extract-method patterns, type-safety guidance, design patterns, step-by-step
operations, and examples, see [reference.md](reference.md).
