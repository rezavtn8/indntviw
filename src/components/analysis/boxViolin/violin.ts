/**
 * Violin Plot Path Generation (Kernel Density Estimation)
 * Uses Silverman's rule of thumb for bandwidth selection
 */

import { valueToY, PLOT_HEIGHT } from './layout';

/**
 * Calculate standard deviation
 */
function calculateSD(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

/**
 * Calculate bandwidth using Silverman's rule of thumb
 * h = 0.9 * min(sd, IQR/1.34) * n^(-1/5)
 */
function calculateSilvermanBandwidth(values: number[]): number {
  const n = values.length;
  if (n < 2) return 1;
  
  const sorted = [...values].sort((a, b) => a - b);
  const sd = calculateSD(values);
  
  // Calculate IQR
  const q1Idx = Math.floor(n * 0.25);
  const q3Idx = Math.floor(n * 0.75);
  const iqr = sorted[q3Idx] - sorted[q1Idx];
  
  // Silverman's rule
  const silvermanFactor = 0.9 * Math.min(sd, iqr / 1.34) * Math.pow(n, -0.2);
  
  // Fallback if silverman gives 0 or negative
  if (silvermanFactor <= 0) {
    return (sorted[n - 1] - sorted[0]) / 10 || 1;
  }
  
  return silvermanFactor;
}

/**
 * Generate SVG path for a violin shape using kernel density estimation.
 * The path is centered at x=0 (assumes group transform will position it).
 */
export function getViolinPath(
  values: number[],
  width: number,
  niceMin: number,
  niceMax: number,
  topMargin: number
): string {
  if (values.length < 2) return '';
  
  // Use Silverman's rule for bandwidth
  const bandwidth = calculateSilvermanBandwidth(values);
  
  // More steps for smoother curves
  const steps = 50;
  const niceRange = niceMax - niceMin;
  
  const densities: { y: number; density: number }[] = [];
  let maxDensity = 0;
  
  for (let i = 0; i <= steps; i++) {
    const dataValue = niceMin + (i / steps) * niceRange;
    let density = 0;
    
    for (const v of values) {
      const u = (dataValue - v) / bandwidth;
      density += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    }
    density /= values.length * bandwidth;
    maxDensity = Math.max(maxDensity, density);
    
    densities.push({ 
      y: valueToY(dataValue, niceMin, niceMax, topMargin), 
      density 
    });
  }
  
  if (maxDensity === 0) return '';
  
  // Create symmetric violin shape centered at x=0
  const leftPath = densities.map((d, i) => {
    const x = -(d.density / maxDensity) * (width / 2);
    return `${i === 0 ? 'M' : 'L'} ${x} ${d.y}`;
  }).join(' ');
  
  const rightPath = [...densities].reverse().map(d => {
    const x = (d.density / maxDensity) * (width / 2);
    return `L ${x} ${d.y}`;
  }).join(' ');
  
  return `${leftPath} ${rightPath} Z`;
}
