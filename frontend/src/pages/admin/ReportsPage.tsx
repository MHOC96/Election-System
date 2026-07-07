import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { exportReport } from '@/api/reports'
import { getApiErrorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExportFormat, ReportType } from '@/types/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { sectionDelays, Stagger, StaggerChildren } from '@/components/motion/Stagger'
import { pageLayoutClass } from '@/lib/design-tokens'
import { notifyError } from '@/lib/notify'

const reports: { type: ReportType; title: string; description: string }[] = [
  { type: 'results', title: 'Election Results', description: 'Vote counts and winners per position' },
  { type: 'candidates', title: 'Candidate List', description: 'All registered candidates' },
  { type: 'turnout', title: 'Turnout Report', description: 'Voter turnout statistics' },
  { type: 'participation', title: 'Participation List', description: 'Members who have voted' },
]

export function ReportsPage() {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [loading, setLoading] = useState<ReportType | null>(null)

  const handleExport = async (type: ReportType) => {
    setLoading(type)
    try {
      await exportReport(type, format)
    } catch (error) {
      notifyError(getApiErrorMessage(error))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title="Reports"
          description="Export election data in PDF, Excel, or CSV"
          action={
            <div className="w-40">
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
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
                disabled={loading === report.type}
              >
                <Download className="h-4 w-4" />
                {loading === report.type ? 'Exporting...' : `Download ${format.toUpperCase()}`}
              </Button>
            </CardContent>
          </Card>
          ))}
        </StaggerChildren>
      </Stagger>
    </div>
  )
}
