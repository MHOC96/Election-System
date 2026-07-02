import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface ChartWithTabsProps {
  chart: ReactNode
  caption: string
  columns: string[]
  rows: (string | number)[][]
  className?: string
  chartClassName?: string
}

export function ChartWithTabs({
  chart,
  caption,
  columns,
  rows,
  className,
  chartClassName = 'h-64',
}: ChartWithTabsProps) {
  return (
    <Tabs defaultValue="chart" className={className}>
      <TabsList className="grid w-full max-w-xs grid-cols-2">
        <TabsTrigger value="chart">Chart</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>
      <TabsContent value="chart" className={cn('mt-4 min-h-0', chartClassName)}>
        {chart}
      </TabsContent>
      <TabsContent value="data" className="mt-4">
        <div className="max-h-72 overflow-auto rounded-md border">
          <table className="w-full min-w-[16rem] text-left text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 border-b bg-muted/80 backdrop-blur-sm">
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
      </TabsContent>
    </Tabs>
  )
}
