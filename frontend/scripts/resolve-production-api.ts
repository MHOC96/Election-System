/**
 * Resolve production API URL from BACKEND_URL when VITE_API_URL is relative,
 * stale (*.vercel.app), or otherwise does not match the backend.
 */

function normalizeBackend(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '')
  if (!url) return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  return url.replace(/\/api$/, '')
}

function normalizeApiUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '')
  if (!url || url === 'api') return '/api'
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url.startsWith('/') ? url : `/${url}`
  }
  return url
}

export function resolveProductionApiUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const backend = normalizeBackend(env.BACKEND_URL ?? '')
  const viteApi = normalizeApiUrl(env.VITE_API_URL ?? '/api')
  const resolved = backend ? `${backend}/api` : ''

  const viteMatchesBackend =
    Boolean(backend) &&
    viteApi.startsWith('http') &&
    normalizeApiUrl(viteApi) === normalizeApiUrl(resolved)

  const shouldResolve =
    Boolean(backend) &&
    !viteMatchesBackend &&
    (viteApi === '/api' || !viteApi.startsWith('http') || viteApi.includes('.vercel.app'))

  return shouldResolve ? resolved : null
}

export function applyProductionApiUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const resolved = resolveProductionApiUrl(env)
  if (!resolved) return null

  const previous = normalizeApiUrl(env.VITE_API_URL ?? '/api')
  env.VITE_API_URL = resolved
  console.log(
    `[build] Resolved VITE_API_URL=${resolved} from BACKEND_URL` +
      (previous !== '/api' ? ` (was ${previous})` : ''),
  )
  return resolved
}
