import * as readline from 'readline'
import { loadConfig, type Config } from '../config.js'
import { getCurrentTimer, stopTimer, getRecentTimeEntries, type TogglTimeEntry } from '../api/toggl.js'
import { clearTimer } from '../state.js'
import { clearCache } from '../cache.js'
import { formatDuration, parseTimeInput, formatTime } from '../utils.js'

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export async function runSetEnd(): Promise<void> {
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
  console.log(`⏱  Current timer: "${entry.description}" (running ${elapsed})`)
  console.log()

  // Show menu
  console.log('How should the timer end?')
  console.log('  1) End at the stop time of the previous entry')
  console.log('  2) Specify a custom time')
  console.log()

  const choice = await prompt('Choice: ')

  let endTime: Date | null = null

  if (choice === '1') {
    // Get previous entry
    try {
      const recentEntries = await getRecentTimeEntries(cfg.apiToken)
      const lastEntry = recentEntries.find((e) => e.stop)

      if (!lastEntry) {
        console.log('No previous entry found.')
        process.exit(0)
      }

      endTime = new Date(lastEntry.stop!)
      const endTimeStr = formatTime(endTime)
      const confirm = await prompt(`Previous entry ended at ${endTimeStr} — use this? (y/n): `)

      if (confirm.toLowerCase() !== 'y') {
        console.log('Cancelled.')
        process.exit(0)
      }
    } catch (err) {
      console.log(`Error fetching entries: ${String(err)}`)
      process.exit(0)
    }
  } else if (choice === '2') {
    // Custom time
    while (true) {
      const timeInput = await prompt('Enter end time (e.g. 14:30 or 2:30pm): ')
      endTime = parseTimeInput(timeInput)

      if (!endTime) {
        console.log('Invalid time format. Try 14:30 or 2:30pm.')
        continue
      }

      // Check if end time is before start time
      if (endTime <= new Date(entry.start)) {
        const startTimeStr = formatTime(new Date(entry.start))
        console.log(`End time can't be before the timer started at ${startTimeStr}.`)
        continue
      }

      // Warn if end time is in the future (more than 1 minute in the future)
      if (endTime > new Date(Date.now() + 60000)) {
        const endTimeStr = formatTime(endTime)
        const warn = await prompt(`End time ${endTimeStr} is in the future — are you sure? (y/n): `)
        if (warn.toLowerCase() !== 'y') {
          console.log('Cancelled.')
          process.exit(0)
        }
      }

      break
    }

    const endTimeStr = formatTime(endTime)
    const confirm = await prompt(`Set end time to ${endTimeStr}? (y/n): `)

    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled.')
      process.exit(0)
    }
  } else {
    console.log('Invalid choice.')
    process.exit(0)
  }

  // Stop the timer
  try {
    await stopTimer(cfg.apiToken, cfg.workspaceId, entry.id, endTime)
  } catch (err) {
    console.log(`Error stopping timer: ${String(err)}`)
    process.exit(0)
  }

  clearTimer()
  clearCache()

  const finalElapsed = formatDuration(new Date(entry.start), endTime)
  const endTimeStr = formatTime(endTime)
  console.log(`⏹  Timer ended at ${endTimeStr}: "${entry.description}" — ${finalElapsed}`)
}
