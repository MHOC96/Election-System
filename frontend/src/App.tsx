import { Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { PageLoader } from '@/components/shared/PageLoader'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { LoginPage } from '@/pages/LoginPage'
import {
  AdminDashboardPage,
  AdminLayout,
  BallotPage,
  CandidateApplicationPage,
  MemberLayout,
} from '@/routes/corePages'
import {
  CandidatesPage,
  ElectionsPage,
  MembersPage,
  PositionsPage,
  ReportsPage,
  ApplicationReviewPage,
} from '@/routes/adminPages'
import { AppToaster } from '@/components/shared/AppToaster'

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

const layoutFallback = <PageLoader className="min-h-screen" />
const pageFallback = <PageLoader className="min-h-[50vh]" />
const dashboardFallback = <DashboardSkeleton />
const ballotFallback = (
  <div className="mx-auto max-w-3xl space-y-4 p-4">
    <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
    <div className="h-36 w-full animate-pulse rounded-xl bg-muted" />
    <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
  </div>
)

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute allowedRoles={['MEMBER']} />}>
                <Route
                  element={
                    <Suspense fallback={layoutFallback}>
                      <MemberLayout />
                    </Suspense>
                  }
                >
                  <Route
                    path="/vote"
                    element={
                      <Suspense fallback={ballotFallback}>
                        <BallotPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/apply"
                    element={
                      <Suspense fallback={pageFallback}>
                        <CandidateApplicationPage />
                      </Suspense>
                    }
                  />
                  <Route path="/my-votes" element={<Navigate to="/vote" replace />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route
                  path="/admin"
                  element={
                    <Suspense fallback={layoutFallback}>
                      <AdminLayout />
                    </Suspense>
                  }
                >
                  <Route
                    index
                    element={
                      <Suspense fallback={dashboardFallback}>
                        <AdminDashboardPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="members"
                    element={
                      <Suspense fallback={pageFallback}>
                        <MembersPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="positions"
                    element={
                      <Suspense fallback={pageFallback}>
                        <PositionsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="applications"
                    element={
                      <Suspense fallback={pageFallback}>
                        <ApplicationReviewPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="candidates"
                    element={
                      <Suspense fallback={pageFallback}>
                        <CandidatesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="elections"
                    element={
                      <Suspense fallback={pageFallback}>
                        <ElectionsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <Suspense fallback={pageFallback}>
                        <ReportsPage />
                      </Suspense>
                    }
                  />
                  <Route path="live" element={<Navigate to="/admin" replace />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
          <AppToaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
