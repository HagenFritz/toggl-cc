import fs from 'fs'
import path from 'path'
import os from 'os'

export interface Config {
  apiToken: string
  workspaceId: number
  reminderEveryNPrompts: number
}

const CONFIG_DIR = path.join(os.homedir(), '.toggl-cc')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function loadConfig(): Config | null {
  // Env vars take precedence
  const envToken = process.env.TOGGL_API_TOKEN
  const envWorkspace = process.env.TOGGL_WORKSPACE_ID

  if (envToken && envWorkspace) {
    return {
      apiToken: envToken,
      workspaceId: parseInt(envWorkspace, 10),
      reminderEveryNPrompts: 5,
    }
  }

  if (!fs.existsSync(CONFIG_FILE)) return null

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Config>

    // Env vars override individual fields
    return {
      apiToken: envToken ?? parsed.apiToken ?? '',
      workspaceId: envWorkspace ? parseInt(envWorkspace, 10) : (parsed.workspaceId ?? 0),
      reminderEveryNPrompts: parsed.reminderEveryNPrompts ?? 5,
    }
  } catch {
    return null
  }
}

export function saveConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}
