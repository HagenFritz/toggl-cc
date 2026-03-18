import { execSync } from 'child_process'
import { loadConfig, type Config } from '../config.js'
import { getCurrentTimer } from '../api/toggl.js'
import { loadCache, isCacheWarm, saveCache } from '../cache.js'
import { formatDuration } from '../utils.js'
import { detectMismatch } from './check.js'

function getCurrentBranch(): string | null {
  try {
    return (
      execSync('git branch --show-current', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim() || null
    )
  } catch {
    return null
  }
}

export async function runStatus(): Promise<void> {
  const config = loadConfig()
  if (!config || !config.apiToken) {
    console.log('No Toggl credentials found. Run: npx toggl-cc@latest install')
    process.exit(0)
  }
  const cfg = config as Config

  let timerDescription: string | null = null
  let timerStart: string | null = null

  const cache = loadCache()
  if (cache && isCacheWarm(cache) && cache.timer) {
    timerDescription = cache.timer.description
  } else {
    try {
      const entry = await getCurrentTimer(cfg.apiToken)
      if (entry) {
        timerDescription = entry.description
        timerStart = entry.start
        saveCache({ id: entry.id, description: entry.description, running: true })
      } else {
        saveCache(null)
      }
    } catch {
      console.log('⚠️  Could not reach Toggl API.')
      process.exit(0)
    }
  }

  // If we got description from cache but no start time, fetch fresh for elapsed
  if (timerDescription && !timerStart) {
    try {
      const entry = await getCurrentTimer(cfg.apiToken)
      if (entry) timerStart = entry.start
    } catch {
      // ignore
    }
  }

  const branch = getCurrentBranch()

  if (!timerDescription) {
    console.log('⏸  No timer running. Use /toggl-start to begin tracking.')
    return
  }

  const elapsed = timerStart ? formatDuration(new Date(timerStart)) : '?'
  const result = branch ? detectMismatch(timerDescription, branch) : null

  if (result === 'mismatch') {
    console.log(`\
⚠️  Heads up — timer mismatch detected!

  Timer:  ${timerDescription}  (running ${elapsed})
  Branch: ${branch}

Looks like you may have switched tasks. Options:
  • /toggl-stop then /toggl-start to track this branch instead
  • Keep going — this message won't block you`)
  } else if (result === 'match') {
    console.log(`✅  Timer running: ${timerDescription} (${elapsed}) — branch matches`)
  } else if (result === 'unknown') {
    console.log(`⏱  Timer running: ${timerDescription} (${elapsed}) — could not verify branch match`)
  } else {
    console.log(`⏱  Timer running: ${timerDescription} (${elapsed}) — no git repo`)
  }
}
