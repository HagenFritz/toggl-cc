---
name: toggl-start
description: Start a Toggl Track timer for the current GitHub issue or task. Use when beginning work on an issue or task to start time tracking.
disable-model-invocation: false
user-invocable: true
argument-hint: "[issue-number or description]"
allowed-tools: Bash
---

Start a Toggl timer for the current task by running:

```bash
npx toggl-cc@latest start $ARGUMENTS
```

Show the output to the user. If the command asks for confirmation (timer already running), relay the question to the user and pass their answer back.
