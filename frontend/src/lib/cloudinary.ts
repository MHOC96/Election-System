/**
 * Apply Cloudinary delivery transforms (f_auto, q_auto) per AGENTS.md.
 * Inserts transforms after `/upload/` when not already present.
 */
export function optimizeCloudinaryUrl(url: string, width?: number, heightOrAspectRatio?: number | string): string {
  if (!url.includes('res.cloudinary.com/') || !url.includes('/upload/')) {
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
      // Default to 1:1 square for thumbnails if not explicitly set
      transforms.push('ar_1:1')
    }
  }

  return `${base}/upload/${transforms.join(',')}/${rest}`
}
