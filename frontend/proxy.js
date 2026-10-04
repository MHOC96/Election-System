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

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  let upstream
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      ...(hasBody ? { duplex: 'half' } : {}),
      signal: AbortSignal.timeout(25_000),
    })
  } catch (fetchError) {
    const timedOut =
      fetchError instanceof Error &&
      (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError')
    return Response.json(
      {
        success: false,
        error: {
          code: timedOut ? 'gateway_timeout' : 'upstream_unreachable',
          message: timedOut
            ? 'The election API took too long to respond.'
            : 'Could not reach the election API.',
        },
      },
      { status: timedOut ? 504 : 502 },
    )
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: sanitizeResponseHeaders(upstream.headers),
  })
}
