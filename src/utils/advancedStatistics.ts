import { IndentationPoint } from '@/types/indentation';

export interface DescriptiveStats {
  n: number;
  mean: number;
  sem: number;
  sd: number;
  ci95Lower: number;
  ci95Upper: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
  range: number;
  skewness: number;
  kurtosis: number;
  cv: number; // Coefficient of variation
}

export interface NormalityTest {
  shapiroWilk: { statistic: number; pValue: number };
  isNormal: boolean;
}

export interface TTestResult {
  testName: string;
  statistic: number;
  df: number;
  pValue: number;
  ci95Lower: number;
  ci95Upper: number;
  meanDiff: number;
  isSignificant: boolean;
}

export interface WelchTTestResult extends TTestResult {
  testName: 'Welch\'s t-test';
}

export interface MannWhitneyResult {
  testName: 'Mann-Whitney U';
  uStatistic: number;
  zScore: number;
  pValue: number;
  isSignificant: boolean;
}

export interface ANOVAResult {
  testName: 'One-way ANOVA';
  fStatistic: number;
  dfBetween: number;
  dfWithin: number;
  pValue: number;
  isSignificant: boolean;
  etaSquared: number;
}

export interface KruskalWallisResult {
  testName: 'Kruskal-Wallis H';
  hStatistic: number;
  df: number;
  pValue: number;
  isSignificant: boolean;
}

export interface EffectSize {
  cohensD: number;
  hedgesG: number;
  interpretation: 'negligible' | 'small' | 'medium' | 'large';
}

export interface PostHocResult {
  group1: string;
  group2: string;
  meanDiff: number;
  /** Holm-adjusted p-value — this is the one to report. */
  pValue: number;
  /** Uncorrected p-value, retained for transparency. */
  pRaw: number;
  isSignificant: boolean;
}

export interface CorrelationResult {
  property1: string;
  property2: string;
  pearsonR: number;
  pearsonP: number;
  spearmanRho: number;
  spearmanP: number;
}

// Helper: get percentile from sorted array
const getPercentile = (sortedArr: number[], p: number): number => {
  if (sortedArr.length === 0) return 0;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
};

// Normal CDF approximation
export const normalCDF = (x: number): number => {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
};

// Student's t CDF — exact via the regularized incomplete beta, valid for all df.
// (Previously this fell back to the normal distribution above df=30, which made
// two-tailed p-values roughly 2x too small in that range.)
export const tCDF = (t: number, df: number): number => {
  if (!isFinite(t) || df <= 0) return 0.5;
  const x = df / (df + t * t);
  const tail = 0.5 * incompleteBeta(x, df / 2, 0.5);
  return t > 0 ? 1 - tail : tail;
};

// Incomplete beta function approximation
const incompleteBeta = (x: number, a: number, b: number): number => {
  if (x === 0) return 0;
  if (x === 1) return 1;
  // Simple approximation using continued fraction
  const bt = Math.exp(
    lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a;
  }
  return 1 - bt * betaCF(1 - x, b, a) / b;
};

const lgamma = (x: number): number => {
  // Lanczos coefficients (g=5, n=6) as published. Written at full printed
  // precision even though a double cannot hold every digit exactly — rounding
  // to the nearest representable value is the intended behaviour here.
  // eslint-disable-next-line no-loss-of-precision
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j <= 5; j++) ser += cof[j] / ++y;
  return -tmp + Math.log(Math.sqrt(2 * Math.PI) * ser / x);
};

const betaCF = (x: number, a: number, b: number): number => {
  const MAXIT = 100;
  const EPS = 3e-7;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
};

// Regularized lower incomplete gamma P(a, x).
// Series expansion below a+1, continued fraction above (Numerical Recipes gser/gcf).
const gammaP = (a: number, x: number): number => {
  if (x <= 0 || a <= 0) return 0;

  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }

  // Continued fraction gives Q(a,x) = 1 - P(a,x)
  const TINY = 1e-300;
  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  const q = Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  return 1 - q;
};

// Chi-squared CDF — P(k/2, x/2).
// (Previously this used the *t-distribution* incomplete-beta formula, which made
// every Kruskal-Wallis p-value wrong by factors of 1.5x to 30x.)
const chiSquaredCDF = (x: number, df: number): number => {
  if (x <= 0) return 0;
  return gammaP(df / 2, x / 2);
};

// F-distribution CDF approximation
const fCDF = (f: number, df1: number, df2: number): number => {
  if (f <= 0) return 0;
  const x = df2 / (df2 + df1 * f);
  return 1 - incompleteBeta(x, df2 / 2, df1 / 2);
};

// Inverse standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9)
export const normalInv = (p: number): number => {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
    6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
    -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
    3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
};

// Inverse Student's t via bisection on tCDF. Used for confidence-interval
// critical values, replacing the previous ad-hoc `2.0 + (30-n)*0.02` formula
// which was up to 41% wrong at small n.
export const tInv = (p: number, df: number): number => {
  if (df <= 0) return NaN;
  if (df > 2000) return normalInv(p);

  let lo = -200;
  let hi = 200;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) < p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-10) break;
  }
  return (lo + hi) / 2;
};

// Two-sided t critical value for a given confidence level (default 95%).
export const tCritical = (n: number, confidence = 0.95): number => {
  const df = n - 1;
  if (df < 1) return NaN;
  return tInv(1 - (1 - confidence) / 2, df);
};

/**
 * Holm-Bonferroni step-down correction. Controls the family-wise error rate
 * exactly, without assuming independence. Returns adjusted p-values in the
 * same order as the input.
 */
export const holmAdjust = (pValues: number[]): number[] => {
  const m = pValues.length;
  if (m === 0) return [];

  const order = pValues
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p - b.p);

  const adjusted = new Array<number>(m);
  let running = 0;
  order.forEach((entry, rank) => {
    const scaled = Math.min(1, (m - rank) * entry.p);
    running = Math.max(running, scaled); // enforce monotonicity
    adjusted[entry.i] = running;
  });

  return adjusted;
};

// Calculate descriptive statistics
export const calculateDescriptiveStats = (values: number[]): DescriptiveStats => {
  if (values.length === 0) {
    return {
      n: 0, mean: 0, sem: 0, sd: 0, ci95Lower: 0, ci95Upper: 0,
      median: 0, q1: 0, q3: 0, iqr: 0, min: 0, max: 0, range: 0,
      skewness: 0, kurtosis: 0, cv: 0
    };
  }

  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
  const sd = Math.sqrt(variance);
  const sem = sd / Math.sqrt(n);
  
  // 95% CI using the exact t critical value for n-1 degrees of freedom
  const tCrit = n > 1 ? tCritical(n, 0.95) : 0;
  const ci95Lower = mean - tCrit * sem;
  const ci95Upper = mean + tCrit * sem;
  
  const median = getPercentile(sorted, 50);
  const q1 = getPercentile(sorted, 25);
  const q3 = getPercentile(sorted, 75);
  const iqr = q3 - q1;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;
  
  // Skewness (Fisher's)
  const m3 = values.reduce((sum, val) => sum + Math.pow(val - mean, 3), 0) / n;
  const skewness = sd > 0 ? m3 / Math.pow(sd, 3) : 0;
  
  // Kurtosis (excess)
  const m4 = values.reduce((sum, val) => sum + Math.pow(val - mean, 4), 0) / n;
  const kurtosis = sd > 0 ? (m4 / Math.pow(sd, 4)) - 3 : 0;
  
  // Coefficient of variation
  const cv = mean !== 0 ? (sd / Math.abs(mean)) * 100 : 0;
  
  return { n, mean, sem, sd, ci95Lower, ci95Upper, median, q1, q3, iqr, min, max, range, skewness, kurtosis, cv };
};

/**
 * Shapiro-Wilk normality test (Royston 1992, AS R94).
 *
 * The previous implementation invented its own coefficients
 * `a_i = (n - 2i - 1) / (n * sqrt(n))` and then fed the resulting statistic into
 * Royston's real p-value formula, so neither W nor p was meaningful. This uses
 * Royston's actual expected-order-statistic weights.
 */
export const shapiroWilkTest = (values: number[]): NormalityTest => {
  const n = values.length;
  if (n < 3) return { shapiroWilk: { statistic: 1, pValue: 1 }, isNormal: true };

  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;

  const ss = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  if (ss <= 0) {
    // Zero variance — degenerate, not meaningfully testable
    return { shapiroWilk: { statistic: 1, pValue: 1 }, isNormal: true };
  }

  // m_i = Phi^-1((i - 3/8) / (n + 1/4))
  const m: number[] = [];
  for (let i = 1; i <= n; i++) {
    m.push(normalInv((i - 0.375) / (n + 0.25)));
  }
  const mSumSq = m.reduce((sum, v) => sum + v * v, 0);

  // Royston's polynomial corrections for the two extreme weights
  const rsn = 1 / Math.sqrt(n);
  const a = new Array<number>(n).fill(0);

  const cn = m[n - 1] / Math.sqrt(mSumSq);
  const cn1 = m[n - 2] / Math.sqrt(mSumSq);

  const an = -2.706056 * rsn ** 5 + 4.434685 * rsn ** 4 - 2.071190 * rsn ** 3
    - 0.147981 * rsn ** 2 + 0.221157 * rsn + cn;

  let phi: number;
  if (n > 5) {
    const an1 = -3.582633 * rsn ** 5 + 5.682633 * rsn ** 4 - 1.752461 * rsn ** 3
      - 0.293762 * rsn ** 2 + 0.042981 * rsn + cn1;
    phi = (mSumSq - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) /
      (1 - 2 * an ** 2 - 2 * an1 ** 2);
    a[n - 1] = an;
    a[0] = -an;
    a[n - 2] = an1;
    a[1] = -an1;
    for (let i = 2; i < n - 2; i++) a[i] = m[i] / Math.sqrt(phi);
  } else {
    phi = (mSumSq - 2 * m[n - 1] ** 2) / (1 - 2 * an ** 2);
    a[n - 1] = an;
    a[0] = -an;
    for (let i = 1; i < n - 1; i++) a[i] = m[i] / Math.sqrt(phi);
  }

  let numerator = 0;
  for (let i = 0; i < n; i++) numerator += a[i] * sorted[i];
  const W = Math.min(1, (numerator * numerator) / ss);

  // Royston's p-value: different normalising transforms for small vs larger n
  let pValue: number;
  if (n === 3) {
    // Exact for n = 3
    const pi6 = 6 / Math.PI;
    const stqr = Math.asin(Math.sqrt(0.75));
    pValue = Math.max(0, Math.min(1, pi6 * (Math.asin(Math.sqrt(W)) - stqr)));
  } else if (n <= 11) {
    const gamma = -2.273 + 0.459 * n;
    const mu = 0.5440 - 0.39978 * n + 0.025054 * n ** 2 - 0.0006714 * n ** 3;
    const sigma = Math.exp(1.3822 - 0.77857 * n + 0.062767 * n ** 2 - 0.0020322 * n ** 3);
    const arg = gamma - Math.log(1 - W);
    if (arg <= 0) return { shapiroWilk: { statistic: W, pValue: 0 }, isNormal: false };
    const z = (-Math.log(arg) - mu) / sigma;
    pValue = 1 - normalCDF(z);
  } else {
    const ln = Math.log(n);
    const mu = 0.0038915 * ln ** 3 - 0.083751 * ln ** 2 - 0.31082 * ln - 1.5861;
    const sigma = Math.exp(0.0030302 * ln ** 2 - 0.082676 * ln - 0.4803);
    const z = (Math.log(1 - W) - mu) / sigma;
    pValue = 1 - normalCDF(z);
  }

  const p = Math.max(0, Math.min(1, pValue));
  return {
    shapiroWilk: { statistic: W, pValue: p },
    isNormal: p > 0.05,
  };
};

// Welch's t-test (unequal variances)
export const welchTTest = (group1: number[], group2: number[]): WelchTTestResult => {
  const stats1 = calculateDescriptiveStats(group1);
  const stats2 = calculateDescriptiveStats(group2);
  
  const meanDiff = stats1.mean - stats2.mean;
  const var1 = stats1.sd * stats1.sd;
  const var2 = stats2.sd * stats2.sd;
  const n1 = stats1.n;
  const n2 = stats2.n;
  
  const seDiff = Math.sqrt(var1 / n1 + var2 / n2);
  const t = seDiff > 0 ? meanDiff / seDiff : 0;
  
  // Welch-Satterthwaite degrees of freedom
  const num = Math.pow(var1 / n1 + var2 / n2, 2);
  const den = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
  const df = den > 0 ? num / den : 1;
  
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));

  // Exact t critical value on the Welch-Satterthwaite df
  const tCrit = df >= 1 ? tInv(0.975, df) : 0;
  const ci95Lower = meanDiff - tCrit * seDiff;
  const ci95Upper = meanDiff + tCrit * seDiff;
  
  return {
    testName: "Welch's t-test",
    statistic: t,
    df,
    pValue: Math.max(0, Math.min(1, pValue)),
    ci95Lower,
    ci95Upper,
    meanDiff,
    isSignificant: pValue < 0.05
  };
};

// Mann-Whitney U test (non-parametric)
export const mannWhitneyU = (group1: number[], group2: number[]): MannWhitneyResult => {
  const n1 = group1.length;
  const n2 = group2.length;
  
  // Combine and rank
  const combined = [
    ...group1.map(v => ({ value: v, group: 1 })),
    ...group2.map(v => ({ value: v, group: 2 }))
  ].sort((a, b) => a.value - b.value);
  
  // Assign ranks (handling ties)
  const ranks: number[] = [];
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].value === combined[i].value) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) ranks.push(avgRank);
    i = j;
  }
  
  // Sum of ranks for group 1
  let R1 = 0;
  let idx = 0;
  for (const item of combined) {
    if (item.group === 1) R1 += ranks[idx];
    idx++;
  }
  
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  
  // Normal approximation for large samples
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = sigma > 0 ? (U - mu) / sigma : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  return {
    testName: 'Mann-Whitney U',
    uStatistic: U,
    zScore: z,
    pValue: Math.max(0, Math.min(1, pValue)),
    isSignificant: pValue < 0.05
  };
};

// One-way ANOVA
export const oneWayANOVA = (groups: number[][]): ANOVAResult => {
  const k = groups.length;
  const allValues = groups.flat();
  const N = allValues.length;
  const grandMean = allValues.reduce((a, b) => a + b, 0) / N;
  
  // Between-group sum of squares
  let ssBetween = 0;
  for (const group of groups) {
    const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
    ssBetween += group.length * Math.pow(groupMean - grandMean, 2);
  }
  
  // Within-group sum of squares
  let ssWithin = 0;
  for (const group of groups) {
    const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
    ssWithin += group.reduce((sum, val) => sum + Math.pow(val - groupMean, 2), 0);
  }
  
  const dfBetween = k - 1;
  const dfWithin = N - k;
  
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const fStatistic = msWithin > 0 ? msBetween / msWithin : 0;
  
  const pValue = 1 - fCDF(fStatistic, dfBetween, dfWithin);
  const etaSquared = ssBetween / (ssBetween + ssWithin);
  
  return {
    testName: 'One-way ANOVA',
    fStatistic,
    dfBetween,
    dfWithin,
    pValue: Math.max(0, Math.min(1, pValue)),
    isSignificant: pValue < 0.05,
    etaSquared
  };
};

// Kruskal-Wallis H test (non-parametric ANOVA)
export const kruskalWallis = (groups: number[][]): KruskalWallisResult => {
  const k = groups.length;
  const allValues = groups.flatMap((g, i) => g.map(v => ({ value: v, group: i })));
  const N = allValues.length;
  
  // Rank all values
  allValues.sort((a, b) => a.value - b.value);
  const ranks: number[] = [];
  let i = 0;
  while (i < allValues.length) {
    let j = i;
    while (j < allValues.length && allValues[j].value === allValues[i].value) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let l = i; l < j; l++) ranks.push(avgRank);
    i = j;
  }
  
  // Calculate rank sums for each group
  const groupRankSums: number[] = new Array(k).fill(0);
  for (let idx = 0; idx < allValues.length; idx++) {
    groupRankSums[allValues[idx].group] += ranks[idx];
  }
  
  // H statistic
  let H = 0;
  for (let g = 0; g < k; g++) {
    const ni = groups[g].length;
    if (ni > 0) {
      H += (groupRankSums[g] * groupRankSums[g]) / ni;
    }
  }
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);

  // Tie correction: H / (1 - sum(t^3 - t) / (N^3 - N)).
  // Without this, H is biased downward whenever values repeat — common with
  // instrument data quantised to a fixed number of decimals.
  let tieSum = 0;
  let ti = 0;
  while (ti < allValues.length) {
    let tj = ti;
    while (tj < allValues.length && allValues[tj].value === allValues[ti].value) tj++;
    const t = tj - ti;
    if (t > 1) tieSum += t ** 3 - t;
    ti = tj;
  }
  const tieCorrection = N > 1 ? 1 - tieSum / (N ** 3 - N) : 1;
  if (tieCorrection > 0) H = H / tieCorrection;

  const df = k - 1;
  const pValue = 1 - chiSquaredCDF(H, df);
  
  return {
    testName: 'Kruskal-Wallis H',
    hStatistic: H,
    df,
    pValue: Math.max(0, Math.min(1, pValue)),
    isSignificant: pValue < 0.05
  };
};

// Effect size (Cohen's d and Hedges' g)
export const calculateEffectSize = (group1: number[], group2: number[]): EffectSize => {
  const stats1 = calculateDescriptiveStats(group1);
  const stats2 = calculateDescriptiveStats(group2);
  
  const pooledSD = Math.sqrt(
    ((stats1.n - 1) * stats1.sd * stats1.sd + (stats2.n - 1) * stats2.sd * stats2.sd) /
    (stats1.n + stats2.n - 2)
  );
  
  const cohensD = pooledSD > 0 ? (stats1.mean - stats2.mean) / pooledSD : 0;
  
  // Hedges' g (corrected for small sample bias)
  const correctionFactor = 1 - 3 / (4 * (stats1.n + stats2.n) - 9);
  const hedgesG = cohensD * correctionFactor;
  
  const absD = Math.abs(cohensD);
  let interpretation: 'negligible' | 'small' | 'medium' | 'large';
  if (absD < 0.2) interpretation = 'negligible';
  else if (absD < 0.5) interpretation = 'small';
  else if (absD < 0.8) interpretation = 'medium';
  else interpretation = 'large';
  
  return { cohensD, hedgesG, interpretation };
};

/**
 * Pairwise post-hoc comparisons with Holm-Bonferroni family-wise error control.
 *
 * This replaces a function that was labelled "Tukey HSD" but actually ran an
 * uncorrected pairwise z-test — with 5 groups (10 comparisons) that gives a
 * family-wise error rate near 40% rather than 5%.
 *
 * Each pair is compared with a t-test on the pooled within-group variance
 * (the same MSE an ANOVA uses), then the resulting p-values are Holm-adjusted.
 * Holm is uniformly more powerful than Bonferroni and, unlike the studentized
 * range, is exact to compute — so the number shown is the number you get.
 *
 * `pValue` is the adjusted (reportable) value; `pRaw` is kept for transparency.
 */
export const pairwisePostHoc = (groups: { name: string; values: number[] }[]): PostHocResult[] => {
  const k = groups.length;
  if (k < 2) return [];

  const usable = groups.filter(g => g.values.length > 0);
  if (usable.length < 2) return [];

  // Pooled within-group mean square error, as in one-way ANOVA
  const N = usable.reduce((sum, g) => sum + g.values.length, 0);
  let ssWithin = 0;
  for (const group of usable) {
    const mean = group.values.reduce((a, b) => a + b, 0) / group.values.length;
    ssWithin += group.values.reduce((sum, val) => sum + (val - mean) ** 2, 0);
  }
  const dfWithin = N - usable.length;
  const mse = dfWithin > 0 ? ssWithin / dfWithin : 0;

  const pending: { group1: string; group2: string; meanDiff: number; pRaw: number }[] = [];

  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const g1 = usable[i];
      const g2 = usable[j];
      const n1 = g1.values.length;
      const n2 = g2.values.length;
      const mean1 = g1.values.reduce((a, b) => a + b, 0) / n1;
      const mean2 = g2.values.reduce((a, b) => a + b, 0) / n2;
      const meanDiff = mean1 - mean2;

      const se = Math.sqrt(mse * (1 / n1 + 1 / n2));
      const t = se > 0 ? meanDiff / se : 0;
      const pRaw = dfWithin > 0
        ? Math.max(0, Math.min(1, 2 * (1 - tCDF(Math.abs(t), dfWithin))))
        : 1;

      pending.push({ group1: g1.name, group2: g2.name, meanDiff, pRaw });
    }
  }

  const adjusted = holmAdjust(pending.map(c => c.pRaw));

  return pending.map((c, idx) => ({
    group1: c.group1,
    group2: c.group2,
    meanDiff: c.meanDiff,
    pRaw: c.pRaw,
    pValue: adjusted[idx],
    isSignificant: adjusted[idx] < 0.05,
  }));
};

// Pearson and Spearman correlation
export const calculateCorrelation = (x: number[], y: number[]): { pearsonR: number; pearsonP: number; spearmanRho: number; spearmanP: number } => {
  const n = Math.min(x.length, y.length);
  if (n < 3) return { pearsonR: 0, pearsonP: 1, spearmanRho: 0, spearmanP: 1 };
  
  // Pearson correlation
  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  
  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }
  
  const pearsonR = (sumX2 > 0 && sumY2 > 0) ? sumXY / Math.sqrt(sumX2 * sumY2) : 0;
  const tStat = pearsonR * Math.sqrt((n - 2) / (1 - pearsonR * pearsonR + 1e-10));
  const pearsonP = 2 * (1 - tCDF(Math.abs(tStat), n - 2));
  
  // Spearman correlation (rank-based)
  const rankX = getRanks(x.slice(0, n));
  const rankY = getRanks(y.slice(0, n));
  
  const meanRX = rankX.reduce((a, b) => a + b, 0) / n;
  const meanRY = rankY.reduce((a, b) => a + b, 0) / n;
  
  let sumRXY = 0, sumRX2 = 0, sumRY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = rankX[i] - meanRX;
    const dy = rankY[i] - meanRY;
    sumRXY += dx * dy;
    sumRX2 += dx * dx;
    sumRY2 += dy * dy;
  }
  
  const spearmanRho = (sumRX2 > 0 && sumRY2 > 0) ? sumRXY / Math.sqrt(sumRX2 * sumRY2) : 0;
  const tStatS = spearmanRho * Math.sqrt((n - 2) / (1 - spearmanRho * spearmanRho + 1e-10));
  const spearmanP = 2 * (1 - tCDF(Math.abs(tStatS), n - 2));
  
  return {
    pearsonR,
    pearsonP: Math.max(0, Math.min(1, pearsonP)),
    spearmanRho,
    spearmanP: Math.max(0, Math.min(1, spearmanP))
  };
};

const getRanks = (arr: number[]): number[] => {
  const indexed = arr.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);
  
  const ranks: number[] = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].value === indexed[i].value) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].index] = avgRank;
    }
    i = j;
  }
  
  return ranks;
};

// Get values from points for a property
export const getPropertyValues = (points: IndentationPoint[], property: string): number[] => {
  return points
    .map(p => p.properties[property])
    .filter(v => v !== undefined && !isNaN(v));
};
