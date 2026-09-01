/**
 * On Vercel, when VITE_API_URL=/api the runtime /api proxy is not available for Vite
 * static builds. Resolve the baked-in API URL from BACKEND_URL at build time instead.
 * Also overrides stale VITE_API_URL values (e.g. old *.vercel.app deployments).
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

function normalizeApiUrl(raw) {
  let url = raw.trim().replace(/\/+$/, '')
  if (!url || url === 'api') return '/api'
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url.startsWith('/') ? url : `/${url}`
  }
  return url
}

const backend = normalizeBackend(process.env.BACKEND_URL ?? '')
const viteApi = normalizeApiUrl(process.env.VITE_API_URL ?? '/api')
const resolved = backend ? `${backend}/api` : ''

const viteMatchesBackend =
  Boolean(backend) &&
  viteApi.startsWith('http') &&
  normalizeApiUrl(viteApi) === normalizeApiUrl(resolved)

const shouldResolve =
  Boolean(backend) &&
  !viteMatchesBackend &&
  (viteApi === '/api' || !viteApi.startsWith('http') || viteApi.includes('.vercel.app'))

if (shouldResolve) {
  writeFileSync(outPath, `VITE_API_URL=${resolved}\n`)
  console.log(
    `[build] Resolved VITE_API_URL=${resolved} from BACKEND_URL` +
      (viteApi !== '/api' ? ` (was ${viteApi})` : ''),
  )
} else if (existsSync(outPath)) {
  unlinkSync(outPath)
}
