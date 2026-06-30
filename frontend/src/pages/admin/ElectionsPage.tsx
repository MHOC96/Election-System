import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Lock, Plus, Vote } from 'lucide-react'
import {
  closeElection,
  createElection,
  fetchElections,
  startElection,
  stopElection,
} from '@/api/elections'
import { getApiErrorMessage } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Election, ElectionStatus } from '@/types/api'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

function statusVariant(status: ElectionStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'success' as const
    case 'STOPPED':
      return 'warning' as const
    case 'CLOSED':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

export function ElectionsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')

  const { data: elections, isLoading } = useQuery({
    queryKey: ['elections'],
    queryFn: fetchElections,
  })

  const createMutation = useMutation({
    mutationFn: () => createElection(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['elections'] })
      toast.success('Election created')
      setDialogOpen(false)
      setName('')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'start' | 'stop' | 'close' }) => {
      if (action === 'start') return startElection(id)
      if (action === 'stop') return stopElection(id)
      return closeElection(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['elections'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success('Election updated')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const renderActions = (election: Election) => {
    const actions = []
    if (election.status === 'DRAFT' || election.status === 'STOPPED') {
      actions.push(
        <Button key="start" size="sm" onClick={() => actionMutation.mutate({ id: election.id, action: 'start' })}>
          <Play className="h-4 w-4" />
          Start
        </Button>,
      )
    }
    if (election.status === 'ACTIVE') {
      actions.push(
        <Button
          key="stop"
          size="sm"
          variant="outline"
          onClick={() => actionMutation.mutate({ id: election.id, action: 'stop' })}
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>,
      )
    }
    if (election.status === 'ACTIVE' || election.status === 'STOPPED') {
      actions.push(
        <Button
          key="close"
          size="sm"
          variant="destructive"
          onClick={() => actionMutation.mutate({ id: election.id, action: 'close' })}
        >
          <Lock className="h-4 w-4" />
          Close
        </Button>,
      )
    }
    return actions.length ? <div className="flex flex-wrap gap-2">{actions}</div> : null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Elections</h2>
          <p className="text-muted-foreground">Create and manage election lifecycle</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Election
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !elections?.length ? (
        <EmptyState
          icon={Vote}
          title="No elections"
          description="Create an election, then start it when ready for voting."
        />
      ) : (
        <div className="grid gap-4">
          {elections.map((election) => (
            <Card key={election.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{election.name}</CardTitle>
                    <Badge variant={statusVariant(election.status)}>{election.status}</Badge>
                  </div>
                  <CardDescription className="mt-1">
                    Created {formatDate(election.created_at)}
                    {election.started_at && ` · Started ${formatDate(election.started_at)}`}
                    {election.closed_at && ` · Closed ${formatDate(election.closed_at)}`}
                  </CardDescription>
                </div>
                {renderActions(election)}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Election</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="election-name">Election Name</Label>
            <Input
              id="election-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2026 Executive Election"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
