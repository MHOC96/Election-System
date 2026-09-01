/**
 * On Vercel, when VITE_API_URL=/api the runtime /api proxy is not available for Vite
 * static builds. Resolve the baked-in API URL from BACKEND_URL at build time instead.
 */
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, '.env.production.local')

function normalizeBackend(raw) {
  let url = raw.trim().replace(/\/+$/, '')
  if (!url) return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  return url.replace(/\/api$/, '')
}

const backend = normalizeBackend(process.env.BACKEND_URL ?? '')
const viteApi = (process.env.VITE_API_URL ?? '/api').trim()

const shouldResolve = backend && (viteApi === '/api' || viteApi === 'api')

if (shouldResolve) {
  const resolved = `${backend}/api`
  writeFileSync(outPath, `VITE_API_URL=${resolved}\n`)
  console.log(`[build] Resolved VITE_API_URL=${resolved} from BACKEND_URL`)
} else if (existsSync(outPath)) {
  unlinkSync(outPath)
}
