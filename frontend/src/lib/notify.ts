import { toast } from 'sonner'

import { TOAST_DURATION_MS } from '@/lib/toast-config'
import {
  formatUserMessage,
  resolveApiUserMessage,
  type ApiErrorContext,
  type UserMessage,
} from '@/lib/user-messages'

const toastOptions = { duration: TOAST_DURATION_MS } as const

function showToast(
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  description?: string,
) {
  const options = {
    ...toastOptions,
    ...(description ? { description } : {}),
  }

  switch (type) {
    case 'success':
      toast.success(title, options)
      break
    case 'error':
      toast.error(title, options)
      break
    case 'warning':
      toast.warning(title, options)
      break
    case 'info':
      toast.info(title, options)
      break
  }
}

export function notifySuccess(title: string, description?: string) {
  showToast('success', title, description)
}

export function notifySuccessMessage(message: UserMessage) {
  showToast('success', message.title, message.description)
}

export function notifyError(title: string, description?: string) {
  showToast('error', title, description)
}

export function notifyErrorMessage(message: UserMessage) {
  showToast('error', message.title, message.description)
}

export function notifyApiError(error: unknown, context: ApiErrorContext = 'general') {
  notifyErrorMessage(resolveApiUserMessage(error, context))
}

export function notifyWarning(title: string, description?: string) {
  showToast('warning', title, description)
}

export function notifyInfo(title: string, description?: string) {
  showToast('info', title, description)
}

/** Flat string for inline error text (forms, labels). */
export function getUserErrorText(error: unknown, context: ApiErrorContext = 'general'): string {
  return formatUserMessage(resolveApiUserMessage(error, context))
}
