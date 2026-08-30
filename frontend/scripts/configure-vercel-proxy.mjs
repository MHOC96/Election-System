/**
 * Injects a same-origin /api proxy into vercel.json when BACKEND_URL is set.
 * Run during Vercel install so the SPA can use VITE_API_URL=/api (no CORS).
 *
 * Vercel env:
 *   BACKEND_URL=https://your-service.up.railway.app
 *   VITE_API_URL=/api
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const vercelPath = join(root, 'vercel.json')

function normalizeBackend(raw) {
  let url = raw.trim().replace(/\/+$/, '')
  if (!url) return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  return url.replace(/\/api\/?$/, '')
}

const backend = normalizeBackend(
  process.env.BACKEND_URL ??
    process.env.RAILWAY_PUBLIC_DOMAIN ??
    process.env.VITE_API_BACKEND_URL ??
    '',
)

const config = JSON.parse(readFileSync(vercelPath, 'utf8'))
const rewrites = (config.rewrites ?? []).filter(
  (rule) => rule.source !== '/api/:path*',
)

if (backend) {
  rewrites.unshift({
    source: '/api/:path*',
    destination: `${backend}/api/:path*`,
  })
  config.rewrites = rewrites
  writeFileSync(vercelPath, `${JSON.stringify(config, null, 2)}\n`)
  console.log(`[vercel] API proxy enabled: /api/* -> ${backend}/api/*`)
} else {
  console.warn(
    '[vercel] BACKEND_URL is not set. Either set BACKEND_URL to your Railway host ' +
      'and VITE_API_URL=/api, or set VITE_API_URL to https://<railway-host>/api directly.',
  )
}
