import { CheckCircle2, ExternalLink, FileText, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CandidateApplication } from '@/api/applications'
import {
  dataTableScrollClass,
  responsiveTableDesktopClass,
  responsiveTableMobileClass,
} from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export interface ApplicationPositionGroup {
  positionName: string
  applications: CandidateApplication[]
}

interface ApplicationReviewGroupsProps {
  groups: ApplicationPositionGroup[]
  activeStatusTab: string
  pendingId: number | null
  onApprove: (id: number) => void
  onReject: (app: CandidateApplication) => void
}

function ApplicationMobileCard({
  app,
  activeStatusTab,
  pendingId,
  onApprove,
  onReject,
}: {
  app: CandidateApplication
  activeStatusTab: string
  pendingId: number | null
  onApprove: (id: number) => void
  onReject: (app: CandidateApplication) => void
}) {
  return (
    <div className="space-y-3 px-4 py-3.5 sm:px-5">
      <div className="flex items-center gap-3">
        {app.photo_url ? (
          <img
            src={app.photo_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-11 w-11 shrink-0 rounded-full border object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{app.full_name}</p>
          <p className="text-xs text-muted-foreground">CPM: {app.cpm_number}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="link" size="sm" asChild className="h-auto w-fit px-0">
          <a href={app.declaration_file} target="_blank" rel="noopener noreferrer">
            <FileText className="mr-1 h-3.5 w-3.5" />
            Declaration
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>

        {activeStatusTab === 'PENDING_REVIEW' ? (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-success/30 text-success hover:bg-success/10"
              onClick={() => onApprove(app.id)}
              disabled={pendingId === app.id}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => onReject(app)}
              disabled={pendingId === app.id}
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        ) : null}

        {activeStatusTab === 'REJECTED' ? (
          <p className="text-xs text-destructive sm:ml-auto">{app.rejection_reason}</p>
        ) : null}

        {activeStatusTab === 'APPROVED' ? (
          <Badge variant="success" className="sm:ml-auto">
            Approved
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

export function ApplicationReviewGroups({
  groups,
  activeStatusTab,
  pendingId,
  onApprove,
  onReject,
}: ApplicationReviewGroupsProps) {
  return (
    <div className="space-y-6">
      {groups.map(({ positionName, applications }) => (
        <section key={positionName} className="overflow-hidden rounded-xl border border-border/80">
          <header className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 sm:px-5">
            <h3 className="min-w-0 truncate text-base font-semibold sm:text-lg">{positionName}</h3>
            <Badge variant="outline" className="shrink-0 tabular-nums">
              {applications.length}
            </Badge>
          </header>

          <div className={responsiveTableMobileClass}>
            <div className="divide-y divide-border/70">
              {applications.map((app) => (
                <ApplicationMobileCard
                  key={app.id}
                  app={app}
                  activeStatusTab={activeStatusTab}
                  pendingId={pendingId}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
            </div>
          </div>

          <div className={cn(dataTableScrollClass, responsiveTableDesktopClass)}>
            <Table className="min-w-[760px] table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Candidate Name</TableHead>
                  <TableHead className="w-[140px]">CPM Number</TableHead>
                  <TableHead className="min-w-[150px]">Declaration</TableHead>
                  {activeStatusTab === 'PENDING_REVIEW' ? (
                    <TableHead className="w-[220px] text-right">Actions</TableHead>
                  ) : null}
                  {activeStatusTab === 'REJECTED' ? (
                    <TableHead className="min-w-[200px]">Reason</TableHead>
                  ) : null}
                  {activeStatusTab === 'APPROVED' ? (
                    <TableHead className="w-[140px] text-right">Status</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      <div className="flex min-w-0 items-center gap-3">
                        {app.photo_url ? (
                          <img
                            src={app.photo_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-10 w-10 shrink-0 rounded-full border object-cover"
                          />
                        ) : null}
                        <span className="truncate">{app.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{app.cpm_number}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" asChild className="h-auto px-0">
                        <a href={app.declaration_file} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-1.5 h-4 w-4" />
                          <span className="hidden xl:inline">View Document</span>
                          <span className="xl:hidden">View</span>
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    </TableCell>
                    {activeStatusTab === 'PENDING_REVIEW' ? (
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-success hover:bg-success/10 hover:text-success"
                            onClick={() => onApprove(app.id)}
                            disabled={pendingId === app.id}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onReject(app)}
                            disabled={pendingId === app.id}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                    {activeStatusTab === 'REJECTED' ? (
                      <TableCell>
                        <span className="line-clamp-2 text-sm text-destructive">{app.rejection_reason}</span>
                      </TableCell>
                    ) : null}
                    {activeStatusTab === 'APPROVED' ? (
                      <TableCell className="text-right">
                        <Badge variant="success">Approved</Badge>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
