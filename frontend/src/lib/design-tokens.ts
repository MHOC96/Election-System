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
  'rounded-xl border border-border/70 bg-muted/15 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.65)] dark:border-border/80 dark:bg-muted/15 dark:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] sm:p-5'

/** Election / countdown hero cards — shared portal surface styling */
export const electionCountdownCardClass =
  'portal-surface relative mx-auto w-full min-w-0 overflow-hidden rounded-2xl'

/** Inner countdown content width */
export const portalCountdownInnerClass = 'portal-countdown-inner'

/** Admin / wide content shell */
export const shellContentClass = 'mx-auto w-full max-w-7xl'

/** App canvas behind cards (admin + member shells) */
export const shellCanvasClass = 'bg-background text-foreground'

/** Admin shell with ambient mesh */
export const adminShellClass = 'admin-canvas bg-background text-foreground'

/** Fixed height for admin sidebar brand + top shell header (must match) */
export const shellHeaderBarClass = 'flex h-14 shrink-0 items-center'

/** Roomier mobile shell header — menu, title, and actions */
export const shellMobileHeaderClass =
  'flex min-h-16 shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4'

/** Unified header action cluster — theme, logout, and optional menu */
export const shellActionToolbarClass =
  'flex shrink-0 items-center gap-0.5 rounded-xl border border-border/80 bg-card/85 p-0.5 shadow-sm backdrop-blur-sm shadow-[inset_0_1px_0_hsl(0_0%_100%/0.75)] dark:border-border/80 dark:bg-card/70 dark:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]'

/** Page title — PageHeader */
export const pageTitleClass = 'text-lg font-semibold tracking-tight sm:text-xl md:text-2xl'

/** Section headings below page title */
export const sectionHeadingClass = 'text-base font-semibold tracking-tight sm:text-lg'

export const sectionDescriptionClass = 'text-sm text-muted-foreground'

/** Dashboard + stat grids */
export const statGridClass = 'grid grid-cols-2 items-stretch gap-3 sm:gap-4 xl:grid-cols-4'

/** Dense admin KPI row — tighter rhythm than legacy StatCard grid */
export const adminKpiGridClass =
  'grid grid-cols-1 items-stretch gap-2.5 min-[480px]:grid-cols-2 sm:gap-3 xl:grid-cols-4'

/** Double-bezel shell for admin KPI tiles */
export const adminKpiTileShellClass =
  'rounded-2xl bg-white/60 p-[3px] ring-1 ring-border/70 shadow-[0_10px_28px_-14px_hsl(var(--shadow-color)/0.14)] dark:bg-white/[0.03] dark:ring-border/80 dark:shadow-[0_8px_24px_-12px_hsl(var(--shadow-color)/0.8)]'

/** Admin sidebar surface */
export const adminSidebarClass =
  'border-r border-border/75 bg-gradient-to-b from-card via-background to-muted/30 shadow-[inset_-1px_0_0_hsl(var(--border)/0.35)] dark:border-border/80 dark:from-card dark:via-background dark:to-muted/20 dark:shadow-[inset_-1px_0_0_hsl(var(--border)/0.5)]'

/** Admin sidebar nav section label */
export const adminSidebarSectionLabelClass =
  'mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75 dark:text-muted-foreground/90'

export const contentGridClass = 'grid gap-4 sm:gap-5 lg:grid-cols-2'

/** Standard interactive transition */
export const transitionInteractive = 'transition-all duration-200 ease-out-expo'

/** Icon containers in cards (stats, charts) */
export const iconTileClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-inset ring-primary/20 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5)] dark:bg-primary/15 dark:ring-primary/25'

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

/* ══════════════════════════════════════════════════════════════════════
   MEMBER PORTAL

   Colour is never written here — it comes from the `--portal-*` token
   contract in index.css (see the `portal-*` classes and the `portal.*`
   Tailwind scale). These exports only carry layout, rhythm, and type,
   so light and dark stay in sync by construction.
   ══════════════════════════════════════════════════════════════════════ */

/** Outer portal shell — ambient mesh canvas */
export const memberShellClass =
  'app-canvas flex min-h-[100dvh] min-w-0 flex-col bg-background text-foreground'

export const memberShellHeaderClass =
  'glass sticky top-0 z-40 w-full border-b border-border/75 pt-[env(safe-area-inset-top)]'

/** Aligns member header content with the main page column */
export const memberShellHeaderInnerClass =
  'mx-auto flex w-full min-w-0 max-w-5xl flex-col px-4 sm:px-6 lg:max-w-6xl lg:px-8'

export const memberShellMainClass =
  'relative min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-9 lg:px-8 lg:py-12'

export const memberShellContentClass = 'mx-auto w-full min-w-0 max-w-5xl lg:max-w-6xl'

export const memberPageLayoutClass = 'w-full min-w-0 space-y-7 sm:space-y-9 lg:space-y-11'

/** Full-width block — matches ApplicationsStartsSoonCard / PortalPhaseHero column width */
export const memberPageBlockClass = 'mx-auto w-full min-w-0'

/** Shared card radius across member surfaces */
export const memberCardRadiusClass = 'rounded-2xl'

export const memberCardPaddingClass = 'p-5 sm:p-6 lg:p-7'

/** Recessed panel nested inside a portal card */
export const memberInsetPanelClass =
  'portal-surface portal-surface--muted rounded-xl p-4 sm:p-5'

/** Application position cards grid */
export const memberPositionGridClass =
  'grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3'

/** Ballot candidate cards and member selection tiles */
export const memberCandidateGridClass =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3'

/** Published results — full-width position cards stacked like the ballot */
export const memberResultsGridClass = 'space-y-5 lg:space-y-6'

/** Centered status / outcome cards — same width as phase hero cards */
export const memberStatusCardClass = memberPageBlockClass

export const memberSectionStackClass = 'space-y-4 sm:space-y-5'

export const memberHeroSpacingClass = 'mt-5 sm:mt-7'

export const memberSectionHeadingClass = sectionHeadingClass

export const memberSectionIntroClass = sectionDescriptionClass

export const memberSectionHeaderRowClass =
  'flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4'

/** Member page title block */
export const memberPageTitleClass = pageTitleClass

export const memberPageDescriptionClass =
  'mt-1 text-pretty text-sm text-muted-foreground sm:text-base'

export const memberCalloutClass = `${insetPanelClass} text-sm leading-relaxed`

export const memberEmptyStateClass =
  'bg-grid flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/50 p-8 text-center shadow-[inset_0_1px_0_var(--portal-surface-inset)] sm:p-12 dark:border-border/60 dark:bg-card/30'
