#!/usr/bin/env node
export {}

const command = process.argv[2]
const args = process.argv.slice(3)

switch (command) {
  case 'install': {
    const { runInstall } = await import('./commands/install.js')
    await runInstall()
    break
  }
  case 'uninstall': {
    const { runUninstall } = await import('./commands/uninstall.js')
    await runUninstall()
    break
  }
  case 'start': {
    const { runStart } = await import('./commands/start.js')
    await runStart(args)
    break
  }
  case 'stop': {
    const { runStop } = await import('./commands/stop.js')
    await runStop()
    break
  }
  case 'status': {
    const { runStatus } = await import('./commands/status.js')
    await runStatus()
    break
  }
  case 'check': {
    const { runCheck } = await import('./commands/check.js')
    await runCheck()
    break
  }
  default: {
    console.log(`toggl-cc — Toggl Track for Claude Code

Usage:
  npx toggl-cc@latest install          Set up credentials and hooks
  npx toggl-cc@latest uninstall        Remove hooks and skills
  npx toggl-cc@latest start [issue]    Start a timer
  npx toggl-cc@latest stop             Stop the current timer
  npx toggl-cc@latest status           Show timer and branch alignment
  npx toggl-cc@latest check            (used by hook — runs on every prompt)
`)
    process.exit(command ? 1 : 0)
  }
}
