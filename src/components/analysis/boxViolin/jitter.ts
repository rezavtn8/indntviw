/**
 * Jittered Points Generation with Seeded Randomness
 */

import { valueToY } from './layout';

/**
 * Seeded pseudo-random number generator for consistent jitter positions
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export interface JitteredPoint {
  x: number;
  y: number;
}

/**
 * Generate jittered points for a set of values.
 * Points are centered around x=0 (assumes group transform will position them).
 * 
 * @param values - The data values
 * @param jitterWidth - The width of the jitter area
 * @param groupIndex - Used as part of the random seed for reproducibility
 * @param niceMin - Axis minimum
 * @param niceMax - Axis maximum  
 * @param topMargin - Top margin of plot area
 * @param maxPoints - Maximum number of points to render (default 100)
 */
export function getJitteredPoints(
  values: number[],
  jitterWidth: number,
  groupIndex: number,
  niceMin: number,
  niceMax: number,
  topMargin: number,
  maxPoints: number = 100
): JitteredPoint[] {
  const maxJitter = jitterWidth * 0.3;
  
  return values.slice(0, maxPoints).map((v, i) => ({
    x: (seededRandom(groupIndex * 1000 + i) - 0.5) * maxJitter,
    y: valueToY(v, niceMin, niceMax, topMargin),
  }));
}
