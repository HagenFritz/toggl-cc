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

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function parseTimeInput(input: string, referenceDate?: Date): Date | null {
  const ref = referenceDate ?? new Date()
  const dateOnly = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())

  // Try 24-hour format: HH:MM or H:MM
  const match24 = input.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    const hours = parseInt(match24[1], 10)
    const minutes = parseInt(match24[2], 10)
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return new Date(dateOnly.getTime() + hours * 3600000 + minutes * 60000)
    }
  }

  // Try 12-hour format: H:MM(am|pm) or HH:MM(am|pm)
  const match12 = input.match(/^(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)$/)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = parseInt(match12[2], 10)
    const period = match12[3].toLowerCase()

    if (hours < 1 || hours > 12 || minutes < 0 || minutes >= 60) {
      return null
    }

    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0

    return new Date(dateOnly.getTime() + hours * 3600000 + minutes * 60000)
  }

  return null
}
