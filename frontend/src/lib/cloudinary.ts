/**
 * Apply Cloudinary delivery transforms (f_auto, q_auto) per AGENTS.md.
 * Inserts transforms after `/upload/` when not already present.
 */

export function isSafeCloudinaryUrl(url: string): boolean {
  if (!url?.trim()) return false
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== 'https:') return false
    if (parsed.hostname !== 'res.cloudinary.com') return false
    if (parsed.username || parsed.password) return false
    const path = parsed.pathname
    return path.includes('/upload/') || path.includes('/raw/upload/')
  } catch {
    return false
  }
}

export function optimizeCloudinaryUrl(url: string, width?: number, heightOrAspectRatio?: number | string): string {
  if (!isSafeCloudinaryUrl(url)) {
    return ''
  }

  if (!url.includes('/upload/')) {
    return url
  }

  const [base, rest] = url.split('/upload/')
  if (!rest || rest.startsWith('f_auto') || rest.startsWith('w_')) {
    return url
  }

  const transforms = ['f_auto', 'q_auto', 'a_exif']
  if (width && width > 0) {
    transforms.push(`w_${width}`, 'c_fill', 'g_face')

    if (typeof heightOrAspectRatio === 'string') {
      transforms.push(`ar_${heightOrAspectRatio}`)
    } else if (heightOrAspectRatio && heightOrAspectRatio > 0) {
      transforms.push(`h_${heightOrAspectRatio}`)
    } else {
      transforms.push('ar_1:1')
    }
  }

  return `${base}/upload/${transforms.join(',')}/${rest}`
}

/** HTTPS Cloudinary delivery URL for links (declarations, downloads). */
export function safeCloudinaryHref(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined
  return isSafeCloudinaryUrl(url) ? url.trim() : undefined
}
