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
  pValue: number;
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

// t-distribution CDF approximation (using normal for large df)
const tCDF = (t: number, df: number): number => {
  if (df > 30) return normalCDF(t);
  // Simple approximation for smaller df
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
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
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j <= 5; j++) ser += cof[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
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

// Chi-squared CDF approximation
const chiSquaredCDF = (x: number, df: number): number => {
  if (x <= 0) return 0;
  return 1 - incompleteBeta(df / (df + x), df / 2, 0.5);
};

// F-distribution CDF approximation
const fCDF = (f: number, df1: number, df2: number): number => {
  if (f <= 0) return 0;
  const x = df2 / (df2 + df1 * f);
  return 1 - incompleteBeta(x, df2 / 2, df1 / 2);
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
  
  // 95% CI (using t-distribution critical value approximation)
  const tCrit = n > 30 ? 1.96 : 2.0 + (30 - n) * 0.02;
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

// Shapiro-Wilk approximation (simplified)
export const shapiroWilkTest = (values: number[]): NormalityTest => {
  const n = values.length;
  if (n < 3) return { shapiroWilk: { statistic: 1, pValue: 1 }, isNormal: true };
  
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  
  // Calculate W statistic approximation
  let numerator = 0;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const a = (n - 2 * i - 1) / (n * Math.sqrt(n));
    numerator += a * (sorted[n - 1 - i] - sorted[i]);
  }
  numerator = numerator * numerator;
  
  const denominator = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const W = denominator > 0 ? numerator / denominator : 1;
  
  // Approximate p-value
  const mu = 0.0038915 * Math.log(n) * Math.log(n) * Math.log(n) - 0.083751 * Math.log(n) * Math.log(n) - 0.31082 * Math.log(n) - 1.5861;
  const sigma = Math.exp(0.0030302 * Math.log(n) * Math.log(n) - 0.082676 * Math.log(n) - 0.4803);
  const z = (Math.log(1 - W) - mu) / sigma;
  const pValue = 1 - normalCDF(z);
  
  return {
    shapiroWilk: { statistic: W, pValue: Math.max(0, Math.min(1, pValue)) },
    isNormal: pValue > 0.05
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
  
  const tCrit = df > 30 ? 1.96 : 2.0;
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

// Tukey HSD post-hoc test
export const tukeyHSD = (groups: { name: string; values: number[] }[]): PostHocResult[] => {
  const results: PostHocResult[] = [];
  const k = groups.length;
  
  // Calculate MSE (within-group variance)
  const allValues = groups.flatMap(g => g.values);
  const N = allValues.length;
  let ssWithin = 0;
  for (const group of groups) {
    const mean = group.values.reduce((a, b) => a + b, 0) / group.values.length;
    ssWithin += group.values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  }
  const mse = ssWithin / (N - k);
  
  // Pairwise comparisons
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const g1 = groups[i];
      const g2 = groups[j];
      const mean1 = g1.values.reduce((a, b) => a + b, 0) / g1.values.length;
      const mean2 = g2.values.reduce((a, b) => a + b, 0) / g2.values.length;
      const meanDiff = mean1 - mean2;
      
      const se = Math.sqrt(mse * (1 / g1.values.length + 1 / g2.values.length) / 2);
      const q = se > 0 ? Math.abs(meanDiff) / se : 0;
      
      // Approximate p-value using normal distribution
      const pValue = 2 * (1 - normalCDF(q / Math.sqrt(2)));
      
      results.push({
        group1: g1.name,
        group2: g2.name,
        meanDiff,
        pValue: Math.max(0, Math.min(1, pValue)),
        isSignificant: pValue < 0.05
      });
    }
  }
  
  return results;
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
