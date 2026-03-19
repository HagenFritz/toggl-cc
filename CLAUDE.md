# Claude Code Context for toggl-cc

## Project Overview
**toggl-cc** is a Toggl Track time-tracking integration for Claude Code. It's a TypeScript CLI tool distributed via npm that injects skills and hooks into Claude Code to track work on GitHub issues.

## Key Architecture
- **Entry point:** `src/cli.ts` — routes commands to handlers
- **Commands:** `src/commands/*.ts` — each file exports `runXxx()` function
- **Skills:** `skills/toggl-*/SKILL.md` — Claude Code skill definitions
- **Config:** `~/.toggl-cc/config.json` — persisted user settings
- **State:** `~/.toggl-cc/state.json` — session state (running timer, prompt count, pause flag)
- **API:** `src/api/toggl.ts` — Toggl Track v9 API calls
- **Build:** tsdown bundles everything into `dist/cli.mjs`

## Important Checks Before Committing
1. **TypeScript:** Run `npm run typecheck` — must pass with no errors
2. **Build:** Run `npm run build` — must complete successfully
3. **Type compatibility:**
   - Don't mix `TogglProject` from `config.ts` (no `active` field) with API version (has `active`)
   - Use type casts `as TogglProject[]` when needed
4. **Variable scope:** Any variables used outside an `if` block must be declared before it
5. **String/symbol checks:** When using `@clack/prompts`, check for symbol returns (cancel signal): `typeof answer !== 'symbol'`

## Publishing Process
1. **Prerequisite:** GitHub secret `NPM_TOKEN` must be set
   - Go to repo Settings → Secrets and variables → Actions
   - Create a secret named `NPM_TOKEN` with your npm automation token
   - Get token from https://npmjs.com/settings/tokens (type: Automation)
2. Update version in `package.json` (semver: major.minor.patch)
3. Commit the change: `git commit -m "Bump version to X.Y.Z"`
4. Push to main: `git push origin main`
5. GitHub Actions workflow runs automatically:
   - Checks if version already exists on npm (exits silently if it does)
   - Runs `npm ci`, `npm run build`, `npm run typecheck`
   - Publishes to npm using `NPM_TOKEN` secret
   - Creates git tag `vX.Y.Z` and pushes it
6. Watch GitHub Actions tab for success/failure
   - Look at https://github.com/HagenFritz/toggl-cc/actions
   - Click latest "Publish to npm" workflow run

## When to Create a New Command
1. Create `src/commands/xxx.ts` with `export async function runXxx(): Promise<void>`
2. Import what's needed from api, config, state, cache, utils
3. Handle errors gracefully — don't crash on API failures
4. Add case to switch in `src/cli.ts`
5. Add entry to help text in `src/cli.ts` default case
6. Create skill file `skills/toggl-xxx/SKILL.md`
7. Add skill name to hardcoded list in `src/claude.ts` `removeSkills()` function

## When to Update Config
- Add new field to `Config` interface in `src/config.ts`
- Set default in `loadConfig()` return statements (both env var path and file path)
- Add prompt during `npx toggl-cc install` in `src/commands/install.ts`
- Save the value in `saveConfig()` call

## State Management
- Use `src/state.ts` helpers: `loadState()`, `saveState()`, and specific getters/setters
- State is serialized to `~/.toggl-cc/state.json`
- Always check for missing fields with `?? defaultValue` since old state.json files may lack new fields

## API Patterns
- All API functions in `src/api/toggl.ts` use the same `request<T>()` wrapper
- Always handle `TogglRateLimitError` — catch it and bail gracefully
- ISO 8601 timestamps: use `date.toISOString()` when sending, `new Date(string)` when receiving
- Toggl `duration: -1` means timer is running; `duration >= 0` means stopped

## Time Handling
- `roundToInterval(date, minutes)` — rounds to nearest N-minute boundary
- `parseTimeInput(input)` — parses "14:30" or "2:30pm" to today's Date
- `formatTime(date)` — formats Date to "HH:MM" display
- `formatDuration(start, end?)` — returns "Xh Ym" or "Xm" format

## Skills & Hooks
- Skills are plain Markdown files in `skills/toggl-xxx/SKILL.md`
- Set `disable-model-invocation: false` to let Claude decide when to invoke
- Set `disable-model-invocation: true` to require explicit user request
- The hook (`UserPromptSubmit`) runs `npx toggl-cc@latest check` on every Claude prompt
- Hook is configurable now: `enableAutoCheck` (default false) and `autoCheckCadenceSeconds` (default 300)

## Recent Changes (v1.1.0)
- Added `--project` flag and interactive picker with recent projects tracking
- Added `/toggl-set-end` skill to customize timer end times
- Auto-check hook now opt-in (was always on)
- Time rounding & overlap prevention for timer start times
- Project resolution with fuzzy/substring matching

## Testing Checklist
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- Start a timer: `/toggl-start [issue]` or `/toggl-start [issue] --project NAME`
- Stop with custom time: `/toggl-set-end` → pick previous entry or specify time
- View timer status: `/toggl-status`
- Sync projects: `/toggl-sync-projects`
- Check prompts: verify hook runs (enable auto-check, set to 5+ seconds for testing)

## Common Pitfalls
- Forgetting to export functions from command files
- Using wrong TogglProject type (config vs API)
- Not handling symbol returns from @clack/prompts
- Variables defined inside if/while blocks used outside scope
- Not updating removeSkills() when adding new skills
- Assuming state.json fields exist (always use `?? default`)
