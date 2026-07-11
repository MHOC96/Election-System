import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  downloadImportIssuesCsv,
  downloadMemberCsvTemplate,
  parseMemberCsvPreview,
  parseMemberXlsxPreview,
  type MemberImportPreviewResult,
} from '@/lib/member-csv'
import { PANEL_AUTO_DISMISS_MS } from '@/lib/toast-config'
import { ASYNC_IMPORT_ROW_THRESHOLD } from '@/api/members'
import { cn } from '@/lib/utils'
import type { MemberImportResult } from '@/types/api'

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'] as const
const MAX_DISPLAY_ISSUES = 8

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function delimiterLabel(delimiter: string): string {
  if (delimiter === ';') return 'semicolon'
  if (delimiter === '\t') return 'tab'
  return 'comma'
}

function formatPreviewMeta(preview: MemberImportPreviewResult): string {
  if (preview.format === 'xlsx') {
    return preview.sheet_name ? `Sheet: ${preview.sheet_name}` : 'Excel workbook'
  }
  return `${delimiterLabel(preview.delimiter ?? ',')}-separated CSV`
}

interface MemberImportPanelProps {
  academicYear: '2nd Year' | '3rd Year'
  onImport: (file: File) => void
  isImporting: boolean
  result: MemberImportResult | null
  onDismiss: () => void
  className?: string
}

export function MemberImportPanel({
  academicYear,
  onImport,
  isImporting,
  result,
  onDismiss,
  className,
}: MemberImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<MemberImportPreviewResult | null>(null)
  const [isParsingPreview, setIsParsingPreview] = useState(false)

  const resetSelection = useCallback(() => {
    setSelectedFile(null)
    setFilePreview(null)
    setFileError(null)
    setIsParsingPreview(false)
    dragDepthRef.current = 0
    setDragOver(false)
  }, [])

  useEffect(() => {
    if (!result) return
    const timer = window.setTimeout(() => {
      onDismiss()
      resetSelection()
    }, PANEL_AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [result, onDismiss, resetSelection])

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return

      setFileError(null)
      setSelectedFile(null)
      setFilePreview(null)

      if (!isAcceptedFile(file)) {
        setFileError('Only CSV and XLSX files are supported.')
        return
      }

      setSelectedFile(file)
      setIsParsingPreview(true)

      try {
        if (isCsvFile(file)) {
          const text = await file.text()
          const preview = parseMemberCsvPreview(text)
          setFilePreview(preview)
          if (preview.error) setFileError(preview.error)
        } else {
          const buffer = await file.arrayBuffer()
          const preview = await parseMemberXlsxPreview(buffer)
          setFilePreview(preview)
          if (preview.error) setFileError(preview.error)
        }
      } catch {
        setFileError(
          isCsvFile(file)
            ? 'Could not read the CSV file. Try saving it as UTF-8.'
            : 'Could not read the Excel file. Ensure it is a valid .xlsx workbook.',
        )
      } finally {
        setIsParsingPreview(false)
      }
    },
    [],
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isImporting || isParsingPreview) return
    dragDepthRef.current += 1
    setDragOver(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setDragOver(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isImporting && !isParsingPreview) setDragOver(true)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setDragOver(false)
    if (isImporting || isParsingPreview) return
    void handleFile(e.dataTransfer.files[0])
  }

  const openFilePicker = () => {
    if (!isImporting && !isParsingPreview) inputRef.current?.click()
  }

  const confirmImport = () => {
    if (!selectedFile || isImporting || filePreview?.error) return
    onImport(selectedFile)
  }

  const successRate =
    result && result.total_rows > 0
      ? Math.round((result.successful / result.total_rows) * 100)
      : 0

  const hasIssues =
    result && (result.failed_rows.length > 0 || result.duplicates.length > 0)

  const awaitingConfirm =
    selectedFile && filePreview && !filePreview.error && !isImporting && !result && !isParsingPreview

  const dropZoneBusy = isImporting || isParsingPreview
  const isLargeImport = (filePreview?.total_rows ?? 0) > ASYNC_IMPORT_ROW_THRESHOLD

  return (
    <div className={cn('space-y-4', className)}>
      <Card className="overflow-hidden border-dashed shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle 
                className="text-xl font-semibold tracking-tight text-foreground"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Import {academicYear} Members
              </CardTitle>
              <CardDescription>
                Drag and drop a CSV or XLSX file, or browse to upload. Required columns: CPM
                Number and MC Number.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadMemberCsvTemplate}
              disabled={dropZoneBusy}
            >
              <Download className="h-4 w-4" />
              Download CSV template
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openFilePicker()
              }
            }}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={openFilePicker}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-transparent px-4 py-6 text-center transition-all sm:px-6 sm:py-10',
              dragOver && 'border-primary bg-primary/5 ring-2 ring-primary/20',
              dropZoneBusy && 'cursor-wait opacity-80',
            )}
            aria-busy={dropZoneBusy}
            aria-label="Upload member file by drag and drop or browse"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              onChange={onInputChange}
              disabled={dropZoneBusy}
            />

            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-inset transition-colors',
                dragOver
                  ? 'bg-primary/15 text-primary ring-primary/25'
                  : 'bg-muted/60 text-muted-foreground ring-border',
              )}
            >
              {dropZoneBusy ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <Upload className="h-6 w-6" aria-hidden="true" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {isImporting
                  ? isLargeImport
                    ? 'Processing large import in the background…'
                    : 'Importing members…'
                  : isParsingPreview
                    ? 'Reading file…'
                    : dragOver
                      ? 'Release to upload'
                      : 'Drop CSV or XLSX here'}
              </p>
              <p className="text-xs text-muted-foreground">
                CSV supports comma, semicolon, or tab · Excel .xlsx supported · Max 5 MB
              </p>
            </div>

            {!dropZoneBusy ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="pointer-events-none"
                tabIndex={-1}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Browse files
              </Button>
            ) : null}

            {selectedFile && dropZoneBusy ? (
              <p className="text-xs text-muted-foreground">
                {isImporting ? 'Processing' : 'Previewing'} {selectedFile.name} (
                {formatFileSize(selectedFile.size)})
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {fileError ? (
        <div 
          className="flex animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 text-destructive shadow-sm" 
          role="alert"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold tracking-tight">Import Failed</h4>
            <p className="text-sm leading-relaxed opacity-90">{fileError}</p>
          </div>
        </div>
      ) : null}

      {awaitingConfirm && filePreview ? (
        <Card className="animate-fade-in-up overflow-hidden border shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  {filePreview.format === 'xlsx' ? 'Excel preview' : 'CSV preview'}
                </CardTitle>
                <CardDescription>
                  {selectedFile?.name} · {formatFileSize(selectedFile?.size ?? 0)} ·{' '}
                  {formatPreviewMeta(filePreview)} · {filePreview.total_rows.toLocaleString()} row
                  {filePreview.total_rows === 1 ? '' : 's'}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  resetSelection()
                }}
                aria-label="Clear selected file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <StatChip label="Ready to import" value={filePreview.valid_rows} tone="success" />
              <StatChip label="Invalid rows" value={filePreview.invalid_rows} tone="destructive" />
              <StatChip label="Total rows" value={filePreview.total_rows} tone="neutral" />
            </div>

            {filePreview.preview.length > 0 ? (
              <div className="table-scroll-wrapper rounded-lg border">
                <table className="w-full min-w-[320px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">CPM Number</th>
                      <th className="px-3 py-2 font-medium">MC Number</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filePreview.preview.map((row) => (
                      <tr key={row.row} className="border-b last:border-b-0">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.row}</td>
                        <td className="px-3 py-2 font-medium">{row.cpm_number || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.mc_number || '—'}</td>
                        <td className="px-3 py-2">
                          {row.valid ? (
                            <span className="text-success">Valid</span>
                          ) : (
                            <span className="text-destructive">{row.issue}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {filePreview.total_rows > filePreview.preview.length ? (
              <p className="text-xs text-muted-foreground">
                Showing first {filePreview.preview.length} of {filePreview.total_rows} rows.
                {filePreview.total_rows > ASYNC_IMPORT_ROW_THRESHOLD
                  ? ' Large imports run in the background and may take a minute.'
                  : null}
              </p>
            ) : filePreview.total_rows > ASYNC_IMPORT_ROW_THRESHOLD ? (
              <p className="text-xs text-muted-foreground">
                Large imports run in the background and may take a minute.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={confirmImport}
                disabled={filePreview.valid_rows === 0}
              >
                Import {filePreview.valid_rows.toLocaleString()} member
                {filePreview.valid_rows === 1 ? '' : 's'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  resetSelection()
                }}
              >
                Choose another file
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <Card className="animate-fade-in-up overflow-hidden border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b bg-muted/20 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-base">Import summary</CardTitle>
              <CardDescription>
                {result.successful.toLocaleString()} of {result.total_rows.toLocaleString()} rows
                imported successfully
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                onDismiss()
                resetSelection()
              }}
              aria-label="Dismiss import summary"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <StatChip label="Imported" value={result.successful} tone="success" />
              <StatChip label="Failed" value={result.failed_rows.length} tone="destructive" />
              <StatChip label="Duplicates" value={result.duplicates.length} tone="warning" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Success rate</span>
                <span className="font-semibold tabular-nums">{successRate}%</span>
              </div>
              <Progress value={successRate} aria-label="Import success rate" />
            </div>

            {hasIssues ? (
              <div className="space-y-4 border-t pt-4">
                {result.failed_rows.length > 0 ? (
                  <IssueList
                    title="Failed rows"
                    tone="destructive"
                    items={result.failed_rows.map((row) => ({
                      key: `f-${row.row}`,
                      primary: `Row ${row.row}`,
                      secondary: row.cpm_number ? `CPM ${row.cpm_number}` : undefined,
                      detail: row.reason,
                    }))}
                  />
                ) : null}

                {result.duplicates.length > 0 ? (
                  <IssueList
                    title="Duplicates skipped"
                    tone="warning"
                    items={result.duplicates.map((row) => ({
                      key: `d-${row.row}`,
                      primary: `Row ${row.row}`,
                      secondary: row.cpm_number ? `CPM ${row.cpm_number}` : undefined,
                      detail: row.reason,
                    }))}
                  />
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadImportIssuesCsv(result.failed_rows, result.duplicates)
                  }
                >
                  <Download className="h-4 w-4" />
                  Download issues CSV
                </Button>
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/5 px-3 py-2.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                All rows imported without issues.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'destructive' | 'warning' | 'neutral'
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-success/5 ring-success/20 text-success'
      : tone === 'destructive'
        ? 'bg-destructive/5 ring-destructive/15 text-destructive'
        : tone === 'warning'
          ? 'bg-warning/5 ring-warning/20 text-warning'
          : 'bg-muted/30 ring-border text-foreground'

  return (
    <div className={cn('rounded-lg border px-3 py-2.5 ring-1 ring-inset', toneClass)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

function IssueList({
  title,
  tone,
  items,
}: {
  title: string
  tone: 'destructive' | 'warning'
  items: { key: string; primary: string; secondary?: string; detail: string }[]
}) {
  const toneClass = tone === 'destructive' ? 'text-destructive' : 'text-warning'

  return (
    <div>
      <p className={cn('text-sm font-semibold', toneClass)}>{title}</p>
      <ul className="mt-2 space-y-2">
        {items.slice(0, MAX_DISPLAY_ISSUES).map((item) => (
          <li key={item.key} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-medium">{item.primary}</span>
              {item.secondary ? (
                <span className="text-muted-foreground">{item.secondary}</span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
      {items.length > MAX_DISPLAY_ISSUES ? (
        <p className="mt-2 text-xs text-muted-foreground">
          + {items.length - MAX_DISPLAY_ISSUES} more not shown
        </p>
      ) : null}
    </div>
  )
}
