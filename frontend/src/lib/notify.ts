import { TOAST_DURATION_MS } from '@/lib/toast-config'

type ToastModule = typeof import('sonner')

let toastModule: ToastModule | null = null

async function loadToast(): Promise<ToastModule> {
  if (!toastModule) {
    toastModule = await import('sonner')
  }
  return toastModule
}

export async function notifySuccess(message: string) {
  const { toast } = await loadToast()
  toast.success(message, { duration: TOAST_DURATION_MS })
}

export async function notifyError(message: string) {
  const { toast } = await loadToast()
  toast.error(message, { duration: TOAST_DURATION_MS })
}
