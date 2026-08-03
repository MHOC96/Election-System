import { apiGet, downloadReport } from '@/api/client'
import type { ReportElectionSummary, ReportsStatus, ReportType } from '@/types/api'

export async function fetchReportsStatus() {
  return apiGet<ReportsStatus>('/reports/status/')
}

export function exportReport(
  type: ReportType,
  format: 'pdf',
  electionId: number,
  academicYear?: string,
) {
  return downloadReport(type, format, electionId, academicYear)
}

export function getDefaultReportElection(archivedElections: ReportElectionSummary[]) {
  return archivedElections[0] ?? null
}
