

The current landing page is functional but plain — flat sections, fake mockup, generic feature cards. To make it genuinely impressive while keeping the academic-industrial monochrome aesthetic, I'll add visual depth, scientific credibility signals, and interactive polish without breaking the minimal design language.

## Landing Page v2 — Major Upgrades

### 1. Hero Section (rebuilt)
- **Eyebrow tag**: small uppercase label `[ NANOINDENTATION • DATA PLATFORM ]` above headline
- **Larger, tighter headline** with a subtle highlighted keyword (boxed/underlined "Nanoindentation")
- **Dual CTA**: primary "Launch Application" + secondary "View Sample Analysis" (loads sample data)
- **Stat strip below CTA**: `2D + 3D · 6 Statistical Tests · 4 Export Formats · 0 Server Uploads`
- **Background grid pattern** (subtle dotted/lined SVG, very faint) — evokes graph paper / measurement grid

### 2. Live Visual Hero (replaces fake mockup)
Instead of static fake heatmap, build an **animated SVG composition**:
- Real-looking heatmap grid (12×12) with proper viridis-style monochrome gradient
- Animated scanning line sweeping across (subtle, slow)
- Side-by-side mini box-plot with proper whiskers, median line, outlier dots
- Coordinate axes with tick marks and labels (X: 0–500 µm, Y: Hardness GPa)
- Window chrome with realistic toolbar mimicking the actual app

### 3. New "Trusted By Science" Bar
Thin band under hero with monospace text:
`PUBLICATION-READY · ISO 14577 COMPATIBLE · BROWSER-NATIVE · OPEN DATA FORMATS`
Separated by vertical bars — looks like a scientific instrument status bar.

### 4. Features Grid (upgraded)
- Keep 6 features, but add:
  - **Numbered prefix** (`01 / 02 / 03...`) in mono
  - **Hover state**: border thickens, subtle background shift
  - **"Learn more" arrow** on hover
  - Larger icons with thin stroke (already 1.5, keep)
  - Slight asymmetric layout — first card spans wider on desktop, OR keep 3-col but add accent border-top on hover

### 5. New "Methodology" Section (replaces basic Workflow)
A horizontal **technical pipeline diagram** with connecting lines:
```
[ DATA INPUT ]──→[ PARSE ]──→[ VISUALIZE ]──→[ ANALYZE ]──→[ EXPORT ]
```
Each node is a bordered box with icon + label + tiny description below. Connecting arrows are dashed lines (like a process flow diagram in a paper).

### 6. New "Capabilities Matrix" Section
A scientific-looking table showing supported analyses:
| Analysis Type | Methods | Output |
|---|---|---|
| Descriptive | Mean, SD, IQR, Shapiro-Wilk | Tables, JSON |
| Comparative | t-test, Mann-Whitney, ANOVA, Tukey | Box/Violin + p-values |
| Spatial | Heatmap, contours, 3D surface | PNG/SVG/PDF |
| Cross-sample | Pooled groups, zone matching | Multi-panel figures |

Mono font, tight rows, alternating row backgrounds — looks like a spec sheet.

### 7. New "Built For Researchers" Quote/Specs Block
Two columns:
- Left: a pull-quote styled block — *"A browser-native instrument for the quantitative analysis of nanoindentation arrays."*
- Right: technical specs list (Browser-only • IndexedDB persistence • No backend • Open source)

### 8. CTA Section (new, before footer)
Full-width bordered block with centered content:
- Headline: "Start analyzing in under a minute"
- Subtitle: "No installation. No account. Drop your data file and begin."
- Single large button + small text "Supports .txt, .csv, .tsv, .xlsx"

### 9. Enhanced Footer
Three columns:
- Left: IndentView wordmark + tagline + version (`v1.0`)
- Middle: Quick links (Launch App, Sample Data, Documentation)
- Right: Tech credits (`Built with React · TypeScript · D3 · Three.js`)
Bottom bar: copyright + monospace build hash style text

### Technical Details
- Single file edit: `src/pages/Landing.tsx`
- All Tailwind + Lucide (no new deps)
- Add subtle CSS animations via Tailwind (`animate-pulse` on scanning line, fade-in on scroll using existing tailwindcss-animate)
- Maintain monochrome palette strictly (`black/white/grey` only — no color)
- Keep `font-mono` for headings, regular sans for body
- Keep `rounded-none` everywhere
- Fully responsive (md/lg breakpoints already in place)

### Design Principles Reinforced
- **Density over emptiness** in informational sections (specs, capabilities)
- **Generous whitespace** between sections
- **Thin borders** as primary visual structure (not shadows or gradients)
- **Monospace numerals** for any data/specs to feel instrument-like

