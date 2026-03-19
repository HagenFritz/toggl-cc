import { execSync } from 'child_process'
import * as readline from 'readline'
import { loadConfig, type Config } from '../config.js'
import { getCurrentTimer, startTimer, stopTimer, getRecentTimeEntries, type TogglProject } from '../api/toggl.js'
import { setTimer, setPaused, addRecentProject, getRecentProjectIds } from '../state.js'
import { saveCache } from '../cache.js'
import { formatDuration, roundToInterval } from '../utils.js'

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

interface ParsedArgs {
  issueOrDescription: string | null
  projectFlag: string | null
  noProject: boolean
}

function parseArgs(args: string[]): ParsedArgs {
  let issueOrDescription: string | null = null
  let projectFlag: string | null = null
  let noProject = false
  const remaining: string[] = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--no-project') {
      noProject = true
    } else if (args[i] === '--project' || args[i] === '-p') {
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        projectFlag = args[i + 1]
        i++
      } else {
        console.log('Error: --project requires a name argument')
        process.exit(0)
      }
    } else {
      remaining.push(args[i])
    }
  }

  if (remaining.length > 0) {
    issueOrDescription = remaining.join(' ')
  }

  return { issueOrDescription, projectFlag, noProject }
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

function resolveProjectByName(cfg: Config, name: string): number | undefined {
  const projects = cfg.projects
  if (!projects || projects.length === 0) {
    console.log('No projects synced. Run /toggl-sync-projects first.')
    return undefined
  }

  // Exact match (case-insensitive)
  const exact = projects.find((p) => p.name.toLowerCase() === name.toLowerCase())
  if (exact) return exact.id

  // Substring match
  const matches = projects.filter((p) => p.name.toLowerCase().includes(name.toLowerCase()))
  if (matches.length === 1) return matches[0].id
  if (matches.length > 1) {
    console.log(`Multiple projects match "${name}": ${matches.map((m) => m.name).join(', ')}`)
    console.log('Please be more specific.')
    return undefined
  }

  console.log(`No project matching "${name}" found.`)
  return undefined
}

async function pickProjectInteractive(cfg: Config): Promise<number | undefined> {
  const projects = cfg.projects
  if (!projects || projects.length === 0) return undefined

  const recentIds = getRecentProjectIds()
  const recentProjects = recentIds
    .map((id) => projects.find((p) => p.id === id))
    .filter((p) => p !== undefined) as TogglProject[]
  const otherProjects = projects.filter((p) => !recentIds.includes(p.id))

  // First pass: ask for filter
  console.log('\nSelect a project:')
  const filterInput = await prompt('Filter (or press Enter to see all): ')

  let toShow: TogglProject[]
  if (filterInput) {
    toShow = projects.filter((p) => p.name.toLowerCase().includes(filterInput.toLowerCase()))
  } else {
    toShow = [...recentProjects, ...otherProjects]
  }

  if (toShow.length === 0) {
    console.log('No projects match that filter.')
    return undefined
  }

  if (toShow.length === 1 && filterInput) {
    const answer = await prompt(`Only match: ${toShow[0].name} — use it? (y/n): `)
    if (answer.toLowerCase() === 'y') return toShow[0].id
    return undefined
  }

  // Show the list
  console.log()
  toShow.forEach((p, i) => console.log(`  ${i + 1}) ${p.name}`))
  console.log(`  0) Skip project`)
  console.log()

  while (true) {
    const answer = await prompt('Project number (0 to skip): ')
    const idx = parseInt(answer, 10)

    if (!answer || idx === 0) {
      const confirm = await prompt('No project — continue without one? (y/n): ')
      if (confirm.toLowerCase() === 'y') return undefined
      console.log('Please select a project or type "0" to skip.')
      continue
    }

    if (isNaN(idx) || idx < 1 || idx > toShow.length) {
      console.log('Invalid selection.')
      continue
    }

    return toShow[idx - 1].id
  }
}

export async function runStart(args: string[]): Promise<void> {
  const config = loadConfig()
  if (!config || !config.apiToken || !config.workspaceId) {
    console.log('No Toggl credentials found. Run: npx toggl-cc@latest install')
    process.exit(0)
  }
  const cfg = config as Config

  // Parse command-line arguments
  const parsed = parseArgs(args)

  let description = ''

  if (parsed.issueOrDescription) {
    description = getIssueDescription(parsed.issueOrDescription)
  } else {
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

  // Resolve project
  let projectId: number | undefined = undefined

  if (parsed.noProject) {
    // Explicitly skip project
    projectId = undefined
  } else if (parsed.projectFlag) {
    // Use --project flag
    projectId = resolveProjectByName(cfg, parsed.projectFlag)
  } else {
    // Interactive picker
    projectId = await pickProjectInteractive(cfg)
  }

  // Track recent project if selected
  if (projectId !== undefined) {
    addRecentProject(projectId)
  }

  // Round the start time
  let startTime = roundToInterval(new Date(), cfg.roundingInterval ?? 5)

  // Check for overlap with previous entry
  try {
    const recentEntries = await getRecentTimeEntries(cfg.apiToken)
    const lastEntry = recentEntries.find((e) => e.stop)
    if (lastEntry && lastEntry.stop) {
      const lastStopTime = new Date(lastEntry.stop)
      if (startTime <= lastStopTime) {
        startTime = new Date(lastStopTime.getTime() + 1000) // Move to 1 second after previous entry
      }
    }
  } catch {
    // If we can't fetch recent entries, proceed with the rounded time
  }

  const entry = await startTimer(cfg.apiToken, cfg.workspaceId, description, projectId, startTime)

  // Starting a timer always clears the paused state
  setPaused(false)

  setTimer({ id: entry.id, description: entry.description, startedAt: entry.start })
  saveCache({ id: entry.id, description: entry.description, running: true })

  const projectName = projectId ? cfg.projects?.find((p) => p.id === projectId)?.name : null
  const projectSuffix = projectName ? ` [${projectName}]` : ''
  console.log(`⏱  Timer started: ${entry.description}${projectSuffix}`)
}
