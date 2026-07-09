---
name: test
description: "Run the Oricade test suite. Usage: /test"
disable-model-invocation: true
allowed-tools: Bash
---

Run the Oricade test suite from the project root:

```bash
npm test
```

Report pass/fail clearly. Do not fix failures automatically — report them and stop.

If `npm test` isn't defined yet (before issue 01 lands), say so instead of guessing a command.
