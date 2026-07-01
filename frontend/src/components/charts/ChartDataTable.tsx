interface ChartDataTableProps {
  caption: string
  columns: string[]
  rows: (string | number)[][]
}

export function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  if (rows.length === 0) return null

  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        View chart data as table
      </summary>
      <div className="mt-3 overflow-x-auto rounded-md border">
        <table className="w-full min-w-[16rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-muted/40">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
