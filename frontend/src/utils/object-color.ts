/**
 * Maps object metadata color names to Tailwind classes.
 * Used for object icons in detail view, RecordLookup, etc.
 * Color names match common Tailwind palette (blue, green, amber, etc.).
 */
const COLOR_CLASSES: Record<string, { icon: string; avatar: string; borderAccent: string; button: string }> = {
  blue: {
    icon: 'text-blue-600 dark:text-blue-200',
    avatar: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-200',
    borderAccent: 'border-l-blue-500 dark:border-l-blue-400',
    button: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500',
  },
  green: {
    icon: 'text-green-600 dark:text-green-200',
    avatar: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-200',
    borderAccent: 'border-l-green-500 dark:border-l-green-400',
    button: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-500',
  },
  red: {
    icon: 'text-red-600 dark:text-red-200',
    avatar: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-200',
    borderAccent: 'border-l-red-500 dark:border-l-red-400',
    button: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-500',
  },
  yellow: {
    icon: 'text-yellow-600 dark:text-yellow-200',
    avatar: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-200',
    borderAccent: 'border-l-yellow-500 dark:border-l-yellow-400',
    button: 'bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-600 dark:text-white dark:hover:bg-yellow-500',
  },
  amber: {
    icon: 'text-amber-600 dark:text-amber-200',
    avatar: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-200',
    borderAccent: 'border-l-amber-500 dark:border-l-amber-400',
    button: 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-500',
  },
  orange: {
    icon: 'text-orange-600 dark:text-orange-200',
    avatar: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-200',
    borderAccent: 'border-l-orange-500 dark:border-l-orange-400',
    button: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:text-white dark:hover:bg-orange-500',
  },
  purple: {
    icon: 'text-purple-600 dark:text-purple-200',
    avatar: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-200',
    borderAccent: 'border-l-purple-500 dark:border-l-purple-400',
    button: 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:text-white dark:hover:bg-purple-500',
  },
  violet: {
    icon: 'text-violet-600 dark:text-violet-200',
    avatar: 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-200',
    borderAccent: 'border-l-violet-500 dark:border-l-violet-400',
    button: 'bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
  },
  pink: {
    icon: 'text-pink-600 dark:text-pink-200',
    avatar: 'bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-200',
    borderAccent: 'border-l-pink-500 dark:border-l-pink-400',
    button: 'bg-pink-600 text-white hover:bg-pink-700 dark:bg-pink-600 dark:text-white dark:hover:bg-pink-500',
  },
  teal: {
    icon: 'text-teal-600 dark:text-teal-200',
    avatar: 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-200',
    borderAccent: 'border-l-teal-500 dark:border-l-teal-400',
    button: 'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:text-white dark:hover:bg-teal-500',
  },
  cyan: {
    icon: 'text-cyan-600 dark:text-cyan-200',
    avatar: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-200',
    borderAccent: 'border-l-cyan-500 dark:border-l-cyan-400',
    button: 'bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-600 dark:text-white dark:hover:bg-cyan-500',
  },
  slate: {
    icon: 'text-slate-600 dark:text-slate-200',
    avatar: 'bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-200',
    borderAccent: 'border-l-slate-500 dark:border-l-slate-400',
    button: 'bg-slate-600 text-white hover:bg-slate-700 dark:bg-slate-600 dark:text-white dark:hover:bg-slate-500',
  },
}

/** Returns Tailwind classes for an icon when object has a color. Falls back to muted when no color. */
export function getObjectIconClasses(color?: string | null): string {
  if (!color) return 'text-muted-foreground'
  const c = COLOR_CLASSES[color.toLowerCase()]
  return c?.icon ?? 'text-muted-foreground'
}

/** Returns Tailwind classes for avatar/fallback when object has a color. Falls back to muted when no color. */
export function getObjectAvatarClasses(color?: string | null): string {
  if (!color) return 'bg-muted text-muted-foreground'
  const c = COLOR_CLASSES[color.toLowerCase()]
  return c?.avatar ?? 'bg-muted text-muted-foreground'
}

/** Returns Tailwind classes for section header left accent border. Falls back to primary when no color. */
export function getObjectBorderAccentClasses(color?: string | null): string {
  if (!color) return 'border-l-4 border-l-primary/50'
  const c = COLOR_CLASSES[color.toLowerCase()]
  return c?.borderAccent ? `border-l-4 ${c.borderAccent}` : 'border-l-4 border-l-primary/50'
}

/** Returns Tailwind classes for primary buttons when object has a color. Empty when no color (use default primary). */
export function getObjectButtonClasses(color?: string | null): string {
  if (!color) return ''
  const c = COLOR_CLASSES[color.toLowerCase()]
  return c?.button ?? ''
}

/** Same as getObjectButtonClasses but with lg: prefix. Use for responsive: outline on mobile/tablet, primary on lg+. */
export function getObjectButtonClassesLg(color?: string | null): string {
  const base = getObjectButtonClasses(color)
  if (!base) return ''
  return base.split(/\s+/).map((cls) => `lg:${cls}`).join(' ')
}
