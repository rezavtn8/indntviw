/**
 * Shared formatters for statistical output.
 *
 * `formatP` was previously defined 12 times across the analysis components, in
 * three subtly different variants (some rendered "<0.001", some "< 0.001", one
 * had a dead branch that returned the same thing twice). `formatValue` was
 * defined 17 times. Divergent rounding between panels showing the same number
 * is a credibility problem in a tool meant for publication figures, so they
 * live here now.
 */

/** p-value for display. Never renders "0.000", which would imply p is exactly zero. */
export const formatP = (p: number): string => {
  if (!isFinite(p)) return '—';
  if (p < 0.001) return '<0.001';
  return p.toFixed(3);
};

/** Significance stars, for compact tables. */
export const formatStars = (p: number): string => {
  if (!isFinite(p)) return '';
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return 'ns';
};

/**
 * General numeric display. Switches to exponential for values that would
 * otherwise render as "0.0000" or run to many digits.
 */
export const formatValue = (v: number, digits = 3): string => {
  if (!isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) return v.toExponential(2);
  return v.toFixed(digits);
};

/** Confidence interval as "[lo, hi]". */
export const formatCI = (lower: number, upper: number, digits = 3): string =>
  `[${formatValue(lower, digits)}, ${formatValue(upper, digits)}]`;
