import { Pencil, Trash2, UserRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { cn } from '@/lib/utils'
import type { Candidate, Position } from '@/types/api'

export interface PositionCandidateGroup {
  position: Position
  candidates: Candidate[]
}

interface CandidatePositionGroupsProps {
  groups: PositionCandidateGroup[]
  onEdit: (candidate: Candidate) => void
  onDelete: (candidate: Candidate) => void
  readOnly?: boolean
  className?: string
}

export function CandidatePositionGroups({
  groups,
  onEdit,
  onDelete,
  readOnly = false,
  className,
}: CandidatePositionGroupsProps) {
  return (
    <div className={cn('space-y-5', className)}>
      {groups.map(({ position, candidates }) => (
        <Card key={position.name} className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">{position.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {candidates.length === 0
                    ? 'No candidates registered for this position yet.'
                    : `${candidates.length} candidate${candidates.length === 1 ? '' : 's'} running`}
                </p>
              </div>
              <Badge variant={candidates.length > 0 ? 'default' : 'muted'}>
                {candidates.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-4 md:p-5">
            {candidates.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                <UserRound className="h-5 w-5 shrink-0 opacity-60" aria-hidden="true" />
                Add a candidate for this position using the button above.
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <article className="group flex h-full items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                      <img
                        src={optimizeCloudinaryUrl(candidate.photo_url, 96)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-background"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{candidate.full_name}</p>
                        <p className="text-xs text-muted-foreground">{candidate.academic_year}</p>
                      </div>
                      {readOnly ? null : (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(candidate)}
                            aria-label={`Edit ${candidate.full_name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onDelete(candidate)}
                            aria-label={`Delete ${candidate.full_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function buildPositionCandidateGroups(
  positions: Position[] | undefined,
  candidates: Candidate[] | undefined,
): PositionCandidateGroup[] {
  if (!positions?.length) return []

  const uniquePositions = new Map<string, Position>()
  for (const p of positions) {
    if (!uniquePositions.has(p.name)) {
      uniquePositions.set(p.name, p)
    }
  }

  const byPositionName = new Map<string, Candidate[]>()
  for (const candidate of candidates ?? []) {
    const list = byPositionName.get(candidate.position_name) ?? []
    list.push(candidate)
    byPositionName.set(candidate.position_name, list)
  }

  return Array.from(uniquePositions.values()).map((position) => ({
    position,
    candidates: (byPositionName.get(position.name) ?? []).sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    ),
  }))
}
