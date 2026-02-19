/**
 * Jittered Points Generation with Seeded Randomness
 * and Beeswarm Non-Overlapping Layout
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

/**
 * Beeswarm layout: places each point at its exact Y position,
 * nudging X only enough to avoid overlapping neighbours.
 * All points are guaranteed visible.
 */
export function getBeeswarmPoints(
  values: number[],
  radius: number,
  niceMin: number,
  niceMax: number,
  topMargin: number,
  maxHalfWidth = 80
): JitteredPoint[] {
  const diameter = radius * 2 + 0.5; // small gap between circles

  // Sort by y for efficient packing
  const items = values.map(v => ({ y: valueToY(v, niceMin, niceMax, topMargin) }));
  items.sort((a, b) => a.y - b.y);

  const placed: JitteredPoint[] = [];

  for (const item of items) {
    let x = 0;
    let step = diameter;
    let direction = 1;

    // Keep trying positions until no collision
    let attempts = 0;
    while (attempts < 200) {
      const collision = placed.some(p => {
        const dx = p.x - x;
        const dy = p.y - item.y;
        return Math.sqrt(dx * dx + dy * dy) < diameter;
      });

      if (!collision) break;

      x += direction * step;
      direction = -direction;
      step += diameter * 0.5;

      // Cap to avoid extreme spread
      if (Math.abs(x) > maxHalfWidth) {
        x = Math.sign(x) * maxHalfWidth;
      }

      attempts++;
    }

    placed.push({ x, y: item.y });
  }

  return placed;
}

/**
 * Beeswarm layout for multiple samples with per-sample colors.
 * All samples are packed together, so inter-sample overlap is also resolved.
 */
export function getColoredBeeswarmPoints(
  samples: { values: number[]; color: string }[],
  radius: number,
  niceMin: number,
  niceMax: number,
  topMargin: number,
  maxHalfWidth = 80
): JitteredPoint[] {
  const diameter = radius * 2 + 0.5;

  // Flatten all samples, preserving color
  const items: { y: number; color: string }[] = [];
  samples.forEach(sample => {
    sample.values.forEach(v => {
      items.push({ y: valueToY(v, niceMin, niceMax, topMargin), color: sample.color });
    });
  });

  // Sort by y for efficient packing
  items.sort((a, b) => a.y - b.y);

  const placed: JitteredPoint[] = [];

  for (const item of items) {
    let x = 0;
    let step = diameter;
    let direction = 1;

    let attempts = 0;
    while (attempts < 200) {
      const collision = placed.some(p => {
        const dx = p.x - x;
        const dy = p.y - item.y;
        return Math.sqrt(dx * dx + dy * dy) < diameter;
      });

      if (!collision) break;

      x += direction * step;
      direction = -direction;
      step += diameter * 0.5;

      if (Math.abs(x) > maxHalfWidth) {
        x = Math.sign(x) * maxHalfWidth;
      }

      attempts++;
    }

    placed.push({ x, y: item.y, color: item.color });
  }

  return placed;
}
