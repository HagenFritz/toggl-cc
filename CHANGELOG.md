# Changelog

## [1.0.0] - 2026-03-18

Initial release.

- `install` command: interactive setup, credential storage, skills copy, settings.json hook injection
- `uninstall` command: restore settings.json, remove skills, optionally remove config
- `start` command: start a Toggl timer with optional issue number or description
- `stop` command: stop the running timer and show elapsed time
- `status` command: show running timer and branch alignment
- `check` command: fast hook-mode check with 60s cache, mismatch detection, and periodic reminders
- Three Claude Code skills: `/toggl-start`, `/toggl-stop`, `/toggl-status`
