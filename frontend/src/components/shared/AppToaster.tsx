import type { CSSProperties } from 'react'
import { Toaster } from 'sonner'
import { useTheme } from '@/context/ThemeContext'
import { TOAST_DURATION_MS } from '@/lib/toast-config'

export function AppToaster() {
  const { theme } = useTheme()

  return (
    <Toaster
      theme={theme}
      richColors
      closeButton
      position="top-right"
      duration={TOAST_DURATION_MS}
      visibleToasts={3}
      offset={16}
      mobileOffset={12}
      containerAriaLabel="Notifications"
      style={
        {
          // Never wider than the viewport on small/odd resolutions.
          '--width': 'min(356px, calc(100vw - 24px))',
        } as CSSProperties
      }
      toastOptions={{
        duration: TOAST_DURATION_MS,
        classNames: {
          toast:
            'group w-full max-w-full rounded-xl border border-border bg-card text-card-foreground shadow-lg backdrop-blur',
          title: 'text-sm font-semibold break-words',
          description: 'text-sm text-muted-foreground break-words',
          actionButton: 'rounded-md bg-primary text-primary-foreground',
          cancelButton: 'rounded-md bg-muted text-muted-foreground',
          closeButton: 'rounded-md border-border bg-card text-muted-foreground hover:text-foreground',
        },
      }}
    />
  )
}
