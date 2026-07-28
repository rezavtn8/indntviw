/**
 * Shared numeric helpers.
 *
 * Two reasons this module exists:
 *
 * 1. `Math.min(...values)` throws `RangeError: Maximum call stack size exceeded`
 *    once the array passes roughly 125k elements. High-speed nanoindentation
 *    maps routinely produce more indents than that, so the spread form is not
 *    safe here. `minOf`/`maxOf` iterate instead.
 *
 * 2. Mean and standard deviation were previously reimplemented inline in a
 *    dozen files, and disagreed: some used population variance (/n), others
 *    sample variance (/(n-1)). The same points could show two different SDs
 *    in two panels. Everything routes through here now.
 */

export const minOf = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  let m = values[0];
  for (let i = 1; i < values.length; i++) if (values[i] < m) m = values[i];
  return m;
};

export const maxOf = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  let m = values[0];
  for (let i = 1; i < values.length; i++) if (values[i] > m) m = values[i];
  return m;
};

export const extentOf = (values: readonly number[]): [number, number] => {
  if (values.length === 0) return [0, 0];
  let lo = values[0];
  let hi = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < lo) lo = values[i];
    if (values[i] > hi) hi = values[i];
  }
  return [lo, hi];
};

export const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/** Sample variance (n-1). This is the project-wide convention. */
export const sampleVariance = (values: readonly number[]): number => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
};

/** Sample standard deviation (n-1). */
export const sampleStdDev = (values: readonly number[]): number =>
  Math.sqrt(sampleVariance(values));

/**
 * Linear-interpolated percentile. `p` is 0-100.
 * Sorts a copy, so the caller's array is left alone.
 */
export const percentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return percentileSorted(sorted, p);
};

/** Percentile on an already-sorted ascending array. */
export const percentileSorted = (sorted: readonly number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};
