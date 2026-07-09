import { lazyWithPreload } from '@/lib/lazyWithPreload'

export const AdminLayout = lazyWithPreload(() =>
  import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)

export const MemberLayout = lazyWithPreload(() =>
  import('@/components/layout/MemberLayout').then((m) => ({ default: m.MemberLayout })),
)

export const AdminDashboardPage = lazyWithPreload(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)

export const BallotPage = lazyWithPreload(() =>
  import('@/pages/member/BallotPage').then((m) => ({ default: m.BallotPage })),
)

export const CandidateApplicationPage = lazyWithPreload(() =>
  import('@/pages/member/CandidateApplicationPage').then((m) => ({ default: m.CandidateApplicationPage })),
)

export function preloadAdminShell() {
  return Promise.all([AdminLayout.preload(), AdminDashboardPage.preload()])
}

export function preloadMemberShell() {
  return Promise.all([MemberLayout.preload(), BallotPage.preload(), CandidateApplicationPage.preload()])
}
