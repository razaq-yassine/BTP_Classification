/**
 * Runs drizzle-kit generate non-interactively.
 * When drizzle-kit prompts (e.g. "create or rename column"), pipes the first option (index 0)
 * to avoid hanging in CI/deploy. For renames, option 0 is typically "create column";
 * option 1 is "rename". Adjust if your prompt order differs.
 *
 * Enhancement: If drizzle-kit adds --non-interactive or similar, use that instead.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '..')

const configPath = path.join(backendRoot, 'drizzle-temp', 'drizzle.config.ts')

const proc = spawn(
  'pnpm',
  ['exec', 'drizzle-kit', 'generate', '--config', configPath],
  {
    cwd: backendRoot,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  }
)

// Pipe newlines to satisfy any prompts (selects default/first option)
proc.stdin?.write('\n\n\n')
proc.stdin?.end()

proc.on('close', (code) => {
  process.exit(code ?? 0)
})
