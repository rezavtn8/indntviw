
## Sample-Separated Jitter Points in Group Comparison Box Plots

### What This Feature Does
Currently in the "Between Groups" box plot, all samples in a treatment group are pooled together and their jittered points are drawn with a single color. This feature adds a **"Sample Colors" toggle** that, when enabled:
- Keeps the box/whiskers/violin in **black & white** style (so they remain clean and publication-ready)
- Colors each jittered point by **which sample it came from** within the group
- Shows a **right-side legend panel** mapping each color to its sample name

For example: a "WT" group with 4 samples would show all jittered points on the WT box, but each sample's points would be a distinct color (e.g., orange, teal, purple, green), while the box itself remains B&W.

---

### Architecture Overview

```text
GroupComparison.tsx (orchestrator)
  ├─ adds "Sample Colors" toggle state
  ├─ builds per-sample color map { sessionId → color }
  ├─ passes enriched data to BoxViolinPlots
  │
  └─ BoxViolinPlots.tsx (wrapper)
       ├─ passes sampleColoredPoints prop to BoxViolinSvg
       │
       └─ BoxViolinSvg.tsx (SVG renderer)
            └─ when sampleColoredPoints present:
                 renders jitter with per-point colors
                 adds right-side legend panel
```

---

### Files to Modify

**1. `src/components/analysis/boxViolin/jitter.ts`**
- Extend `JitteredPoint` interface to optionally carry a `color: string` field
- Add a new `getColoredJitteredPoints()` function that accepts an array of `{ values: number[], color: string }` (one per sample), computes jitter for each, and returns points with their assigned sample color

**2. `src/components/analysis/boxViolin/BoxViolinSvg.tsx`**
- Add optional prop `sampleColoredJitter?: { groupIdx: number; points: Array<{ x: number; y: number; color: string }> }[]` 
- Add optional prop `sampleLegend?: { name: string; color: string }[]`
- When `sampleColoredJitter` is provided for a group, skip the normal uniform-color jitter and render per-point colored circles instead
- Add a right-side legend column in the SVG that lists sample name → color dot pairs (stacked vertically, capped width ~120px)
- Increase `svgWidth` by the legend width when the legend is active

**3. `src/components/analysis/boxViolin/layout.ts`**
- Export a `LEGEND_WIDTH = 140` constant (used for SVG width calculation when legend is shown)

**4. `src/components/analysis/BoxViolinPlots.tsx`**
- Add optional prop `sampleColoredData?: { groupIdx: number; samples: { name: string; color: string; values: number[] }[] }[]`
- When this prop is provided, compute `sampleColoredJitter` and `sampleLegend` and pass them to `BoxViolinSvg`
- The box/stats data (`data` prop) remains unchanged — only the jitter rendering changes

**5. `src/components/analysis/GroupComparison.tsx`**
- Add `showSampleColors` toggle state (default `false`)
- Add the toggle button in the "Plot Options" bar (next to Violin and Points)
- Build a `sampleColoredData` structure: for each group, map each of its sessions to a distinct color (palette of ~12 colors) and include their values
- Pass `blackAndWhite={showSampleColors}` to `BoxViolinPlots` when sample colors mode is on (so boxes go B&W automatically)
- Pass `sampleColoredData` to `BoxViolinPlots`

---

### Sample Color Palette
A dedicated 12-color palette distinct from treatment group colors will be used:
```ts
const SAMPLE_COLORS = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45',
  '#fabed4', '#469990', '#dcbeff', '#9A6324',
];
```
Colors are assigned by sample index within the group, cycling if more than 12 samples.

---

### SVG Legend Layout
The legend will be placed inside the SVG to the right of the plot area, so it exports correctly with PNG:
```text
[  Plot Area  ] | [Legend]
                  ● Sample_1.txt
                  ● Sample_2.txt
                  ● Sample_3.txt
                  ...
```
Each legend entry: colored circle (r=5) + sample file name (truncated to ~18 chars), stacked vertically starting at `topMargin`.

---

### Technical Details
- The toggle only appears in `GroupComparison` (the "Between Groups" tab), not in other BoxViolinPlots usages
- When `showSampleColors = false`, behavior is completely unchanged
- When `showSampleColors = true`: boxes go B&W, jitter is multi-colored by sample, legend appears on the right
- The `showJitter` toggle still controls whether any jitter is shown at all
- Jitter remains seeded for visual stability (seed incorporates `sampleIndex * 10000 + pointIndex`)
- The `BoxViolinSvg` changes are backward compatible — `sampleColoredJitter` and `sampleLegend` are optional props; omitting them gives the existing behavior
