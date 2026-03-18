import { loadConfig, saveConfig, type Config } from '../config.js'
import { getProjects } from '../api/toggl.js'

export async function runSyncProjects(): Promise<void> {
  const config = loadConfig()
  if (!config || !config.apiToken || !config.workspaceId) {
    console.log('No Toggl credentials found. Run: npx toggl-cc@latest install')
    process.exit(0)
  }
  const cfg = config as Config

  console.log('Fetching projects...')

  let projects
  try {
    const raw = await getProjects(cfg.apiToken, cfg.workspaceId)
    projects = raw
      .filter((p) => p.active)
      .map((p) => ({ id: p.id, name: p.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (err) {
    console.log(`Failed to fetch projects: ${String(err)}`)
    process.exit(1)
  }

  saveConfig({ ...cfg, projects })

  console.log(`✅  Synced ${projects.length} project(s) to ~/.toggl-cc/config.json:`)
  for (const p of projects) {
    console.log(`   • ${p.name}`)
  }
  console.log('\nRun this command anytime to refresh.')
}
