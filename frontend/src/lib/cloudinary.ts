/**
 * Apply Cloudinary delivery transforms (f_auto, q_auto) per AGENTS.md.
 * Inserts transforms after `/upload/` when not already present.
 */
export function optimizeCloudinaryUrl(url: string, width?: number): string {
  if (!url.includes('res.cloudinary.com/') || !url.includes('/upload/')) {
    return url
  }

  const [base, rest] = url.split('/upload/')
  if (!rest || rest.startsWith('f_auto') || rest.startsWith('w_')) {
    return url
  }

  const transforms = ['f_auto', 'q_auto']
  if (width && width > 0) {
    transforms.push(`w_${width}`)
  }

  return `${base}/upload/${transforms.join(',')}/${rest}`
}
