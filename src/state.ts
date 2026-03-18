import fs from 'fs'
import path from 'path'
import os from 'os'

export interface RunningTimer {
  id: number
  description: string
  startedAt: string
}

export interface State {
  runningTimer: RunningTimer | null
  promptCount: number
}

const STATE_FILE = path.join(os.homedir(), '.toggl-cc', 'state.json')

export function loadState(): State {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8')
    return JSON.parse(raw) as State
  } catch {
    return { runningTimer: null, promptCount: 0 }
  }
}

export function saveState(state: State): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf-8')
}

export function clearTimer(): void {
  const state = loadState()
  state.runningTimer = null
  saveState(state)
}

export function setTimer(timer: RunningTimer): void {
  const state = loadState()
  state.runningTimer = timer
  saveState(state)
}

export function incrementPromptCount(): number {
  const state = loadState()
  state.promptCount = (state.promptCount ?? 0) + 1
  saveState(state)
  return state.promptCount
}
