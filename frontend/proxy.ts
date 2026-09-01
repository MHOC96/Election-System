function resolveBackendBase(): string {
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

export default async function proxy(request: Request): Promise<Response> {
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

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // Required when forwarding a request body in Node.js fetch.
    ...(hasBody ? { duplex: 'half' as const } : {}),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  })
}
