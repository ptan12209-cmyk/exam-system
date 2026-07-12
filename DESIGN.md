# ExamHub Design System

Product UI design system with **two primary brands** and one optional layout skin.  
Users can switch design brand and light/dark mode independently.

## Axes

| Axis | Values | Storage |
|------|--------|---------|
| **Design brand** | `dream` (default), `dol`, `swiss` | `localStorage: design-theme` |
| **Color mode** | `light` \| `dark` \| `system` | `localStorage: theme` |

Applied on `<html>` as classes: `theme-dream` | `theme-dol` | `theme-swiss` + `light` | `dark`.

## Primary brands

### 1. Dream Violet (priority A)

Obsidian product surface, single dream-violet accent.

| Token | Dark | Light |
|-------|------|-------|
| Background | `#0B0A13` | `#F6F4FB` |
| Surface | `#15131F` | `#FFFFFF` |
| Elevated | `#1C1A2D` | `#F0ECF8` |
| Foreground | `#F1EDF9` | `#1A1528` |
| Muted | `#8C87A2` | `#6B6680` |
| **Accent** | `#C18CFF` | `#8B5CF6` |
| Accent FG | `#0B0A13` | `#FFFFFF` |
| Secondary accent | `#7C6AEF` | `#6366F1` |

- Display: Instrument Serif (marketing / large titles only)
- Body: Inter
- Radius: 12px (`0.75rem`)
- Personality: cinematic, focused study, single accent

### 2. DOL Crimson (priority A)

LMS-dense, trust-first education brand.

| Token | Light (canonical) | Dark |
|-------|-------------------|------|
| Background | `#FFFFFF` / page `#F4F4F6` | `#161822` |
| Surface | `#FFFFFF` | `#1E2130` |
| Foreground | `#242938` | `#F0F1F5` |
| Muted | `#6B6E78` | `#95979F` |
| **Accent** | `#D14242` | `#E05555` |
| Accent FG | `#FFFFFF` | `#FFFFFF` |
| Tech blue | `#2074BB` | `#4D90C9` |

- Display: Plus Jakarta Sans
- Body: Inter, base 14px / line-height 1.5715
- Radius: 10–16px
- Personality: professional LMS, dense data, crimson CTAs

### 3. Swiss Grid (optional)

Alpine stone + Helvetica red, sharp corners. Available in the theme menu; not a primary product brand.

## CSS token contract

Use **semantic tokens only**. Do not hardcode brand hex in components.

### Global (HSL channels for shadcn / Tailwind)

```
--background, --foreground, --card, --primary, --primary-foreground,
--secondary, --muted, --muted-foreground, --accent, --border, --ring, --radius
```

Usage: `bg-[hsl(var(--background))]`, `text-[hsl(var(--primary))]`.

### Online / product surface (hex-ready CSS vars)

```
--os-bg, --os-card, --os-card-elevated, --os-fg, --os-muted,
--os-accent, --os-accent-fg, --os-accent-secondary, --os-border,
--os-success, --os-warning, --os-danger, --os-selection
```

Usage: `bg-[var(--os-bg)]`, `text-[var(--os-accent)]`, `border-[var(--os-border)]`.

Helpers: `src/lib/online-study-theme.ts` (`os.*` class snippets).

### Utility classes

- `.os-portal` – full-page surface using `--os-*`
- `.os-skeleton` – shimmer using card/muted
- `.btn-brand` – primary CTA filled with `--os-accent`

## Principles (from PRODUCT.md)

1. Actionable insights first; decoration second.
2. Flat surfaces + **one** brand accent per theme.
3. Strong hierarchy; mono/tabular for scores and prices.
4. WCAG AA contrast; honor `prefers-reduced-motion`.
5. No nested cards, no ghost-card (border + huge soft shadow), no rainbow multi-accent spam.

## Switching UX

- **ThemeToggle** (settings gear): color mode + design brand.
- **UserMenu**: quick brand chips (Dream / Swiss / DOL).
- Instant apply via class on `document.documentElement`; FOUC prevented by inline script in `layout.tsx`.

## Component rules

| Do | Don't |
|----|--------|
| `var(--os-accent)` for primary actions on online portal | `#C18CFF` or `#d14242` hardcoded |
| `hsl(var(--primary))` for app chrome | Blue-600 Tailwind defaults for brand CTA |
| Skeleton matching layout | Full-page spinner only |
| Empty state + one CTA | Blank white/dark void |

## Motion

Product: 150–250ms, state feedback only.  
Landing may be richer; still respect reduced motion.

## File map

| File | Role |
|------|------|
| `src/app/globals.css` | Token definitions per brand × mode |
| `src/components/ThemeProvider.tsx` | State + localStorage + class apply |
| `src/components/ui/ThemeToggle.tsx` | User-facing switcher |
| `src/lib/online-study-theme.ts` | Tailwind class helpers for `--os-*` |
| `docs/design.md` | Dream Engine reference (source palette) |
| `docs/dol-english-design-v2.md` | DOL Crimson reference |
