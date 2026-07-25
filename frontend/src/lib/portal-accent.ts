/**
 * Portal accent scopes.
 *
 * An accent class sets only the `--portal-accent-*` channels, which every
 * `portal-*` surface and text helper resolves against. Putting the class on
 * a wrapper re-tints its whole subtree, and because the channels have light
 * and dark values the tint follows the active theme automatically.
 */
export type PortalAccent = 'brand' | 'success' | 'warning' | 'info' | 'neutral'

const ACCENT_SCOPE_CLASS: Record<PortalAccent, string> = {
  brand: 'tint-brand',
  success: 'tint-success',
  warning: 'tint-warning',
  info: 'tint-info',
  neutral: 'tint-neutral',
}

export function accentScope(accent: PortalAccent = 'brand'): string {
  return ACCENT_SCOPE_CLASS[accent]
}
