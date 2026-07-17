import { useEffect, useMemo } from 'react'
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_NAME,
  buildCanonicalUrl,
  formatDocumentTitle,
  type PageSeoConfig,
} from '@/lib/seo'

function upsertMeta(
  attribute: 'name' | 'property',
  key: string,
  content: string,
) {
  if (!content) return
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  )
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  if (!href) return
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

function upsertJsonLd(id: string, data: Record<string, unknown> | undefined) {
  const existing = document.getElementById(id)
  if (!data) {
    existing?.remove()
    return
  }
  const script = existing ?? document.createElement('script')
  script.id = id
  script.setAttribute('type', 'application/ld+json')
  script.textContent = JSON.stringify(data)
  if (!existing) document.head.appendChild(script)
}

export function applyPageSeo({
  title,
  description = SITE_DESCRIPTION,
  path = '/',
  noindex = true,
  jsonLd,
}: PageSeoConfig) {
  const documentTitle = formatDocumentTitle(title)
  const canonical = buildCanonicalUrl(path)
  const robots = noindex ? 'noindex, nofollow' : 'index, follow'

  document.title = documentTitle

  upsertMeta('name', 'description', description)
  upsertMeta('name', 'keywords', SITE_KEYWORDS)
  upsertMeta('name', 'robots', robots)
  upsertMeta('name', 'application-name', SITE_NAME)

  upsertLink('canonical', canonical)

  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:title', documentTitle)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:locale', SITE_LOCALE)
  if (canonical) upsertMeta('property', 'og:url', canonical)

  upsertMeta('name', 'twitter:card', 'summary')
  upsertMeta('name', 'twitter:title', documentTitle)
  upsertMeta('name', 'twitter:description', description)

  upsertJsonLd('page-json-ld', jsonLd)
}

interface PageSeoProps extends PageSeoConfig {}

/** Updates document head tags for the current route (SPA SEO). */
export function PageSeo(props: PageSeoProps) {
  const jsonLdKey = useMemo(
    () => (props.jsonLd ? JSON.stringify(props.jsonLd) : ''),
    [props.jsonLd],
  )

  useEffect(() => {
    applyPageSeo(props)
  }, [props.title, props.description, props.path, props.noindex, jsonLdKey])

  return null
}
