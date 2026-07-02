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
      containerAriaLabel="Notifications"
      toastOptions={{
        duration: TOAST_DURATION_MS,
        classNames: {
          toast:
            'group rounded-xl border border-border bg-card text-card-foreground shadow-lg backdrop-blur',
          title: 'text-sm font-semibold',
          description: 'text-sm text-muted-foreground',
          actionButton: 'rounded-md bg-primary text-primary-foreground',
          cancelButton: 'rounded-md bg-muted text-muted-foreground',
          closeButton: 'rounded-md border-border bg-card text-muted-foreground hover:text-foreground',
        },
      }}
    />
  )
}
