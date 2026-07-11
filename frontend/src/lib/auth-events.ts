export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired'

export function dispatchAuthSessionExpired() {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT))
}
