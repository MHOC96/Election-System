import { toast } from 'sonner'

import { TOAST_DURATION_MS } from '@/lib/toast-config'

export function notifySuccess(message: string) {
  toast.success(message, { duration: TOAST_DURATION_MS })
}

export function notifyError(message: string) {
  toast.error(message, { duration: TOAST_DURATION_MS })
}
