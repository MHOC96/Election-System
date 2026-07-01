import { ShieldCheck } from 'lucide-react'

export function SecureSessionBanner() {
  return (
    <div
      className="border-b bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground"
      role="status"
    >
      <ShieldCheck className="mb-0.5 inline h-3.5 w-3.5 align-text-bottom text-success" aria-hidden="true" />
      <span className="ml-1.5">
        Secure session — one vote per position, irreversible
      </span>
    </div>
  )
}
