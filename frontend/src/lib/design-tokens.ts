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
  'rounded-xl border border-border/60 bg-muted/10 p-4 dark:bg-muted/20 sm:p-5'

/** Election / countdown hero cards — let `.election-countdown` own surface styling */
export const electionCountdownCardClass =
  'election-countdown relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl !border-0 !bg-transparent !shadow-none ring-0 sm:rounded-3xl lg:max-w-4xl xl:max-w-5xl'

/** Admin / wide content shell */
export const shellContentClass = 'mx-auto w-full max-w-7xl'

/** App canvas behind cards (admin + member shells) */
export const shellCanvasClass = 'bg-muted/25 dark:bg-background'

/** Fixed height for admin sidebar brand + top shell header (must match) */
export const shellHeaderBarClass = 'flex h-14 shrink-0 items-center'

/** Roomier mobile shell header — menu, title, and actions */
export const shellMobileHeaderClass =
  'flex min-h-16 shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4'

/** Page title — PageHeader */
export const pageTitleClass = 'text-lg font-semibold tracking-tight sm:text-xl md:text-2xl'

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

/** Shared border radius for text inputs, selects, and similar form controls */
export const formControlClass = 'rounded-lg'

/** Shared responsive classes for modal / sheet panels */
export const overlayPanelClass =
  'w-[calc(100vw-2rem)] max-w-lg max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] overflow-x-hidden overflow-y-auto rounded-xl p-4 sm:p-6'

/** Breakpoint at which data tables switch to desktop layout (card fallback below) */
export const responsiveTableDesktopClass = 'hidden lg:block'
export const responsiveTableMobileClass = 'lg:hidden'

/** Flush data table inside cards — full-width header band + clipped corners */
export const dataTableShellClass = 'overflow-hidden'
export const dataTableScrollClass = 'table-scroll-wrapper w-full overflow-x-auto'

/** Application review — position panels with a fluid applicant card grid */
export const applicationReviewSectionHeaderClass =
  'flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 sm:px-5 sm:py-3.5'
export const applicationReviewSectionBodyClass = 'bg-card p-3 sm:p-4'
export const applicationReviewGridClass =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3'
export const applicationReviewCardClass =
  'flex h-full min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-xs transition-shadow duration-150 hover:shadow-md sm:p-4'

/** Application review — filter toolbar */
export const applicationFilterBarClass = 'flex flex-col gap-3 sm:gap-4'
export const applicationFilterRowClass =
  'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3'

/** Member portal — shell, page rhythm, and surfaces */
export const memberShellHeaderClass =
  'glass sticky top-0 z-40 w-full border-b pt-[env(safe-area-inset-top)]'

/** Aligns member header content with the main page column */
export const memberShellHeaderInnerClass =
  'mx-auto w-full min-w-0 max-w-4xl lg:max-w-5xl xl:max-w-6xl'

export const memberShellMainClass =
  'min-w-0 flex-1 overflow-x-hidden px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10'

export const memberShellContentClass = memberShellHeaderInnerClass

export const memberPageLayoutClass = 'w-full min-w-0 space-y-5 sm:space-y-8 lg:space-y-10'

export const memberCardSurfaceClass =
  'overflow-hidden border border-border/70 bg-card shadow-md ring-1 ring-primary/10 dark:ring-primary/20'

export const memberCardHeaderTintClass =
  'border-b bg-gradient-to-br from-muted/30 via-card to-primary/[0.04] dark:from-muted/20 dark:via-card dark:to-primary/[0.08]'

export const memberCardPaddingClass = 'p-5 sm:p-6'

/** Application position cards — polished interactive surface */
export const memberPositionCardClass =
  'overflow-hidden border border-border/70 bg-card shadow-md ring-1 ring-primary/10 dark:ring-primary/20 flex min-w-0 flex-col rounded-2xl'

/** Application position cards grid */
export const memberPositionGridClass =
  'grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-5 lg:gap-6 xl:grid-cols-3'

/** Ballot candidate cards and member selection tiles */
export const memberCandidateGridClass =
  'grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6'

/** Published results — position cards on wide screens */
export const memberResultsGridClass =
  'grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:gap-8'

/** Centered status / outcome cards */
export const memberStatusCardClass = 'mx-auto w-full max-w-2xl lg:max-w-3xl'

export const memberSectionStackClass = 'space-y-4'

export const memberHeroSpacingClass = 'mt-4 sm:mt-6'

export const memberSectionHeadingClass = 'text-base font-semibold tracking-tight sm:text-lg'

export const memberSectionIntroClass = 'mt-1 text-sm leading-relaxed text-muted-foreground'

export const memberSectionHeaderRowClass =
  'flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3'

export const memberCalloutClass =
  'rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-4 text-sm leading-relaxed text-muted-foreground dark:border-primary/25 dark:bg-primary/[0.08] sm:px-6 sm:py-5'

/** Theme-aware hero gradient shell for member status pages */
export const memberHeroSurfaceClass = 'member-hero-surface'

/** Member empty / waiting states — tighter on phones */
export const memberEmptyStateClass = 'p-8 sm:p-12'
