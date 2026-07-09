import { lazyWithPreload } from '@/lib/lazyWithPreload'

export const MembersPage = lazyWithPreload(() =>
  import('@/pages/admin/MembersPage').then((m) => ({ default: m.MembersPage })),
)

export const PositionsPage = lazyWithPreload(() =>
  import('@/pages/admin/PositionsPage').then((m) => ({ default: m.PositionsPage })),
)

export const CandidatesPage = lazyWithPreload(() =>
  import('@/pages/admin/CandidatesPage').then((m) => ({ default: m.CandidatesPage })),
)

export const ElectionsPage = lazyWithPreload(() =>
  import('@/pages/admin/ElectionsPage').then((m) => ({ default: m.ElectionsPage })),
)

export const ReportsPage = lazyWithPreload(() =>
  import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)

export const ApplicationReviewPage = lazyWithPreload(() =>
  import('@/pages/admin/ApplicationReviewPage').then((m) => ({ default: m.ApplicationReviewPage })),
)

export function preloadAdminPageModules() {
  return Promise.all([
    MembersPage.preload(),
    PositionsPage.preload(),
    CandidatesPage.preload(),
    ElectionsPage.preload(),
    ReportsPage.preload(),
    ApplicationReviewPage.preload(),
  ])
}
