/**
 * Design tokens — single source for layout, type, motion, and surface classes.
 * Primitives (button, card, input) own component styling; use these for pages/sections.
 */

export const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
] as const

/** Vertical rhythm between major page blocks */
export const pageLayoutClass = 'space-y-8'

/** Tight grouping for page title + inline notices / meta row */
export const pageHeaderBlockClass = 'space-y-4'

/** Inset panel for nested dashboard / chart sections */
export const insetPanelClass =
  'rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-5'

/** Admin / wide content shell */
export const shellContentClass = 'mx-auto w-full max-w-7xl'

/** App canvas behind cards (admin + member shells) */
export const shellCanvasClass = 'bg-muted/25 dark:bg-background'

/** Fixed height for admin sidebar brand + top shell header (must match) */
export const shellHeaderBarClass = 'flex h-14 shrink-0 items-center'

/** Page title — PageHeader */
export const pageTitleClass = 'text-xl font-semibold tracking-tight sm:text-2xl'

/** Section headings below page title */
export const sectionHeadingClass = 'text-base font-semibold tracking-tight sm:text-lg'

export const sectionDescriptionClass = 'text-sm text-muted-foreground'

/** Dashboard + stat grids */
export const statGridClass = 'grid grid-cols-2 items-stretch gap-3 sm:gap-4 xl:grid-cols-4'

export const contentGridClass = 'grid gap-4 sm:gap-5 lg:grid-cols-2'

/** Standard interactive transition */
export const transitionInteractive = 'transition-all duration-200 ease-out-expo'

/** Icon containers in cards (stats, charts) */
export const iconTileClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15'

/** Brand logo mark — consistent radius across shells */
export const brandMarkClass =
  'flex items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-sm'

/** Shared responsive classes for modal / sheet panels */
export const overlayPanelClass =
  'w-[calc(100vw-2rem)] max-w-lg max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] overflow-x-hidden overflow-y-auto p-4 sm:p-6'

/** Breakpoint at which data tables switch to desktop layout (card fallback below) */
export const responsiveTableDesktopClass = 'hidden lg:block'
export const responsiveTableMobileClass = 'lg:hidden'

/** Flush data table inside cards — full-width header band + clipped corners */
export const dataTableShellClass = 'overflow-hidden'
export const dataTableScrollClass = 'table-scroll-wrapper w-full overflow-x-auto'
