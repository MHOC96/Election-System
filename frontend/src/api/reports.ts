import { apiGet, downloadReport } from '@/api/client'
import type { ExportFormat, ReportElectionSummary, ReportsStatus, ReportType } from '@/types/api'

export async function fetchReportsStatus() {
  return apiGet<ReportsStatus>('/reports/status/')
}

export function exportReport(
  type: ReportType,
  format: ExportFormat,
  electionId: number,
  academicYear?: string,
) {
  return downloadReport(type, format, electionId, academicYear)
}

export function getDefaultReportElection(archivedElections: ReportElectionSummary[]) {
  return archivedElections[0] ?? null
}
