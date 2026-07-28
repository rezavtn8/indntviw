# Statistical and Numerical Methods

This document states exactly what IndentView computes, so that results can be
checked against a reference implementation. Every method below is verified
against known values by `npm run verify:stats`
([scripts/verify-statistics.ts](scripts/verify-statistics.ts)).

## Descriptive statistics

| Quantity | Definition |
|---|---|
| Standard deviation | **Sample** SD, divisor `n-1`. Used consistently across every panel. |
| SEM | `sd / sqrt(n)` |
| 95% CI | `mean ± t(0.975, n-1) · SEM`, with the exact inverse-t value |
| Median, Q1, Q3 | Linear-interpolated percentiles on the sorted values |
| Skewness | Fisher's moment coefficient, `m3 / sd^3` |
| Kurtosis | Excess kurtosis, `m4 / sd^4 - 3` |
| CV | `100 · sd / |mean|` |

## Distributions

All CDFs are computed exactly rather than approximated by the normal:

- **Student's t** — regularized incomplete beta, valid for all degrees of freedom.
- **Chi-squared** — regularized lower incomplete gamma `P(k/2, x/2)`, via series
  expansion below `a+1` and continued fraction above.
- **F** — regularized incomplete beta.
- **Inverse normal** — Acklam's rational approximation, `|error| < 1.2e-9`.
- **Inverse t** — bisection on the t CDF to 1e-10.

## Hypothesis tests

| Test | Implementation notes |
|---|---|
| **Shapiro–Wilk** | Royston (1992) AS R94. Expected order statistics `m_i = Φ⁻¹((i−3/8)/(n+1/4))`, with Royston's polynomial corrections for the two extreme weights. Separate p-value transforms for `n = 3`, `4 ≤ n ≤ 11`, and `n ≥ 12`. |
| **Welch's t-test** | Unequal variances. Welch–Satterthwaite degrees of freedom. CI uses the exact inverse t on those df. |
| **Mann–Whitney U** | Rank-based with tie-averaged ranks; normal approximation for the p-value. |
| **One-way ANOVA** | Standard F on between/within mean squares. Reports η². |
| **Kruskal–Wallis H** | Tie-averaged ranks, **with the standard tie correction** `H / (1 − Σ(t³−t)/(N³−N))`. |
| **Effect size** | Cohen's d on the pooled SD; Hedges' g applies the small-sample correction factor. |
| **Post-hoc** | Pairwise t-tests on the pooled ANOVA MSE, **Holm–Bonferroni** adjusted. Both raw and adjusted p-values are retained. |
| **Correlation** | Pearson and Spearman (tie-averaged ranks), p-values from the t transform. |

### Why Holm rather than Tukey HSD

The studentized range distribution has no closed form and any implementation is
an approximation. Holm–Bonferroni controls the family-wise error rate exactly,
is uniformly more powerful than Bonferroni, makes no independence assumption,
and is exactly computable — so the number displayed is the number you get. It is
labelled as Holm throughout the interface; nothing here claims to be Tukey.

## Spatial statistics

- **Moran's I** — binary symmetric weights with a distance threshold of
  `diagonal / sqrt(n)`. The z-score uses the full randomisation-assumption
  variance (Cliff & Ord), requiring the `S0`, `S1`, `S2` weight sums and the
  kurtosis term `b2`. A two-sided p-value is reported alongside.
- **Nearest-neighbour ratio** — observed mean NN distance over the CSR
  expectation `0.5 / sqrt(density)`. Below 1 indicates clustering, above 1
  indicates dispersion.
- **Property gradient** — genuine multiple linear regression of the property on
  `(x, y, z)`, solved by Gaussian elimination with partial pivoting on the 3×3
  normal equations. Falls back to per-axis slopes only if the system is singular.
- **Hull prism volume** — the 2D convex hull of the measured XY footprint,
  extruded over the Z range.

## Interpolation

The 2D heatmap fill and contours use **inverse distance weighting** with power 2
over all points. IDW is an exact interpolator at sample locations but produces
bullseye artefacts around isolated points and gives no uncertainty estimate.
Treat the interpolated field as a visual aid; all reported statistics are
computed from the measured points only, never from interpolated values.

## Known limitations

These are stated rather than hidden:

1. **Z-height scatter is not ISO 4287 roughness.** `Ra`, `Rq`, `Rz`, `Rsk` and
   `Rku` are computed from the recorded indent Z positions — tens to hundreds of
   scattered, unfiltered points. The arithmetic matches ISO 4287, the sampling
   does not. Useful for comparing samples measured the same way and for spotting
   stage tilt; not comparable to profilometer or AFM values.
2. **Mann–Whitney uses the normal approximation** without a continuity
   correction, so p-values are slightly liberal for very small samples (n < 10).
3. **Nearest-neighbour and Moran's I are O(n²).** Fine for the hundreds-of-points
   datasets typical of quasi-static matrices; not suitable for high-speed
   mapping runs of 10⁴–10⁵ indents without spatial indexing.
4. **Pooled group comparisons treat every indent as an independent replicate.**
   This inflates n and is pseudoreplication when the experimental unit is the
   sample. The interface defaults to sample-level comparison for this reason and
   labels the unit of analysis on both views.

## Verification

```sh
npm run verify:stats
```

Checks Kruskal–Wallis against the chi-squared reference, the t distribution at
several df, inverse-t critical values, Shapiro–Wilk against Royston's published
test vector, Holm monotonicity, and confidence-interval width.
