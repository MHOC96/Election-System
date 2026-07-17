import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, Download, FileText, Inbox, Loader2 } from 'lucide-react'
import { exportReport, fetchReportsStatus, getDefaultReportElection } from '@/api/reports'
import { notifyApiError, notifySuccessMessage } from '@/lib/notify'
import { SUCCESS_MESSAGES } from '@/lib/user-messages'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ExportFormat, ReportType } from '@/types/api'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageNotice } from '@/components/shared/PageNotice'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { sectionDelays, Stagger, StaggerChildren } from '@/components/motion/Stagger'
import { pageHeaderBlockClass, pageLayoutClass } from '@/lib/design-tokens'
import { REPORTS_STATUS_QUERY_KEY, REPORTS_STATUS_STALE_MS } from '@/lib/query-sync'

const reports: { type: ReportType; title: string; description: string }[] = [
  { type: 'results', title: 'Election Results', description: 'Vote counts and winners per position' },
  { type: 'candidates', title: 'Candidate List', description: 'All registered candidates for the archived election' },
  { type: 'turnout', title: 'Turnout Report', description: 'Voter turnout statistics by position' },
  { type: 'participation', title: 'Participation List', description: 'Members who voted and their ballot status' },
]

export function ReportsPage() {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [activeTab, setActiveTab] = useState('2nd Year')
  const [loading, setLoading] = useState<ReportType | null>(null)
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null)

  const statusQuery = useQuery({
    queryKey: REPORTS_STATUS_QUERY_KEY,
    queryFn: fetchReportsStatus,
    staleTime: REPORTS_STATUS_STALE_MS,
  })

  const isInitialLoad = statusQuery.isPending && !statusQuery.data

  const archivedElections = statusQuery.data?.archived_elections ?? []
  const activeElection = statusQuery.data?.active_election ?? null
  const reportsAvailable = statusQuery.data?.available ?? false

  useEffect(() => {
    if (!reportsAvailable) {
      setSelectedElectionId(null)
      return
    }
    setSelectedElectionId((current) => {
      if (current && archivedElections.some((election) => election.id === current)) {
        return current
      }
      return getDefaultReportElection(archivedElections)?.id ?? null
    })
  }, [archivedElections, reportsAvailable])

  const selectedElection =
    archivedElections.find((election) => election.id === selectedElectionId) ??
    getDefaultReportElection(archivedElections)

  const handleExport = async (type: ReportType) => {
    if (!selectedElection) return
    setLoading(type)
    try {
      await exportReport(type, format, selectedElection.id, activeTab)
      notifySuccessMessage(SUCCESS_MESSAGES.reportDownloaded)
    } catch (error) {
      notifyApiError(error, 'report')
    } finally {
      setLoading(null)
    }
  }

  if (statusQuery.isError) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Reports" description="Export election data in PDF, Excel, or CSV" />
        <QueryErrorState
          title="Failed to load report availability"
          onRetry={() => void statusQuery.refetch()}
          isRetrying={statusQuery.isFetching}
        />
      </div>
    )
  }

  if (isInitialLoad) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Reports" description="Export election data in PDF, Excel, or CSV" />
        <Card>
          <CardContent
            className="flex min-h-[12rem] flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <span>Loading report availability…</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <div className={pageHeaderBlockClass}>
          <PageHeader
            title="Reports"
            description="Export archived election data in PDF, Excel, or CSV"
            action={
              reportsAvailable ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {archivedElections.length > 1 ? (
                    <Select
                      value={selectedElection ? String(selectedElection.id) : undefined}
                      onValueChange={(value) => setSelectedElectionId(Number(value))}
                    >
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue placeholder="Select election" />
                      </SelectTrigger>
                      <SelectContent>
                        {archivedElections.map((election) => (
                          <SelectItem key={election.id} value={String(election.id)}>
                            {election.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="xlsx">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null
            }
          />

          {reportsAvailable && selectedElection ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="inline-flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                {selectedElection.name}
              </Badge>
              <span className="text-sm text-muted-foreground">Archived election reports</span>
            </div>
          ) : null}

          {!reportsAvailable && activeElection ? (
            <PageNotice>
              Reports become available after you publish results and archive the current election.
              Finish the election lifecycle to export results, turnout, candidates, and participation
              data.
            </PageNotice>
          ) : null}
        </div>
      </Stagger>

      {!reportsAvailable ? (
        <Stagger delayMs={sectionDelays.primary}>
          <EmptyState
            icon={Inbox}
            title="No reports available"
            description={
              activeElection
                ? 'Archive the current election to unlock downloadable reports.'
                : 'There are no archived elections yet. Create and complete an election, then archive it to export reports.'
            }
          />
        </Stagger>
      ) : (
        <>
          <Stagger delayMs={sectionDelays.header + 50}>
            <div className="mb-4 w-full max-w-xs sm:mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="2nd Year">2nd Year</TabsTrigger>
                  <TabsTrigger value="3rd Year">3rd Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </Stagger>

          <Stagger delayMs={sectionDelays.primary}>
            <StaggerChildren className="grid gap-4 sm:grid-cols-2" staggerMs={70}>
              {reports.map((report) => (
                <Card key={report.type}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{report.title}</CardTitle>
                    </div>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      onClick={() => void handleExport(report.type)}
                      disabled={loading === report.type || !selectedElection}
                    >
                      <Download className="h-4 w-4" />
                      {loading === report.type ? 'Exporting...' : `Download ${format.toUpperCase()}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </StaggerChildren>
          </Stagger>
        </>
      )}
    </div>
  )
}
