import fs from 'fs'
import path from 'path'
import os from 'os'

const SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json')
const BACKUP_FILE = path.join(os.homedir(), '.claude', 'settings.json.toggl-cc-backup')
const SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills')

const HOOK_COMMAND = 'npx toggl-cc@latest check'

const HOOK_ENTRY = {
  matcher: '',
  hooks: [
    {
      type: 'command',
      command: HOOK_COMMAND,
      timeout: 8,
    },
  ],
}

interface HookDef {
  type: string
  command: string
  timeout?: number
}

interface HookBlock {
  matcher: string
  hooks: HookDef[]
}

interface ClaudeSettings {
  hooks?: {
    UserPromptSubmit?: HookBlock[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function patchSettings(): void {
  let settings: ClaudeSettings = {}

  if (fs.existsSync(SETTINGS_FILE)) {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    settings = JSON.parse(raw) as ClaudeSettings
    // Write backup before modifying
    fs.writeFileSync(BACKUP_FILE, raw, 'utf-8')
  }

  if (!settings.hooks) settings.hooks = {}
  if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = []

  // Don't add duplicate
  const alreadyAdded = settings.hooks.UserPromptSubmit.some((block) =>
    block.hooks?.some((h) => h.command === HOOK_COMMAND),
  )

  if (!alreadyAdded) {
    settings.hooks.UserPromptSubmit.push(HOOK_ENTRY)
  }

  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf-8')
}

export function unpatchSettings(): void {
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, SETTINGS_FILE)
    fs.unlinkSync(BACKUP_FILE)
    return
  }

  // No backup — surgically remove the hook entry
  if (!fs.existsSync(SETTINGS_FILE)) return

  const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
  const settings = JSON.parse(raw) as ClaudeSettings

  if (settings.hooks?.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      (block) => !block.hooks?.some((h) => h.command.includes('toggl-cc')),
    )
  }

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf-8')
}

export function copySkills(packageRoot: string): string[] {
  const skillsSource = path.join(packageRoot, 'skills')
  const copied: string[] = []

  if (!fs.existsSync(skillsSource)) {
    throw new Error(`Skills directory not found at ${skillsSource}`)
  }

  const skillDirs = fs.readdirSync(skillsSource)

  for (const skillDir of skillDirs) {
    const src = path.join(skillsSource, skillDir)
    const dest = path.join(SKILLS_DIR, skillDir)
    fs.mkdirSync(dest, { recursive: true })

    const files = fs.readdirSync(src)
    for (const file of files) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file))
    }
    copied.push(skillDir)
  }

  return copied
}

export function removeSkills(): string[] {
  const skillNames = ['toggl-start', 'toggl-stop', 'toggl-set-end', 'toggl-status', 'toggl-pause', 'toggl-resume', 'toggl-sync-projects']
  const removed: string[] = []

  for (const name of skillNames) {
    const dir = path.join(SKILLS_DIR, name)
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true })
      removed.push(name)
    }
  }

  return removed
}
