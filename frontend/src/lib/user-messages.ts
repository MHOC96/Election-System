import axios from 'axios'
import type { ApiFailure } from '@/types/api'

export interface UserMessage {
  title: string
  description: string
}

export type ApiErrorContext =
  | 'login'
  | 'logout'
  | 'vote'
  | 'application'
  | 'import'
  | 'upload'
  | 'report'
  | 'election'
  | 'password'
  | 'general'

const FIELD_LABELS: Record<string, string> = {
  cpm_number: 'CPM number',
  mc_number: 'MC number',
  full_name: 'Full name',
  contact_number: 'Contact number',
  position: 'Position',
  position_id: 'Position',
  candidate_id: 'Candidate',
  photo_url: 'Photo',
  photo_file: 'Photo',
  declaration_file: 'Declaration form',
  file: 'File',
  academic_year: 'Academic year',
  name: 'Name',
  new_password: 'New password',
  confirm_password: 'Confirm password',
  current_password: 'Current password',
  non_field_errors: 'Error',
  detail: 'Error',
}

const ERROR_TITLES: Record<string, string> = {
  throttled: 'Too many attempts',
  authentication_failed: 'Sign-in failed',
  not_authenticated: 'Sign-in required',
  permission_denied: 'Access denied',
  not_found: 'Not found',
  NOT_FOUND: 'Not found',
  duplicate_vote: 'Vote already recorded',
  election_not_active: 'Voting is not open',
  not_authorized: 'Cannot vote',
  invalid_position: 'Invalid position',
  invalid_candidate: 'Invalid candidate',
  candidate_position_mismatch: 'Candidate mismatch',
  ineligible_position: 'Not eligible',
  vote_error: 'Vote not saved',
  invalid_file: 'Invalid file',
  invalid_format: 'Invalid format',
  upload_failed: 'Upload failed',
  no_election: 'No election available',
  election_not_archived: 'Reports not ready',
  report_error: 'Report unavailable',
  invalid: 'Invalid input',
  validation_error: 'Please check your entries',
}

const ERROR_DESCRIPTIONS: Record<string, string> = {
  throttled: 'You have made too many requests. Please wait a minute and try again.',
  authentication_failed: 'The CPM number or MC number is incorrect. Check your details and try again.',
  not_authenticated: 'Your session has expired. Please sign in again.',
  permission_denied: 'You do not have permission to perform this action.',
  not_found: 'The item you are looking for could not be found. It may have been removed.',
  NOT_FOUND: 'The item you are looking for could not be found.',
  duplicate_vote: 'You have already voted for this position. Votes cannot be changed once submitted.',
  election_not_active: 'Voting is not open right now. Please return when the ballot is live.',
  not_authorized: 'Only active members can vote in this election.',
  invalid_position: 'This position is not available on the ballot.',
  invalid_candidate: 'This candidate is not available for the selected position.',
  candidate_position_mismatch: 'The selected candidate does not belong to this position.',
  ineligible_position: 'You are not eligible to vote for this position based on your academic year.',
  invalid_file: 'The file could not be read. Use a valid CSV or Excel file and try again.',
  invalid_format: 'Choose CSV, Excel, or PDF for the export format.',
  upload_failed: 'The file could not be uploaded. Check the file type and size, then try again.',
  no_election: 'There is no archived election to export reports from yet.',
  election_not_archived: 'Reports are available only after an election has been archived.',
}

const CONTEXT_FALLBACKS: Record<ApiErrorContext, UserMessage> = {
  login: {
    title: 'Sign-in failed',
    description: 'We could not sign you in. Check your CPM number and MC number, then try again.',
  },
  logout: {
    title: 'Sign-out failed',
    description: 'We could not sign you out. Please refresh the page and try again.',
  },
  vote: {
    title: 'Vote not saved',
    description: 'Your vote could not be recorded. Please try again.',
  },
  application: {
    title: 'Application not sent',
    description: 'Your application could not be submitted. Review the form and try again.',
  },
  import: {
    title: 'Import failed',
    description: 'Members could not be imported. Check your file and try again.',
  },
  upload: {
    title: 'Upload failed',
    description: 'The file could not be uploaded. Try a different file.',
  },
  report: {
    title: 'Report not available',
    description: 'The report could not be downloaded. Try again in a moment.',
  },
  election: {
    title: 'Election action failed',
    description: 'This election action could not be completed. Try again.',
  },
  password: {
    title: 'Password not updated',
    description: 'Your password could not be changed. Check the requirements and try again.',
  },
  general: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
  },
}

function humanizeFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function humanizeValidationText(text: string): string {
  const normalized = text.trim()
  const replacements: [RegExp, string][] = [
    [/This field is required\.?/i, 'This field is required.'],
    [/may not be blank\.?/i, 'cannot be empty.'],
    [/Enter a valid email address\.?/i, 'Enter a valid email address.'],
    [/Ensure this field has no more than (\d+) characters\.?/i, 'Must be $1 characters or fewer.'],
    [/Ensure this field has at least (\d+) characters\.?/i, 'Must be at least $1 characters.'],
    [/already exists\.?/i, 'is already in use.'],
  ]

  let result = normalized
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function formatValidationDetails(details: Record<string, unknown>): string {
  const lines = Object.entries(details).flatMap(([field, value]) => {
    const label = FIELD_LABELS[field] ?? humanizeFieldName(field)

    if (Array.isArray(value)) {
      return value.map((item) => {
        const text = humanizeValidationText(String(item))
        return field === 'non_field_errors' ? text : `${label}: ${text}`
      })
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) => {
        const nestedLabel = FIELD_LABELS[nestedKey] ?? humanizeFieldName(nestedKey)
        const text = humanizeValidationText(String(nestedValue))
        return `${label} — ${nestedLabel}: ${text}`
      })
    }

    const text = humanizeValidationText(String(value))
    return field === 'non_field_errors' ? text : `${label}: ${text}`
  })

  return lines.filter(Boolean).join('\n')
}

function isGenericBackendMessage(message: string): boolean {
  return (
    message === 'Request validation failed.' ||
    message === 'An error occurred.' ||
    message === 'Not found.' ||
    message === 'Authentication credentials were not provided.'
  )
}

function messageFromStatus(status: number | undefined): UserMessage | null {
  if (status === 429) {
    return {
      title: ERROR_TITLES.throttled,
      description: ERROR_DESCRIPTIONS.throttled,
    }
  }
  if (status === 401) {
    return {
      title: ERROR_TITLES.not_authenticated,
      description: ERROR_DESCRIPTIONS.not_authenticated,
    }
  }
  if (status === 403) {
    return {
      title: ERROR_TITLES.permission_denied,
      description: ERROR_DESCRIPTIONS.permission_denied,
    }
  }
  if (status === 404) {
    return {
      title: ERROR_TITLES.not_found,
      description: ERROR_DESCRIPTIONS.not_found,
    }
  }
  if (status && status >= 500) {
    return {
      title: 'Server error',
      description: 'Something went wrong on our side. Please try again in a few moments.',
    }
  }
  return null
}

export function resolveApiUserMessage(
  error: unknown,
  context: ApiErrorContext = 'general',
): UserMessage {
  const fallback = CONTEXT_FALLBACKS[context]

  if (axios.isAxiosError<ApiFailure>(error)) {
    if (!error.response) {
      return {
        title: 'Connection problem',
        description: 'We could not reach the server. Check your internet connection and try again.',
      }
    }

    const statusMessage = messageFromStatus(error.response.status)
    const apiError = error.response.data?.error

    if (apiError?.details && typeof apiError.details === 'object') {
      const description = formatValidationDetails(apiError.details)
      return {
        title: ERROR_TITLES[apiError.code] ?? ERROR_TITLES.validation_error,
        description: description || fallback.description,
      }
    }

    if (apiError?.code) {
      const title = ERROR_TITLES[apiError.code] ?? fallback.title
      const mappedDescription = ERROR_DESCRIPTIONS[apiError.code]
      const description =
        mappedDescription ??
        (apiError.message && !isGenericBackendMessage(apiError.message)
          ? apiError.message
          : fallback.description)

      return { title, description }
    }

    if (apiError?.message && !isGenericBackendMessage(apiError.message)) {
      return {
        title: fallback.title,
        description: apiError.message,
      }
    }

    if (statusMessage) {
      return statusMessage
    }

    return fallback
  }

  if (error instanceof Error && error.message) {
    return {
      title: fallback.title,
      description: error.message,
    }
  }

  return fallback
}

export function formatUserMessage(message: UserMessage): string {
  if (message.title === message.description) return message.description
  return `${message.title}: ${message.description}`
}

export const SUCCESS_MESSAGES = {
  applicationSubmitted: {
    title: 'Application submitted',
    description: 'We received your application. Status updates will appear on this page.',
  },
  applicationReviewed: (action: 'Approved' | 'Rejected') => ({
    title: action === 'Approved' ? 'Application approved' : 'Application rejected',
    description:
      action === 'Approved'
        ? 'The member will appear on the ballot for this position.'
        : 'The member has been notified by their application status.',
  }),
  passwordChanged: {
    title: 'Password updated',
    description: 'Your new password is now active. Use it the next time you sign in.',
  },
  memberImport: (message?: string) => ({
    title: 'Import complete',
    description: message ?? 'Member records were processed successfully.',
  }),
  voteRecorded: {
    title: 'Vote recorded',
    description: 'Your choice has been saved. It cannot be changed for this position.',
  },
  saved: {
    title: 'Saved',
    description: 'Your changes were saved successfully.',
  },
  deleted: {
    title: 'Removed',
    description: 'The item was removed successfully.',
  },
  reportDownloaded: {
    title: 'Report downloaded',
    description: 'Your file should appear in your downloads folder.',
  },
} as const
