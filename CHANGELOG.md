# Changelog

## 2.3.0 — first public release

### Statistical corrections

These change results. Values produced by earlier builds are not comparable to
values produced from 2.3 onward. Saved workspaces now record the app version
that wrote them, so a project file states which side of this line it is on.

- **Kruskal–Wallis p-values were wrong by factors of 1.5× to 30×.** The
  chi-squared CDF was implemented with the t-distribution's incomplete-beta
  formula instead of the incomplete gamma. A true p = 0.001 was reported as
  p = 0.027. Now uses the regularized `P(k/2, x/2)`.
- **Post-hoc comparisons applied no multiple-comparison correction.** A test
  labelled "Tukey HSD" was in fact an uncorrected pairwise z-test, giving a
  family-wise error rate near 40% with five groups. Replaced with pairwise
  t-tests on the pooled within-group MSE, Holm–Bonferroni adjusted, and
  labelled accordingly. Both raw and adjusted p-values are now shown.
- **Shapiro–Wilk used invented coefficients** fed into Royston's real p-value
  formula. Replaced with Royston (1992) AS R94.
- **Confidence intervals used an ad-hoc critical value** (`2.0 + (30-n)*0.02`),
  up to 41% wrong at n = 3. Now uses an exact inverse-t.
- **Student's t fell back to the normal distribution above df = 30**, making
  two-tailed p-values roughly 2× too small. Now exact for all degrees of
  freedom.
- **Kruskal–Wallis had no tie correction**, biasing H downward on
  instrument data quantised to fixed decimals.
- **Standard deviation was inconsistent**: population (`/n`) in three modules,
  sample (`/(n-1)`) in the analysis engine, so the same points showed different
  values in different panels. Standardised on sample SD throughout.

### Removed fabricated measurements

- `convexHullVolume` was computed as `boundingVolume * 0.65` — a hardcoded
  constant presented as geometry. Replaced with a real hull-prism volume from
  the convex hull of the measured footprint extruded over the Z range.
- Moran's I reported a z-score derived from `variance = 1/(n-1)`, which is not
  the variance of Moran's I under any assumption. Now uses the Cliff & Ord
  randomisation variance and reports a p-value.
- "Cluster count" only ever returned 1 or 2. Removed.
- The 3D property gradient ran three independent univariate regressions while
  documented as multiple regression — wrong whenever the stage is tilted, which
  is precisely when it matters. Now solves the 3×3 normal equations.
- Ra/Rq/Rz/Rsk/Rku relabelled as **Z-height scatter**. They are computed from
  scattered indent Z positions, not a filtered profile, and are not ISO 4287
  roughness.

### Fixed — data loss

- Autosave hashed only session IDs and array lengths. Editing a point, deleting
  points, reshaping or renaming a zone, and changing colours all left the hash
  unchanged, so the work was never written to IndexedDB.
- Overlay state (micrograph image and both layer transforms) was read back on
  load but never persisted, so all image registration was lost on reload.
- The unload save was asynchronous and routinely did not complete. Replaced
  with a `visibilitychange` flush.

### Fixed — import

- `.csv` was accepted by the uploader and advertised in the UI, but the parser
  split on tabs only. Added delimiter detection plus BOM and CRLF handling.

### Changed — analysis navigation

- The treatment-group view stacked five separate analyses in a single scroll,
  and the zone view stacked two more. Both are now two-level: select a view,
  see one thing.
- Pooled and sample-level group comparison were presented side by side as
  though complementary. They are alternatives, so they are now mutually
  exclusive views that state their unit of analysis (n = indents vs n =
  samples). Sample-level is the default, because pooling every indent is
  pseudoreplication when the experimental unit is the sample.

### Changed — internals

- Ten analysis components each carried a copy of the same statistical pipeline
  and its rendering, which is why a single wrong p-value appeared in ten
  places. Consolidated into one `ComparisonReport`; 1,464 lines removed.
- Shared `formatStats.ts` replaces twelve copies of the p-value formatter (in
  three variants) and seventeen of the numeric formatter.
- Shared `numeric.ts` replaces inline mean/SD/percentile implementations.
  `minOf`/`maxOf` replace `Math.min(...array)`, which throws above roughly
  125,000 elements.
- Zone membership lookups moved from `Array.includes` inside a filter to a
  `Set`, removing an O(points × members) cost on every render.

### Performance

- The single 3.3 MB bundle is now split by feature; first-load JavaScript
  dropped from 950 kB to about 350 kB gzipped.

### Known limitations

- Spatial statistics are O(n²) and run on the main thread: about 2.2 s at
  10,000 indents, and quadratic beyond that. Suitable for quasi-static
  matrices, not yet for high-speed mapping runs.
- Interpolation is inverse-distance weighting, which produces bullseye
  artefacts around isolated points and gives no uncertainty estimate.
- `SmartZoneAnalysis` has not been migrated to the shared comparison report.

See [METHODS.md](METHODS.md) for the full description of methods and their
limitations.
