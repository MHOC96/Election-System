import { ArrowLeft, Home, LogIn, MapPinOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageSeo } from '@/components/shared/PageSeo'
import { SkipToContent } from '@/components/shared/SkipToContent'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { MAIN_CONTENT_ID } from '@/lib/a11y'
import { brandMarkClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface NotFoundPageProps {
  /** When rendered inside admin shell — compact layout without full-page chrome. */
  embedded?: boolean
}

export function NotFoundPage({ embedded = false }: NotFoundPageProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isAuthenticated, user, isLoading } = useAuth()

  const homeHref =
    isAuthenticated && user?.role === 'ADMIN'
      ? '/admin'
      : isAuthenticated
        ? '/'
        : '/login'

  const homeLabel =
    isAuthenticated && user?.role === 'ADMIN'
      ? 'Admin dashboard'
      : isAuthenticated
        ? 'Member portal'
        : 'Sign in'

  const content = (
    <>
      <PageSeo
        title="Page Not Found"
        description="The page you requested does not exist or may have been moved."
        path={pathname}
        noindex
      />

      <div
        className={cn(
          embedded
            ? 'flex min-h-[50vh] flex-col items-center justify-center py-8'
            : 'app-canvas bg-grid relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden px-4 py-10 surface-page',
        )}
      >
        {!embedded ? (
          <>
            <SkipToContent />
            <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
              <ThemeToggle />
            </div>
          </>
        ) : null}

        <main
          id={embedded ? undefined : MAIN_CONTENT_ID}
          className={cn(
            'w-full animate-fade-in',
            embedded ? 'max-w-lg' : 'max-w-md',
          )}
        >
          <Card className="portal-surface border-border/80 shadow-lg">
            <CardHeader className="items-center space-y-4 pb-2 text-center">
              {!embedded ? (
                <div className={cn(brandMarkClass, 'mx-auto h-12 w-12')}>
                  <MapPinOff className="h-5 w-5" aria-hidden="true" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-muted-foreground">
                  <MapPinOff className="h-7 w-7" aria-hidden="true" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Error 404
                </p>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Page not found
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  The address you entered does not match any page in the election portal. Check the
                  URL or return to a known section.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 pt-2">
              {!isLoading && isAuthenticated ? (
                <Button asChild className="w-full">
                  <Link to={homeHref}>
                    <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                    {homeLabel}
                  </Link>
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link to="/login">
                    <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                    Sign in
                  </Link>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Go back
              </Button>

              {!embedded && !isLoading && isAuthenticated ? (
                <Button asChild variant="ghost" className="w-full text-muted-foreground">
                  <Link to="/login">Switch account</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {!embedded ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              EC Election System · Secure executive committee portal
            </p>
          ) : null}
        </main>
      </div>
    </>
  )

  return content
}
