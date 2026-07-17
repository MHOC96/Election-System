import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { PageSeo } from '@/components/shared/PageSeo'
import { getSeoForPath } from '@/lib/seo'

/** Keeps title, meta, Open Graph, and JSON-LD in sync with the active route. */
export function RouteSeo() {
  const { pathname } = useLocation()
  const seo = useMemo(() => getSeoForPath(pathname), [pathname])
  return <PageSeo {...seo} />
}
