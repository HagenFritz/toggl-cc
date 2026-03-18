import { text, spinner, log, outro } from '@clack/prompts'
import { loadConfig, saveConfig, type Config } from '../config.js'
import { getMe } from '../api/toggl.js'

export async function runUpdateToken(): Promise<void> {
  console.log()

  const config = loadConfig()
  if (!config || !config.workspaceId) {
    log.error('No Toggl config found. Run: npx toggl-cc@latest install')
    process.exit(0)
  }
  const cfg = config as Config

  while (true) {
    const token = await text({
      message: 'Enter your new Toggl API Token:',
      placeholder: 'your-api-token',
      validate: (v) => (v.trim().length === 0 ? 'API token is required' : undefined),
    })

    if (typeof token !== 'string' || token.length === 0) {
      log.error('Cancelled.')
      process.exit(0)
    }

    const s = spinner()
    s.start('Validating token...')

    try {
      await getMe(token.trim())
      s.stop('Token valid ✓')

      saveConfig({ ...cfg, apiToken: token.trim() })
      outro('✅ API token updated in ~/.toggl-cc/config.json')
      break
    } catch {
      s.stop('Invalid token — please try again')
    }
  }
}
