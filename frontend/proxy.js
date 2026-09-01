const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const STRIP_FROM_RESPONSE = new Set([
  ...HOP_BY_HOP,
  // fetch() decompresses gzip/br bodies; keeping these breaks the browser decoder.
  'content-encoding',
  'content-length',
])

function resolveBackendBase() {
  const raw =
    process.env.BACKEND_URL?.trim() ||
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ||
    ''

  if (!raw) return ''

  let url = raw.replace(/\/+$/, '')
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  return url.replace(/\/api$/, '')
}

function sanitizeResponseHeaders(upstreamHeaders) {
  const headers = new Headers()
  upstreamHeaders.forEach((value, key) => {
    if (!STRIP_FROM_RESPONSE.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  return headers
}

/** @param {Request} request */
export default async function proxy(request) {
  const backendBase = resolveBackendBase()
  if (!backendBase) {
    return Response.json(
      {
        success: false,
        error: {
          code: 'backend_not_configured',
          message: 'Set BACKEND_URL on Vercel to your Railway service URL.',
        },
      },
      { status: 503 },
    )
  }

  const incoming = new URL(request.url)
  const targetUrl = `${backendBase}${incoming.pathname}${incoming.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')
  for (const key of HOP_BY_HOP) {
    headers.delete(key)
  }
  // Ask Railway for an uncompressed body so the proxy can forward it safely.
  headers.set('accept-encoding', 'identity')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    ...(hasBody ? { duplex: 'half' } : {}),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: sanitizeResponseHeaders(upstream.headers),
  })
}
