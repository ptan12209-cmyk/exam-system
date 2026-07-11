/**
 * Online Study portal design tokens (Dream Violet).
 * Prefer CSS vars from globals.css; these mirror for JS/inline use.
 */
export const OS_THEME = {
  bg: '#0B0A13',
  card: '#15131F',
  cardElevated: '#1C1A2D',
  fg: '#F1EDF9',
  muted: '#8C87A2',
  accent: '#C18CFF',
  accentFg: '#0B0A13',
  border: 'rgba(140, 135, 162, 0.25)',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
} as const

/** Tailwind-friendly class snippets for shared online-student UI */
export const os = {
  page: 'min-h-screen bg-[var(--os-bg)] text-[var(--os-fg)]',
  card: 'rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)]',
  muted: 'text-[var(--os-muted)]',
  accent: 'text-[var(--os-accent)]',
  btnPrimary:
    'rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold hover:opacity-90',
  btnGhost:
    'rounded-xl border border-[var(--os-border)] text-[var(--os-muted)] hover:text-[var(--os-fg)]',
  input:
    'rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] text-[var(--os-fg)] placeholder:text-[var(--os-muted)] focus:ring-1 focus:ring-[var(--os-accent)] outline-none',
} as const
