import { execSync } from 'child_process'
import * as readline from 'readline'
import { loadConfig, type Config } from '../config.js'
import { getCurrentTimer, startTimer, stopTimer } from '../api/toggl.js'
import { setTimer, setPaused } from '../state.js'
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

async function pickProject(cfg: Config): Promise<number | undefined> {
  const projects = cfg.projects
  if (!projects || projects.length === 0) return undefined

  console.log('\nProjects (enter number, or 0 to skip):')
  console.log('  0) No project')
  projects.forEach((p, i) => console.log(`  ${i + 1}) ${p.name}`))

  const answer = await prompt('Project: ')
  const idx = parseInt(answer, 10)

  if (!answer || isNaN(idx) || idx === 0) return undefined
  if (idx < 1 || idx > projects.length) return undefined

  return projects[idx - 1].id
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

  // Pick a project if any are synced
  const projectId = await pickProject(cfg)

  const entry = await startTimer(cfg.apiToken, cfg.workspaceId, description, projectId)

  // Starting a timer always clears the paused state
  setPaused(false)

  setTimer({ id: entry.id, description: entry.description, startedAt: entry.start })
  saveCache({ id: entry.id, description: entry.description, running: true })

  const projectName = projectId ? cfg.projects?.find((p) => p.id === projectId)?.name : null
  const projectSuffix = projectName ? ` [${projectName}]` : ''
  console.log(`⏱  Timer started: ${entry.description}${projectSuffix}`)
}
