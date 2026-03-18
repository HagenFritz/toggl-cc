import { execSync } from 'child_process'
import { loadConfig, type Config } from '../config.js'
import { getCurrentTimer } from '../api/toggl.js'
import { loadCache, isCacheWarm, saveCache } from '../cache.js'
import { incrementPromptCount } from '../state.js'
import { formatDuration } from '../utils.js'

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

function extractIssueNumber(text: string): string | null {
  const m = text.match(/#(\d+)/)
  return m ? m[1] : null
}

function extractIssueFromBranch(branch: string): string | null {
  const patterns = [/[/\-](\d+)[/\-]/, /\/(\d+)$/, /^(\d+)[/\-]/]
  for (const re of patterns) {
    const m = branch.match(re)
    if (m) return m[1]
  }
  return null
}

function hasWordOverlap(timerDesc: string, branch: string): boolean {
  const words = timerDesc
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 4)
  const branchLower = branch.toLowerCase()
  return words.some((w) => branchLower.includes(w))
}

export function detectMismatch(timerDescription: string, branch: string): boolean {
  const timerIssue = extractIssueNumber(timerDescription)
  const branchIssue = extractIssueFromBranch(branch)

  if (timerIssue && branchIssue) {
    return timerIssue !== branchIssue
  }

  if (timerIssue || branchIssue) {
    return !hasWordOverlap(timerDescription, branch)
  }

  return false
}

export async function runCheck(): Promise<void> {
  try {
    const config = loadConfig()
    if (!config || !config.apiToken || !config.workspaceId) {
      process.exit(0)
    }
    const cfg = config as Config

    const promptCount = incrementPromptCount()

    let timerDescription: string | null = null
    let timerStart: string | null = null

    const cache = loadCache()
    if (cache && isCacheWarm(cache)) {
      if (cache.timer) {
        timerDescription = cache.timer.description
      }
      // cache.fetchedAt used as proxy start for elapsed — not ideal but fast
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
        process.exit(0)
      }
    }

    if (!timerDescription) {
      if (promptCount % cfg.reminderEveryNPrompts === 0) {
        console.log('💡 No Toggl timer running. Use /toggl-start to track your time.')
      }
      process.exit(0)
    }

    const branch = getCurrentBranch()
    if (!branch) {
      process.exit(0)
    }

    const mismatch = detectMismatch(timerDescription, branch)
    if (!mismatch) {
      process.exit(0)
    }

    let elapsed = ''
    if (timerStart) {
      elapsed = formatDuration(new Date(timerStart))
    } else if (cache?.fetchedAt) {
      elapsed = formatDuration(new Date(cache.fetchedAt))
    }

    console.log(`\
⚠️  Heads up — timer mismatch detected!

  Timer:  ${timerDescription}${elapsed ? `  (running ${elapsed})` : ''}
  Branch: ${branch}

Looks like you may have switched tasks. Options:
  • /toggl-stop then /toggl-start to track this branch instead
  • /toggl-status for full details
  • Keep going — this message won't block you`)
  } catch {
    // Never crash, never block
  }

  process.exit(0)
}
