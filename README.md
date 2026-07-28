# IndentView

Visualization and statistical analysis for instrumented indentation data.

IndentView reads the matrix exports produced by nanoindentation testers, renders
them as spatial property maps, lets you define regions of interest directly on
the map, and runs comparative statistics across zones, samples and treatment
groups — then exports publication-ready figures.

Everything runs in the browser. There is no backend and no account; measurement
data never leaves the machine it is opened on.

---

## Capabilities

**Import** — Anton Paar tester exports in `.txt`, `.tsv`, `.csv` and `.xlsx`.
The parser locates the header row automatically, maps instrument column names to
canonical property keys, handles the Windows-1252 mojibake variants (`hmax [�m]`,
`F/S� [�m�/�N]`), skips the Min/Max/Mean/Std/Median/N summary block, and detects
the paired Calibration/Matrix column layout.

**2D mapping** — Property heatmap with IDW interpolation and contours, selectable
point shapes and sizing, lasso and box selection, click-to-edit with undo/redo,
and IQR-based outlier detection.

**3D** — Point cloud with Delaunay surface mesh, wireframe overlay, per-axis flips.

**Overlay** — Register the indentation grid against an optical or SEM micrograph,
with independent transforms for the image and the point layers.

**Zones** — Freeform, elliptical and rectangular regions of interest with
α-shape boundary generation and per-zone statistics.

**Comparison** — Sample-to-sample, treatment-group (both pooled and sample-level),
and zone-based comparisons, with the unit of analysis stated on every view.

**Export** — Figure studio producing PNG, SVG and PDF; batch export of multiple
samples to a ZIP archive; portable `.indentview` workspace files.

---

## Statistics

Methods, formulae and known limitations are documented in
**[METHODS.md](METHODS.md)**.

Results are verified against published reference values:

```sh
npm run verify:stats
```

This checks Kruskal–Wallis against the chi-squared distribution, Student's t at
several degrees of freedom, inverse-t confidence-interval critical values,
Shapiro–Wilk against Royston's test vector, Holm correction monotonicity, and
confidence-interval width. Run it before trusting a result you intend to publish.

---

## Development

Requires Node.js 18+.

```sh
npm install
npm run dev        # dev server on :8080
npm run build      # production build to dist/
npm run lint
npm run verify:stats
```

The production build is a static bundle. Deploy `dist/` to any static host —
no server-side runtime is required. Configure an SPA fallback (all routes to
`/index.html`) or client-side routes will 404 on refresh.

### Project layout

```
src/
  components/
    analysis/       comparison and statistics panels
    controls/       sidebar controls
    export/         figure export options
    layout/         app shell
    panels/         contextual side panels
    visualization/  heatmap, 3D scene, overlay, export canvas
  contexts/         session, visualization, zones, editor state
  types/            data model
  utils/            parsing, statistics, geometry, export
scripts/
  verify-statistics.ts
```

---

## Editing in Lovable

This repository is synced with a [Lovable](https://lovable.dev) project. Changes
pushed to `main` here appear in the Lovable editor, and changes made there are
committed back to this repository. `lovable-tagger` in `vite.config.ts` is
dev-only and is what maintains that link — removing it detaches the project.

---

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE).
