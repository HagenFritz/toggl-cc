import { loadConfig, type Config } from '../config.js'
import { getCurrentTimer, stopTimer, type TogglTimeEntry } from '../api/toggl.js'
import { clearTimer } from '../state.js'
import { clearCache } from '../cache.js'
import { formatDuration } from '../utils.js'

export async function runStop(): Promise<void> {
  const config = loadConfig()
  if (!config || !config.apiToken || !config.workspaceId) {
    console.log('No Toggl credentials found. Run: npx toggl-cc@latest install')
    process.exit(0)
  }
  const cfg = config as Config

  let current: TogglTimeEntry | null = null
  try {
    current = await getCurrentTimer(cfg.apiToken)
  } catch (err) {
    console.log(`Error fetching timer: ${String(err)}`)
    process.exit(0)
  }

  if (!current) {
    console.log('⏸  No timer is currently running.')
    process.exit(0)
  }
  const entry = current as TogglTimeEntry

  const elapsed = formatDuration(new Date(entry.start))

  try {
    await stopTimer(cfg.apiToken, cfg.workspaceId, entry.id)
  } catch (err) {
    console.log(`Error stopping timer: ${String(err)}`)
    process.exit(0)
  }

  clearTimer()
  clearCache()

  console.log(`⏹  Stopped: ${entry.description} — ${elapsed}`)
}
