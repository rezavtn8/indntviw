

## Landing Page for IndentView

### Concept

A clean, monochromatic, academic-industrial landing page that establishes IndentView as a serious scientific instrument. The design mirrors the existing black/white/grey design system already in the app. The landing page lives at `/` and the app workspace moves to `/app`.

### Structure

**Header** -- Minimal top bar with "IndentView" wordmark (font-mono, bold) on the left, and a single "Launch App →" button on the right.

**Hero Section** -- Large headline: *"Interactive Visualization & Statistical Analysis of Nanoindentation Data"*. Subtitle describing the platform in one sentence. A prominent "Get Started" button. Below, a static screenshot/mockup placeholder showing a 2D heatmap + box plot side by side (using a styled div with placeholder content styled to look like the app).

**Features Grid** (3 columns, icon + title + short description) --
1. **2D & 3D Visualization** -- Heatmaps and point clouds for spatial mapping of mechanical properties
2. **Zone-Based Analysis** -- Define regions of interest and compare statistical distributions
3. **Cross-Sample Comparison** -- Group samples, run statistical tests, generate publication-ready figures
4. **Multi-Format Import** -- Support for .txt, .csv, .tsv, .xlsx files from major nanoindenter brands
5. **Statistical Toolkit** -- Descriptive stats, box/violin plots, correlation analysis, group comparisons
6. **Export Studio** -- High-resolution figure export with customizable layouts for journals and posters

**How It Works** (3-step horizontal flow) --
1. Upload → 2. Analyze → 3. Export

**Footer** -- Minimal: "IndentView — Open-source nanoindentation analysis platform" with a link to launch the app.

### Routing Changes

| Route | Content |
|-------|---------|
| `/` | New landing page |
| `/app` | Current `IndentViewApp` (with all contexts/providers) |

### Files to Create/Modify

1. **`src/pages/Landing.tsx`** -- New landing page component with all sections above
2. **`src/pages/Index.tsx`** -- Change to render `IndentViewApp` (essentially becomes the `/app` route)
3. **`src/App.tsx`** -- Add `/app` route pointing to existing `Index`, change `/` to render `Landing`
4. **`src/pages/Landing.tsx`** uses only Tailwind classes + Lucide icons, no new dependencies

### Design Principles

- Monochrome palette matching the existing `--primary: 0 0% 0%` / `--background: 0 0% 100%` system
- Font-mono for headings (matches the app's scientific aesthetic)
- No gradients, no decorative colors -- clean borders, sharp corners (`radius: 0`)
- Generous whitespace, academic typography hierarchy
- All icons from Lucide (already installed)
- Fully responsive

