import { intro, outro, text, select, confirm, spinner, log } from '@clack/prompts'
import { fileURLToPath } from 'url'
import path from 'path'
import { getMe, getWorkspaces } from '../api/toggl.js'
import { saveConfig } from '../config.js'
import { patchSettings, copySkills } from '../claude.js'

function packageRoot(): string {
  // import.meta.url points to dist/cli.js after bundling
  // skills/ is at the same level as dist/
  const distDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(distDir, '..')
}

export async function runInstall(): Promise<void> {
  console.log()
  intro('toggl-cc — Toggl Track for Claude Code')

  // Node version check
  const [major] = process.versions.node.split('.').map(Number)
  if (major < 18) {
    log.error(`Node.js 18+ is required. You're running ${process.versions.node}`)
    process.exit(1)
  }

  // Get API token
  let apiToken = ''
  let workspaceId = 0

  while (true) {
    const token = await text({
      message: 'Enter your Toggl API Token (found at toggl.com/profile):',
      placeholder: 'your-api-token',
      validate: (v) => (v.trim().length === 0 ? 'API token is required' : undefined),
    })

    if (typeof token !== 'string' || token.length === 0) {
      log.error('Setup cancelled.')
      process.exit(0)
    }

    const s = spinner()
    s.start('Validating token...')

    try {
      await getMe(token.trim())
      s.stop('Token valid ✓')
      apiToken = token.trim()
      break
    } catch {
      s.stop('Invalid token — please try again')
    }
  }

  // Detect workspaces
  const s2 = spinner()
  s2.start('Fetching workspaces...')
  const workspaces = await getWorkspaces(apiToken)
  s2.stop(`Found ${workspaces.length} workspace(s)`)

  if (workspaces.length === 1) {
    workspaceId = workspaces[0].id
    log.info(`Using workspace: ${workspaces[0].name}`)
  } else {
    const picked = await select({
      message: 'Select a workspace:',
      options: workspaces.map((w) => ({ value: w.id, label: w.name })),
    })

    if (typeof picked === 'symbol') {
      log.error('Setup cancelled.')
      process.exit(0)
    }

    workspaceId = picked as number
  }

  // Save credentials
  const shouldSave = await confirm({
    message: 'Save credentials to ~/.toggl-cc/config.json?',
    initialValue: true,
  })

  if (shouldSave !== false && typeof shouldSave !== 'symbol') {
    saveConfig({ apiToken, workspaceId, reminderEveryNPrompts: 5 })
    log.success('Credentials saved to ~/.toggl-cc/config.json')
  } else {
    log.info(
      'Credentials not saved. Export TOGGL_API_TOKEN and TOGGL_WORKSPACE_ID to use without a config file.',
    )
  }

  // Copy skills
  const s3 = spinner()
  s3.start('Copying skills to ~/.claude/skills/...')
  try {
    const copied = copySkills(packageRoot())
    s3.stop(`Copied ${copied.length} skill(s): ${copied.join(', ')}`)
  } catch (err) {
    s3.stop('Failed to copy skills')
    log.error(String(err))
  }

  // Patch settings.json
  const s4 = spinner()
  s4.start('Patching ~/.claude/settings.json...')
  try {
    patchSettings()
    s4.stop('Hook added to UserPromptSubmit')
  } catch (err) {
    s4.stop('Failed to patch settings.json')
    log.error(String(err))
  }

  outro(`\
✅ toggl-cc installed!

Skills added to Claude Code:
  /toggl-start [issue]   — start a Toggl timer
  /toggl-stop            — stop the current timer
  /toggl-status          — check timer/branch alignment
  /toggl-pause           — pause hook checks for this session
  /toggl-resume          — resume hook checks
  /toggl-sync-projects   — cache your Toggl projects locally

Tip: run /toggl-sync-projects once to enable project selection when starting timers.

The hook will automatically check your timer on each prompt.
Restart Claude Code for hooks to take effect.`)
}
