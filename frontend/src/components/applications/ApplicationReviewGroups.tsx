import { CalendarClock, CheckCircle2, CreditCard, ExternalLink, FileText, Loader2, Phone, UserRound, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CandidateApplication } from '@/api/applications'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import {
  applicationReviewCardClass,
  applicationReviewGridClass,
  applicationReviewSectionHeaderClass,
  applicationReviewSectionBodyClass,
} from '@/lib/design-tokens'
import { formatDate } from '@/lib/utils'

export interface ApplicationPositionGroup {
  positionName: string
  applications: CandidateApplication[]
}

interface ApplicationReviewGroupsProps {
  groups: ApplicationPositionGroup[]
  pendingId: number | null
  onApprove: (app: CandidateApplication) => void
  onReject: (app: CandidateApplication) => void
}

interface ApplicantCardProps {
  app: CandidateApplication
  pendingId: number | null
  onApprove: (app: CandidateApplication) => void
  onReject: (app: CandidateApplication) => void
}

function ApplicantCard({ app, pendingId, onApprove, onReject }: ApplicantCardProps) {
  const isBusy = pendingId === app.id
  const isPending = app.status === 'PENDING_REVIEW'

  return (
    <article className={applicationReviewCardClass}>
      <header className="flex items-start gap-3">
        {app.photo_url ? (
          <img
            src={optimizeCloudinaryUrl(app.photo_url, 96)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-12 w-12 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold leading-snug sm:text-base">{app.full_name}</h4>
        </div>

        {app.status === 'APPROVED' ? <Badge variant="success">Approved</Badge> : null}
        {app.status === 'REJECTED' ? <Badge variant="destructive">Rejected</Badge> : null}
      </header>

      <dl className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <dt className="sr-only">CPM number</dt>
          <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
          <dd className="truncate">CPM {app.member_cpm || app.cpm_number}</dd>
        </div>

        {app.member_mc ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">MC number</dt>
            <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <dd className="truncate">MC {app.member_mc}</dd>
          </div>
        ) : null}

        {app.member_academic_year ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Academic year</dt>
            <UserRound className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <dd className="truncate">{app.member_academic_year}</dd>
          </div>
        ) : null}

        {app.contact_number ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Contact number</dt>
            <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <dd className="truncate">{app.contact_number}</dd>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <dt className="sr-only">Submitted</dt>
          <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
          <dd className="truncate">Submitted {formatDate(app.submitted_at)}</dd>
        </div>
      </dl>

      {app.status === 'REJECTED' && app.rejection_reason ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive ring-1 ring-inset ring-destructive/20">
          {app.rejection_reason}
        </p>
      ) : null}

      <div className="mt-auto space-y-2 pt-1">
        <Button variant="outline" size="sm" asChild className="h-9 w-full justify-center">
          <a href={app.declaration_file} target="_blank" rel="noopener noreferrer">
            <FileText className="h-4 w-4" aria-hidden="true" />
            View declaration
            <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
          </a>
        </Button>

        {isPending ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-success/30 text-success hover:bg-success/10 hover:text-success"
              onClick={() => onApprove(app)}
              disabled={isBusy}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onReject(app)}
              disabled={isBusy}
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Reject
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function ApplicationReviewGroups({
  groups,
  pendingId,
  onApprove,
  onReject,
}: ApplicationReviewGroupsProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      {groups.map(({ positionName, applications }) => (
        <section
          key={positionName}
          className="overflow-hidden rounded-xl border border-border/80 bg-muted/10"
          aria-label={`${positionName} applications`}
        >
          <header className={applicationReviewSectionHeaderClass}>
            <h3 className="min-w-0 truncate text-sm font-semibold sm:text-base">{positionName}</h3>
            <Badge variant="outline" className="shrink-0 bg-card tabular-nums">
              {applications.length}
            </Badge>
          </header>

          <div className={applicationReviewSectionBodyClass}>
            <div className={applicationReviewGridClass}>
              {applications.map((app) => (
                <ApplicantCard
                  key={app.id}
                  app={app}
                  pendingId={pendingId}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

export function buildApplicationPositionGroups(
  positionNames: string[],
  applications: CandidateApplication[],
): ApplicationPositionGroup[] {
  const grouped = applications.reduce<Record<string, CandidateApplication[]>>((acc, app) => {
    if (!acc[app.position_name]) acc[app.position_name] = []
    acc[app.position_name].push(app)
    return acc
  }, {})

  return positionNames
    .filter((name) => grouped[name]?.length)
    .map((positionName) => ({
      positionName,
      applications: grouped[positionName],
    }))
}
