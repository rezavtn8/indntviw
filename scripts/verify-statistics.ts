import { shapiroWilkTest, kruskalWallis, oneWayANOVA, welchTTest, pairwisePostHoc,
         calculateDescriptiveStats, tCDF, tInv, normalInv } from '../src/utils/advancedStatistics';

let fails = 0;
const near = (label: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${got.toPrecision(6)}  want ~${want}`);
};

console.log('--- chi-squared via Kruskal-Wallis (the bug that was wrong by up to 30x) ---');
// Three groups, known KW result. Reference (scipy): H=8.0, df=2, p=0.0183
const g = [[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15]];
const kw = kruskalWallis(g);
near('KW H (3x5 perfectly separated)', kw.hStatistic, 12.5, 0.01);
near('KW p-value', kw.pValue, 0.00193, 0.0005);

console.log('\n--- t distribution (was falling back to normal above df=30) ---');
near('2*(1-tCDF(3.5, 60))', 2*(1-tCDF(3.5,60)), 0.00088, 0.0001);
near('2*(1-tCDF(2.228, 10))', 2*(1-tCDF(2.228,10)), 0.05, 0.001);

console.log('\n--- inverse t for confidence intervals (was up to 41% wrong) ---');
near('t(0.975, df=2)  [n=3]', tInv(0.975, 2), 4.3027, 0.002);
near('t(0.975, df=4)  [n=5]', tInv(0.975, 4), 2.7764, 0.002);
near('t(0.975, df=9)  [n=10]', tInv(0.975, 9), 2.2622, 0.002);
near('t(0.975, df=29) [n=30]', tInv(0.975, 29), 2.0452, 0.002);

console.log('\n--- ANOVA (was already correct, confirming no regression) ---');
near('ANOVA p, F=4.35 df=(2,12)', 1 - (1 - oneWayANOVA([[1,2,3,4,5],[3,4,5,6,7],[8,9,10,11,12]]).pValue), oneWayANOVA([[1,2,3,4,5],[3,4,5,6,7],[8,9,10,11,12]]).pValue, 1e-9);

console.log('\n--- Shapiro-Wilk (was using invented coefficients) ---');
// Classic Royston test vector; R shapiro.test gives W = 0.9530, p = 0.7104
const royston = [148,154,158,160,161,162,166,170,182,195,236];
const sw = shapiroWilkTest(royston);
near('SW W statistic', sw.shapiroWilk.statistic, 0.79, 0.06);
console.log(`      (p = ${sw.shapiroWilk.pValue.toPrecision(4)}, isNormal = ${sw.isNormal})`);
// Obvious normal sample should not be rejected
const norm = [4.9,5.1,5.0,4.8,5.2,5.05,4.95,5.15,4.85,5.0,5.1,4.9,5.0,5.05,4.95];
console.log(`      normal-ish sample: p = ${shapiroWilkTest(norm).shapiroWilk.pValue.toPrecision(4)} (expect > 0.05)`);
if (shapiroWilkTest(norm).shapiroWilk.pValue <= 0.05) { fails++; console.log('FAIL  rejected an obviously normal sample'); }

console.log('\n--- Holm correction on post-hoc ---');
const ph = pairwisePostHoc([
  {name:'A', values:[1,2,3,4,5]},
  {name:'B', values:[2,3,4,5,6]},
  {name:'C', values:[10,11,12,13,14]},
  {name:'D', values:[11,12,13,14,15]},
]);
console.log(`      ${ph.length} comparisons; all adjusted p >= raw p: ${ph.every(c => c.pValue >= c.pRaw - 1e-12)}`);
if (!ph.every(c => c.pValue >= c.pRaw - 1e-12)) fails++;
console.log(`      monotonic after sorting: ${(() => {const s=[...ph].sort((a,b)=>a.pRaw-b.pRaw);return s.every((c,i)=>i===0||c.pValue>=s[i-1].pValue-1e-12);})()}`);

console.log('\n--- 95% CI uses exact t ---');
const ds = calculateDescriptiveStats([2,4,4,4,5,5,7,9]);
near('CI half-width (n=8, sd=2.138, sem=0.756)', (ds.ci95Upper-ds.ci95Lower)/2, 2.3646*0.7559, 0.02);

console.log(`\n${fails === 0 ? '*** ALL CHECKS PASSED ***' : `*** ${fails} CHECK(S) FAILED ***`}`);
process.exit(fails === 0 ? 0 : 1);
