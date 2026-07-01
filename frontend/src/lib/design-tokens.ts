/** Design tokens — spacing/type scale reference:
 *  Page sections: space-y-8
 *  Form fields: space-y-4 / field groups space-y-2
 *  Page title: text-2xl font-semibold (PageHeader)
 *  Section title: text-lg font-semibold (CardTitle)
 *  Body: text-sm | Caption: text-xs text-muted-foreground
 */

export const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
] as const

export const pageLayoutClass = 'space-y-8'

export const shellContentClass = 'mx-auto w-full max-w-7xl'
