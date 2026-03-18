import { confirm, log, outro } from '@clack/prompts'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { unpatchSettings, removeSkills } from '../claude.js'

export async function runUninstall(): Promise<void> {
  console.log()

  // Remove hook from settings.json
  try {
    unpatchSettings()
    log.success('Removed hook from ~/.claude/settings.json')
  } catch (err) {
    log.warn(`Could not restore settings.json: ${String(err)}`)
  }

  // Remove skills
  const removed = removeSkills()
  if (removed.length > 0) {
    log.success(`Removed skills: ${removed.join(', ')}`)
  }

  // Optionally remove ~/.toggl-cc/
  const togglDir = path.join(os.homedir(), '.toggl-cc')
  if (fs.existsSync(togglDir)) {
    const shouldRemove = await confirm({
      message: 'Remove credentials and state from ~/.toggl-cc/?',
      initialValue: false,
    })

    if (shouldRemove === true) {
      fs.rmSync(togglDir, { recursive: true })
      log.success('Removed ~/.toggl-cc/')
    }
  }

  outro('toggl-cc uninstalled. Restart Claude Code for changes to take effect.')
}
