import { execSync } from 'child_process'
import * as readline from 'readline'
import { loadConfig, type Config } from '../config.js'
import { getCurrentTimer, startTimer, stopTimer } from '../api/toggl.js'
import { setTimer } from '../state.js'
import { saveCache } from '../cache.js'
import { formatDuration } from '../utils.js'

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function getIssueDescription(arg: string): string {
  if (/^\d+$/.test(arg)) {
    try {
      const result = execSync(
        `gh issue view ${arg} --json number,title --jq '"#\\(.number) \\(.title)"'`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      ).trim()
      if (result) return result.replace(/^"|"$/g, '')
    } catch {
      // fall back
    }
    return `#${arg}`
  }
  return arg
}

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

export async function runStart(args: string[]): Promise<void> {
  const config = loadConfig()
  if (!config || !config.apiToken || !config.workspaceId) {
    console.log('No Toggl credentials found. Run: npx toggl-cc@latest install')
    process.exit(0)
  }
  const cfg = config as Config

  let description = args.join(' ').trim()

  if (!description) {
    const branch = getCurrentBranch()
    if (branch) {
      description = branch
    } else {
      description = await prompt('Timer description: ')
      if (!description) {
        console.log('Cancelled.')
        process.exit(0)
      }
    }
  } else {
    description = getIssueDescription(args[0])
  }

  // Check if a timer is already running
  let existing = null
  try {
    existing = await getCurrentTimer(cfg.apiToken)
  } catch {
    // API error — proceed anyway
  }

  if (existing && existing.duration === -1) {
    const elapsed = formatDuration(new Date(existing.start))
    const answer = await prompt(
      `⚠️  A timer is already running: "${existing.description}" (${elapsed})\nStop it and start a new one? (y/n): `,
    )
    if (answer.toLowerCase() !== 'y') {
      console.log('Keeping existing timer.')
      process.exit(0)
    }
    await stopTimer(cfg.apiToken, cfg.workspaceId, existing.id)
  }

  const entry = await startTimer(cfg.apiToken, cfg.workspaceId, description)

  setTimer({ id: entry.id, description: entry.description, startedAt: entry.start })
  saveCache({ id: entry.id, description: entry.description, running: true })

  console.log(`⏱  Timer started: ${entry.description}`)
}
