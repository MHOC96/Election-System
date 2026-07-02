/** Member landing page is eagerly loaded in App; keep API prefetch in prefetch.ts. */

export function preloadMemberPageModules() {
  return Promise.resolve()
}
