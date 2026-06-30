import { Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageLoader } from '@/components/shared/PageLoader'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { MemberLayout } from '@/components/layout/MemberLayout'
import { LoginPage } from '@/pages/LoginPage'

const BallotPage = lazy(() =>
  import('@/pages/member/BallotPage').then((m) => ({ default: m.BallotPage })),
)
const MyVotesPage = lazy(() =>
  import('@/pages/member/MyVotesPage').then((m) => ({ default: m.MyVotesPage })),
)
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const ElectionsPage = lazy(() =>
  import('@/pages/admin/ElectionsPage').then((m) => ({ default: m.ElectionsPage })),
)
const MembersPage = lazy(() =>
  import('@/pages/admin/MembersPage').then((m) => ({ default: m.MembersPage })),
)
const PositionsPage = lazy(() =>
  import('@/pages/admin/PositionsPage').then((m) => ({ default: m.PositionsPage })),
)
const CandidatesPage = lazy(() =>
  import('@/pages/admin/CandidatesPage').then((m) => ({ default: m.CandidatesPage })),
)
const ReportsPage = lazy(() =>
  import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const AuditPage = lazy(() =>
  import('@/pages/admin/AuditPage').then((m) => ({ default: m.AuditPage })),
)
const LiveStatsPage = lazy(() =>
  import('@/pages/admin/LiveStatsPage').then((m) => ({ default: m.LiveStatsPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute allowedRoles={['MEMBER']} />}>
                <Route element={<MemberLayout />}>
                  <Route
                    path="/vote"
                    element={
                      <LazyPage>
                        <BallotPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/my-votes"
                    element={
                      <LazyPage>
                        <MyVotesPage />
                      </LazyPage>
                    }
                  />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route
                    index
                    element={
                      <LazyPage>
                        <AdminDashboardPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="members"
                    element={
                      <LazyPage>
                        <MembersPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="positions"
                    element={
                      <LazyPage>
                        <PositionsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="candidates"
                    element={
                      <LazyPage>
                        <CandidatesPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="elections"
                    element={
                      <LazyPage>
                        <ElectionsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <LazyPage>
                        <ReportsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="audit"
                    element={
                      <LazyPage>
                        <AuditPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="live"
                    element={
                      <LazyPage>
                        <LiveStatsPage />
                      </LazyPage>
                    }
                  />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors closeButton position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
