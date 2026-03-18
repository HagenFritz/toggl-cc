import { setPaused } from '../state.js'

export function runResume(): void {
  setPaused(false)
  console.log('▶️  Toggl checks resumed.')
}
