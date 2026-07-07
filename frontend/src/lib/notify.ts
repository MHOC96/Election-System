import { toast } from 'sonner'

import { TOAST_DURATION_MS } from '@/lib/toast-config'

const toastOptions = { duration: TOAST_DURATION_MS } as const

export function notifySuccess(message: string) {
  toast.success(message, toastOptions)
}

export function notifyError(message: string) {
  toast.error(message, toastOptions)
}

export function notifyWarning(message: string) {
  toast.warning(message, toastOptions)
}

export function notifyInfo(message: string) {
  toast.info(message, toastOptions)
}
