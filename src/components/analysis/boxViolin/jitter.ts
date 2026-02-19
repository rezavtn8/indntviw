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
  color?: string;
}

/**
 * Generate jittered points for a set of values.
 * Points are centered around x=0 (assumes group transform will position them).
 */
export function getJitteredPoints(
  values: number[],
  jitterWidth: number,
  groupIndex: number,
  niceMin: number,
  niceMax: number,
  topMargin: number
): JitteredPoint[] {
  const maxJitter = jitterWidth * 0.3;
  
  return values.map((v, i) => ({
    x: (seededRandom(groupIndex * 1000 + i) - 0.5) * maxJitter,
    y: valueToY(v, niceMin, niceMax, topMargin),
  }));
}

/**
 * Generate colored jittered points from multiple samples.
 * Each sample's points get a distinct color.
 */
export function getColoredJitteredPoints(
  samples: { values: number[]; color: string }[],
  jitterWidth: number,
  groupIndex: number,
  niceMin: number,
  niceMax: number,
  topMargin: number
): JitteredPoint[] {
  const maxJitter = jitterWidth * 0.3;
  const result: JitteredPoint[] = [];

  samples.forEach((sample, sampleIdx) => {
    sample.values.forEach((v, pointIdx) => {
      const seed = groupIndex * 100000 + sampleIdx * 10000 + pointIdx;
      result.push({
        x: (seededRandom(seed) - 0.5) * maxJitter,
        y: valueToY(v, niceMin, niceMax, topMargin),
        color: sample.color,
      });
    });
  });

  return result;
}

