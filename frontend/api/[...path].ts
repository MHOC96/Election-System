import type { VercelRequest, VercelResponse } from '@vercel/node'

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
])

function resolveBackendBase(): string {
  const raw =
    process.env.BACKEND_URL?.trim() ||
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ||
    process.env.VITE_API_BACKEND_URL?.trim() ||
    ''

  if (!raw) return ''

  let url = raw.replace(/\/+$/, '')
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  return url.replace(/\/api$/, '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const backend = resolveBackendBase()
  if (!backend) {
    res.status(503).json({
      success: false,
      error: {
        code: 'backend_not_configured',
        message: 'Set BACKEND_URL on Vercel to your Railway service URL.',
      },
    })
    return
  }

  const pathParam = req.query.path
  const segments = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || ''
  const queryIndex = req.url?.indexOf('?') ?? -1
  const query = queryIndex >= 0 ? req.url!.slice(queryIndex) : ''
  const target = `${backend}/api/${segments}${query}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_BY_HOP.has(key.toLowerCase())) continue
    headers.set(key, Array.isArray(value) ? value.join(',') : value)
  }
  headers.set('host', new URL(backend).host)

  const method = req.method ?? 'GET'
  const init: RequestInit = { method, headers }

  if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
  }

  const upstream = await fetch(target, init)
  res.status(upstream.status)
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return
    res.setHeader(key, value)
  })

  const buffer = Buffer.from(await upstream.arrayBuffer())
  res.send(buffer)
}
