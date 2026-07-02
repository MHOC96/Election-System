import type { MemberImportResult } from '@/types/api'

const CPM_ALIASES = new Set([
  'cpm number',
  'cpm_number',
  'cpm',
  'cpm no',
  'cpm no.',
  'cpmnumber',
])

const MC_ALIASES = new Set([
  'mc number',
  'mc_number',
  'mc',
  'mc no',
  'mc no.',
  'mcnumber',
  'password',
])

export const MEMBER_CSV_TEMPLATE = 'CPM Number,MC Number\nCPM001,secret001\nCPM002,secret002\n'

export interface MemberImportPreviewRow {
  row: number
  cpm_number: string
  mc_number: string
  valid: boolean
  issue?: string
}

export interface MemberImportPreviewResult {
  total_rows: number
  valid_rows: number
  invalid_rows: number
  preview: MemberImportPreviewRow[]
  format: 'csv' | 'xlsx'
  delimiter?: string
  sheet_name?: string
  error?: string
}

/** @deprecated Use MemberImportPreviewRow */
export type CsvPreviewRow = MemberImportPreviewRow

/** @deprecated Use MemberImportPreviewResult */
export type CsvPreviewResult = MemberImportPreviewResult

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, ' ').trim()
}

function cellValue(value: unknown): string {
  if (value == null) return ''
  const text = String(value).trim()
  if (['none', 'null', 'n/a', '-'].includes(text.toLowerCase())) return ''
  return text
}

function detectDelimiter(line: string): string {
  const counts = [
    { delimiter: ',', count: (line.match(/,/g) ?? []).length },
    { delimiter: ';', count: (line.match(/;/g) ?? []).length },
    { delimiter: '\t', count: (line.match(/\t/g) ?? []).length },
  ]
  counts.sort((a, b) => b.count - a.count)
  return counts[0]?.count ? counts[0].delimiter : ','
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  cells.push(current.trim())
  return cells
}

function resolveColumn(headers: string[], aliases: Set<string>, cells: string[]): string {
  for (let i = 0; i < headers.length; i += 1) {
    if (aliases.has(headers[i])) {
      return cells[i]?.trim() ?? ''
    }
  }
  return ''
}

function buildPreviewFromRows(
  headers: string[],
  rows: string[][],
  options: {
    format: 'csv' | 'xlsx'
    previewLimit: number
    delimiter?: string
    sheetName?: string
  },
): MemberImportPreviewResult {
  const { format, previewLimit, delimiter, sheetName } = options

  if (!headers.some((h) => CPM_ALIASES.has(h)) || !headers.some((h) => MC_ALIASES.has(h))) {
    return {
      total_rows: 0,
      valid_rows: 0,
      invalid_rows: 0,
      preview: [],
      format,
      delimiter,
      sheet_name: sheetName,
      error: 'Missing required columns: CPM Number and MC Number.',
    }
  }

  const preview: MemberImportPreviewRow[] = []
  let validRows = 0
  let invalidRows = 0
  let totalRows = 0

  for (let index = 0; index < rows.length; index += 1) {
    const cells = rows[index]
    const cpm = resolveColumn(headers, CPM_ALIASES, cells).toUpperCase()
    const mc = resolveColumn(headers, MC_ALIASES, cells)

    if (!cpm && !mc) continue

    totalRows += 1
    const rowNumber = index + 2

    let valid = true
    let issue: string | undefined
    if (!cpm) {
      valid = false
      issue = 'Missing CPM Number'
    } else if (!mc) {
      valid = false
      issue = 'Missing MC Number'
    }

    if (valid) validRows += 1
    else invalidRows += 1

    if (preview.length < previewLimit) {
      preview.push({
        row: rowNumber,
        cpm_number: cpm,
        mc_number: mc ? '••••••••' : '',
        valid,
        issue,
      })
    }
  }

  return {
    total_rows: totalRows,
    valid_rows: validRows,
    invalid_rows: invalidRows,
    preview,
    format,
    delimiter,
    sheet_name: sheetName,
  }
}

function emptyPreviewError(
  format: 'csv' | 'xlsx',
  error: string,
  delimiter?: string,
): MemberImportPreviewResult {
  return {
    total_rows: 0,
    valid_rows: 0,
    invalid_rows: 0,
    preview: [],
    format,
    delimiter,
    error,
  }
}

export function parseMemberCsvPreview(text: string, previewLimit = 8): MemberImportPreviewResult {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  if (!cleaned) {
    return emptyPreviewError('csv', 'File is empty.')
  }

  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) {
    return emptyPreviewError('csv', 'CSV must include a header row and at least one data row.')
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader)
  const dataRows = lines.slice(1).map((line) => parseCsvLine(line, delimiter))

  return buildPreviewFromRows(headers, dataRows, { format: 'csv', previewLimit, delimiter })
}

export async function parseMemberXlsxPreview(
  buffer: ArrayBuffer,
  previewLimit = 8,
): Promise<MemberImportPreviewResult> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    return emptyPreviewError('xlsx', 'Workbook has no sheets.')
  }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  if (!matrix.length) {
    return emptyPreviewError('xlsx', 'File is empty or missing a header row.', undefined)
  }

  const headerRow = matrix[0] ?? []
  const headers = headerRow.map((cell) => normalizeHeader(cellValue(cell)))

  if (!headers.some(Boolean)) {
    return emptyPreviewError('xlsx', 'File is empty or missing a header row.')
  }

  const dataRows: string[][] = []
  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] ?? []
    const cells = headerRow.map((_, colIndex) => cellValue(row[colIndex]))
    if (cells.every((cell) => !cell)) continue
    dataRows.push(cells)
  }

  if (!dataRows.length) {
    return emptyPreviewError('xlsx', 'Spreadsheet must include at least one data row.')
  }

  return buildPreviewFromRows(headers, dataRows, {
    format: 'xlsx',
    previewLimit,
    sheetName,
  })
}

export function downloadMemberCsvTemplate() {
  const blob = new Blob([MEMBER_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'members-template.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadImportIssuesCsv(
  failed: MemberImportResult['failed_rows'],
  duplicates: MemberImportResult['duplicates'],
) {
  const lines = ['Row,CPM Number,Type,Reason']
  for (const row of failed) {
    lines.push(`${row.row},"${row.cpm_number ?? ''}",Failed,"${row.reason.replace(/"/g, '""')}"`)
  }
  for (const row of duplicates) {
    lines.push(`${row.row},"${row.cpm_number}",Duplicate,"${row.reason.replace(/"/g, '""')}"`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'member-import-issues.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
