import fs from 'fs'
import path from 'path'
import os from 'os'

const CACHE_TTL_MS = 60_000

export interface CachedTimer {
  id: number
  description: string
  running: boolean
}

export interface Cache {
  fetchedAt: number
  timer: CachedTimer | null
}

const CACHE_FILE = path.join(os.homedir(), '.toggl-cc', 'cache.json')

export function loadCache(): Cache | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8')
    return JSON.parse(raw) as Cache
  } catch {
    return null
  }
}

export function isCacheWarm(cache: Cache): boolean {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS
}

export function saveCache(timer: CachedTimer | null): Cache {
  const cache: Cache = { fetchedAt: Date.now(), timer }
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n', 'utf-8')
  return cache
}

export function clearCache(): void {
  try {
    fs.unlinkSync(CACHE_FILE)
  } catch {
    // ignore
  }
}
