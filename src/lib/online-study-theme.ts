/**
 * Online Study / product surface design tokens.
 * Source of truth: CSS vars on <html> (globals.css), switched by design brand.
 * Prefer classes below over hardcoded hex so Dream Violet ↔ DOL Crimson switch works.
 */

export type DesignBrand = 'dream' | 'dol' | 'swiss'

/** Fallback hex map (SSR / non-DOM). Prefer CSS vars in UI. */
export const OS_THEME_BY_BRAND = {
  dream: {
    dark: {
      bg: '#0B0A13',
      card: '#15131F',
      cardElevated: '#1C1A2D',
      fg: '#F1EDF9',
      muted: '#8C87A2',
      accent: '#C18CFF',
      accentFg: '#0B0A13',
      accentSecondary: '#7C6AEF',
      border: 'rgba(140, 135, 162, 0.25)',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
    },
    light: {
      bg: '#F6F4FB',
      card: '#FFFFFF',
      cardElevated: '#F0ECF8',
      fg: '#1A1528',
      muted: '#6B6680',
      accent: '#8B5CF6',
      accentFg: '#FFFFFF',
      accentSecondary: '#6366F1',
      border: 'rgba(107, 102, 128, 0.22)',
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  dol: {
    light: {
      bg: '#F4F4F6',
      card: '#FFFFFF',
      cardElevated: '#F0F1F3',
      fg: '#242938',
      muted: '#6B6E78',
      accent: '#D14242',
      accentFg: '#FFFFFF',
      accentSecondary: '#2074BB',
      border: '#E9EAEB',
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
    },
    dark: {
      bg: '#161822',
      card: '#1E2130',
      cardElevated: '#272B3D',
      fg: '#F0F1F5',
      muted: '#95979F',
      accent: '#E05555',
      accentFg: '#FFFFFF',
      accentSecondary: '#4D90C9',
      border: 'rgba(149, 151, 159, 0.28)',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
    },
  },
  swiss: {
    light: {
      bg: '#F4F3EF',
      card: '#FFFFFF',
      cardElevated: '#EBE9E3',
      fg: '#111111',
      muted: '#666666',
      accent: '#E60000',
      accentFg: '#FFFFFF',
      accentSecondary: '#111111',
      border: 'rgba(17, 17, 17, 0.15)',
      success: '#0F766E',
      warning: '#B45309',
      danger: '#B91C1C',
    },
    dark: {
      bg: '#141414',
      card: '#1E1E1E',
      cardElevated: '#2A2A2A',
      fg: '#F4F3EF',
      muted: '#999999',
      accent: '#FF2A2A',
      accentFg: '#FFFFFF',
      accentSecondary: '#F4F3EF',
      border: 'rgba(244, 243, 239, 0.14)',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
    },
  },
} as const

/** @deprecated Use CSS vars / `os` classes. Kept for legacy inline scripts. */
export const OS_THEME = OS_THEME_BY_BRAND.dream.dark

/** Tailwind-friendly class snippets bound to CSS vars (theme-aware). */
export const os = {
  page: 'min-h-screen bg-[var(--os-bg)] text-[var(--os-fg)]',
  card: 'rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)]',
  cardElevated:
    'rounded-2xl border border-[var(--os-border)] bg-[var(--os-card-elevated)]',
  muted: 'text-[var(--os-muted)]',
  fg: 'text-[var(--os-fg)]',
  accent: 'text-[var(--os-accent)]',
  border: 'border-[var(--os-border)]',
  btnPrimary:
    'rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold hover:opacity-90 active:scale-[0.98] transition-[opacity,transform]',
  btnGhost:
    'rounded-xl border border-[var(--os-border)] text-[var(--os-muted)] hover:text-[var(--os-fg)]',
  input:
    'rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-[var(--os-fg)] placeholder:text-[var(--os-muted)] focus:ring-1 focus:ring-[var(--os-accent)] outline-none',
  progress:
    'bg-gradient-to-r from-[var(--os-accent)] to-[var(--os-accent-secondary)]',
  ring: 'focus-visible:ring-2 focus-visible:ring-[var(--os-accent)]/50',
} as const

export const DESIGN_BRAND_META: Record<
  DesignBrand,
  { label: string; short: string; desc: string }
> = {
  dream: {
    label: 'Dream Violet',
    short: 'Dream',
    desc: 'Obsidian + violet',
  },
  dol: {
    label: 'DOL Crimson',
    short: 'DOL',
    desc: 'LMS + crimson',
  },
  swiss: {
    label: 'Swiss Grid',
    short: 'Swiss',
    desc: 'Alpine + red',
  },
}
