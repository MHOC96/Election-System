export const SITE_NAME = 'EC Election System'

export const SITE_DESCRIPTION =
  'Secure executive committee election portal for members and administrators. Cast votes, manage candidates, and view official results.'

export const SITE_LOCALE = 'en_US'

export const SITE_KEYWORDS =
  'executive committee election, member voting, secure ballot, election management, student election portal'

export interface PageSeoConfig {
  title: string
  description?: string
  path?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown>
}

const ADMIN_ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Admin Dashboard',
  '/admin/members': 'Member Management',
  '/admin/positions': 'Position Management',
  '/admin/applications': 'Application Review',
  '/admin/candidates': 'Candidate Management',
  '/admin/elections': 'Election Management',
  '/admin/reports': 'Election Reports',
}

const MEMBER_ROUTE_TITLES: Record<string, string> = {
  '/': 'Member Portal',
  '/apply': 'Candidate Application',
  '/vote': 'Ballot',
  '/voting': 'Voting',
  '/results': 'Election Results',
  '/my-votes': 'My Votes',
}

export function getSiteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export function buildCanonicalUrl(path = ''): string {
  const base = getSiteUrl()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalized}` : normalized
}

export function getDefaultJsonLd(): Record<string, unknown> {
  const siteUrl = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    ...(siteUrl ? { url: siteUrl } : {}),
  }
}

export function getSeoForPath(pathname: string): PageSeoConfig {
  const path = pathname.split('?')[0] || '/'

  if (ADMIN_ROUTE_TITLES[path]) {
    return {
      title: ADMIN_ROUTE_TITLES[path],
      description: `${ADMIN_ROUTE_TITLES[path]} — ${SITE_NAME}`,
      path,
      noindex: true,
    }
  }

  if (MEMBER_ROUTE_TITLES[path]) {
    return {
      title: MEMBER_ROUTE_TITLES[path],
      description: `${MEMBER_ROUTE_TITLES[path]} — ${SITE_NAME}`,
      path,
      noindex: true,
    }
  }

  if (path === '/login') {
    return {
      title: 'Member Login',
      description: `Sign in with your CPM and MC numbers to access the ${SITE_NAME}.`,
      path,
      noindex: true,
      jsonLd: getDefaultJsonLd(),
    }
  }

  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path,
    noindex: true,
  }
}

export function formatDocumentTitle(pageTitle: string): string {
  if (pageTitle === SITE_NAME) return SITE_NAME
  return `${pageTitle} | ${SITE_NAME}`
}
