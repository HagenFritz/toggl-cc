import { setPaused } from '../state.js'

export function runPause(): void {
  setPaused(true)
  console.log('⏸  Toggl checks paused for this session. Run /toggl-start to re-enable.')
}
