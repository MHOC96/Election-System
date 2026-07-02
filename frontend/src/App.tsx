import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { PageLoader } from '@/components/shared/PageLoader'
import { LoginPage } from '@/pages/LoginPage'
import {
  AdminDashboardPage,
  AdminLayout,
  BallotPage,
  MemberLayout,
} from '@/routes/corePages'
import {
  CandidatesPage,
  ElectionsPage,
  MembersPage,
  PositionsPage,
  ReportsPage,
} from '@/routes/adminPages'

const AppToaster = lazy(() =>
  import('@/components/shared/AppToaster').then((m) => ({ default: m.AppToaster })),
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

const layoutFallback = <PageLoader className="min-h-screen" />
const pageFallback = <PageLoader className="min-h-[50vh]" />

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
                      <Suspense fallback={pageFallback}>
                        <BallotPage />
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
                      <Suspense fallback={pageFallback}>
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
          <Suspense fallback={null}>
            <AppToaster />
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
