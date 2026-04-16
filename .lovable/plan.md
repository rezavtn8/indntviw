

## Landing Page Redesign — Brand-Infused Hero

Goals: bigger logo + wordmark up top, subtle brand color accents (navy/teal/coral from logo), professional/scientific tone preserved.

### Changes (single file: `src/pages/Landing.tsx`)

**1. Hero Block (top of page)**
- Replace current small header + hero with a unified large hero:
  - Centered **oversized BrandMark** (~80–96px) paired with **Wordmark size="lg"** scaled up (~text-6xl/7xl)
  - Thin gradient underline beneath wordmark using the navy→teal→coral gradient (1px tall, ~200px wide)
  - Eyebrow tag above: `[ NANOINDENTATION • DATA PLATFORM ]` in mono, muted
  - Below logo: large headline (e.g. "Quantitative analysis for nanoindentation arrays")
  - Subheadline paragraph (2–3 lines) explaining what IndentView is
  - Dual CTAs: primary "Launch Application" (filled, navy bg) + secondary "View Sample Analysis" (outlined)
  - Stat strip below CTAs (mono, with coral/teal accent dots as separators)

**2. Color Accents (subtle, throughout)**
- Keep base monochrome (white bg, black borders, black text)
- Add brand colors as **accents only**:
  - Section eyebrows / numbered prefixes (`01`, `02`...) in teal
  - Hover border color shifts to navy
  - Pipeline arrows use the navy→teal→coral gradient
  - Coral used sparingly for the primary CTA hover state and one accent underline
  - Capabilities table: thin colored left border per row category (navy/teal/coral rotation)
- Background: very faint dotted grid pattern in hero only (already in plan)

**3. Sticky Top Nav (small, after hero scrolls)**
- Small wordmark + BrandMark left, nav links right (Capabilities, Methodology, Launch)
- Appears as a thin sticky bar — keeps the big hero logo as the centerpiece

**4. Other sections (kept, lightly polished)**
- Status bar: keep, add tiny colored square dots (navy/teal/coral) between items
- Features grid: numbered prefix in teal, hover border navy
- Methodology pipeline: connecting arrows use gradient stroke
- Capabilities table: rotating left-border accent color per row
- Specs / CTA / Footer: unchanged structure, footer wordmark larger

### Technical notes
- All brand colors come from the existing `BRAND` export in `src/components/layout/Brand.tsx` (navy `#2a4d8f`, teal `#3aa0a0`, coral `#e8594f`, ink `#0f1a2b`) — used inline via `style={{ color/borderColor/backgroundImage }}`
- No new dependencies, no new files
- Stays fully responsive (lg/md breakpoints)
- Maintains `font-mono` for headings/specs, sans for body (per existing design)
- Single file edit: `src/pages/Landing.tsx`

### Layout sketch
```text
┌─────────────────────────────────────────┐
│   [ NANOINDENTATION · DATA PLATFORM ]   │
│                                         │
│            ▣ ▣                          │  <- BrandMark (large)
│            ▣ ▣                          │
│                                         │
│         I n d e n t view                │  <- Wordmark (huge)
│         ━━━━━━━━━━━━━━                  │  <- gradient underline
│                                         │
│   Quantitative analysis for             │
│   nanoindentation arrays                │
│                                         │
│   Browser-native platform for...        │
│                                         │
│   [ Launch Application ]  [ Sample ]    │
│                                         │
│   2D+3D · 6 Tests · 4 Formats · 0 Up    │
└─────────────────────────────────────────┘
```

