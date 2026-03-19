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
  paused: boolean
  lastAutoCheckAt?: number
  recentProjectIds?: number[]
}

const STATE_FILE = path.join(os.homedir(), '.toggl-cc', 'state.json')

export function loadState(): State {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8')
    return JSON.parse(raw) as State
  } catch {
    return { runningTimer: null, promptCount: 0, paused: false, recentProjectIds: [] }
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

export function setPaused(paused: boolean): void {
  const state = loadState()
  state.paused = paused
  saveState(state)
}

export function isPaused(): boolean {
  return loadState().paused ?? false
}

export function setLastAutoCheckTime(): void {
  const state = loadState()
  state.lastAutoCheckAt = Date.now()
  saveState(state)
}

export function getLastAutoCheckTime(): number | null {
  return loadState().lastAutoCheckAt ?? null
}

export function addRecentProject(projectId: number): void {
  const state = loadState()
  const current = state.recentProjectIds ?? []
  // Remove if already present (dedupe)
  const filtered = current.filter((id) => id !== projectId)
  // Prepend and trim to 3
  state.recentProjectIds = [projectId, ...filtered].slice(0, 3)
  saveState(state)
}

export function getRecentProjectIds(): number[] {
  return loadState().recentProjectIds ?? []
}
