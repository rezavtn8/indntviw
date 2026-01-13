/**
 * Violin Plot Path Generation (Kernel Density Estimation)
 */

import { valueToY, PLOT_HEIGHT } from './layout';

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
  
  const sorted = [...values].sort((a, b) => a - b);
  const bandwidth = (sorted[sorted.length - 1] - sorted[0]) / 10 || 1;
  const steps = 30;
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
