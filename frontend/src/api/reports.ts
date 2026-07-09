import { downloadReport } from '@/api/client'
import type { ExportFormat, ReportType } from '@/types/api'

export function exportReport(type: ReportType, format: ExportFormat, electionId?: number, academicYear?: string) {
  return downloadReport(type, format, electionId, academicYear)
}
