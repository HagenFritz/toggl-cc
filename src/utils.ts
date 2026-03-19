export function roundToInterval(date: Date, intervalMinutes: number): Date {
  const ms = intervalMinutes * 60_000
  return new Date(Math.round(date.getTime() / ms) * ms)
}

export function formatDuration(start: Date, end?: Date): string {
  const endTime = end ?? new Date()
  const ms = endTime.getTime() - start.getTime()
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
