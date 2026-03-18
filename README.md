# toggl-cc

[![npm version](https://badge.fury.io/js/toggl-cc.svg)](https://www.npmjs.com/package/toggl-cc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

Toggl Track integration for Claude Code. Start timers from slash commands, get automatic reminders when no timer is running, and get warned when your active timer doesn't match your current git branch.

## Install

```bash
npx toggl-cc@latest install
```

That's it. The installer handles everything interactively — credentials, workspace selection, skills, and hooks.

## Getting your Toggl API token

1. Log in at [toggl.com](https://toggl.com)
2. Click your avatar → **Profile settings**
3. Scroll to the bottom of the page
4. Copy the token under **API Token**

## Usage

After install, three slash commands are available in Claude Code:

| Command | Description |
|---|---|
| `/toggl-start [issue]` | Start a timer. Pass an issue number, description, or nothing (uses current branch). |
| `/toggl-stop` | Stop the running timer and see elapsed time. |
| `/toggl-status` | Show the running timer and whether it matches your git branch. |

### Examples

```
/toggl-start 42
# Fetches "Fix login bug" from gh issue 42 → timer: "#42 Fix login bug"

/toggl-start write tests for auth module
# Timer: "write tests for auth module"

/toggl-start
# Uses current git branch name as description

/toggl-stop
# ⏹  Stopped: #42 Fix login bug — 1h 23m

/toggl-status
# ✅  Timer running: #42 Fix login bug (47m) — branch matches
```

## How the hook works

During install, toggl-cc adds a `UserPromptSubmit` hook to `~/.claude/settings.json`. This runs `npx toggl-cc@latest check` before every prompt you submit to Claude Code.

**The check command:**
- Runs in under 1 second when the cache is warm (60s TTL)
- Is completely silent when everything looks good
- Prints a reminder every N prompts (default: 5) when no timer is running
- Warns you if your running timer's issue number doesn't match your current git branch

**Mismatch detection logic:**
1. Extract issue number from timer description (e.g. `#42`)
2. Extract issue number from branch name (e.g. `feat/99/update-dashboard` → `99`)
3. If both have numbers and they differ → warn
4. If only one has a number → check for word overlap between the timer description and branch name
5. If neither has a number → silent (can't compare)

**Example warning:**
```
⚠️  Heads up — timer mismatch detected!

  Timer:  #42 Fix login bug  (running 47m)
  Branch: feat/99/update-dashboard

Looks like you may have switched tasks. Options:
  • /toggl-stop then /toggl-start to track this branch instead
  • /toggl-status for full details
  • Keep going — this message won't block you
```

## Configuration

### Environment variables

If you prefer not to store credentials in a file, export these before starting Claude Code:

```bash
export TOGGL_API_TOKEN=your-api-token
export TOGGL_WORKSPACE_ID=12345678
```

Env vars take precedence over the config file.

### Config file

`~/.toggl-cc/config.json`

| Field | Description | Default |
|---|---|---|
| `apiToken` | Toggl API token | — |
| `workspaceId` | Toggl workspace ID | — |
| `reminderEveryNPrompts` | How often to remind you when no timer is running | `5` |

## Uninstall

```bash
npx toggl-cc@latest uninstall
```

Restores your original `~/.claude/settings.json` from the backup created during install, removes the three skills from `~/.claude/skills/`, and optionally removes `~/.toggl-cc/`.

## Contributing

Issues and PRs welcome. Please open an issue before submitting a large change so we can discuss the approach first.
