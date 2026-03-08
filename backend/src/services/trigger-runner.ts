import path from 'path'
import { pathToFileURL } from 'url'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** In production we run from dist/; triggers are compiled to dist/triggers/*.js. In dev (tsx) we run from src/ and load .ts. */
const isProduction = __dirname.includes(`${path.sep}dist${path.sep}`)
const triggerExt = isProduction ? '.js' : '.ts'

export async function runTrigger(
  objectName: string,
  event: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
): Promise<Record<string, unknown> | void> {
  try {
    const triggerPath = path.join(__dirname, '..', 'triggers', `${objectName}${triggerExt}`)
    const trigger = await import(pathToFileURL(triggerPath).href + `?t=${Date.now()}`)
    const fn = trigger[event]
    if (typeof fn === 'function') {
      if (event.startsWith('before')) {
        return await fn(oldValue, newValue)
      } else {
        await fn(oldValue, newValue)
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND') {
      throw err
    }
  }
}
