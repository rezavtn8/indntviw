/**
 * Box/Violin Plot Layout Constants and Helpers
 */

// Plot area dimensions
export const BOX_WIDTH = 40;
export const GROUP_WIDTH = 100;
export const LEFT_PADDING = 70;
export const RIGHT_PADDING = 60;
export const PLOT_HEIGHT = 200;
export const LABEL_AREA_HEIGHT = 80;
export const BASE_TOP_MARGIN = 20;

// Bracket layout
export const BRACKET_ROW_HEIGHT = 24;
export const BRACKET_TOP_PADDING = 16;

// B&W patterns for grayscale printing
export const BW_STYLES = [
  { fill: '#000000', fillOpacity: 0.1, stroke: '#000000', pattern: 'none' as const },
  { fill: '#000000', fillOpacity: 0.3, stroke: '#000000', pattern: 'none' as const },
  { fill: '#000000', fillOpacity: 0.5, stroke: '#000000', pattern: 'none' as const },
  { fill: '#ffffff', fillOpacity: 1, stroke: '#000000', pattern: 'stripe' as const },
  { fill: '#ffffff', fillOpacity: 1, stroke: '#000000', pattern: 'dots' as const },
  { fill: '#000000', fillOpacity: 0.7, stroke: '#000000', pattern: 'none' as const },
];

export type BWPattern = 'none' | 'stripe' | 'dots';

export interface BWStyle {
  fill: string;
  fillOpacity: number;
  stroke: string;
  pattern: BWPattern;
}

/**
 * Get B&W style for a given group index
 */
export function getBWStyle(idx: number): BWStyle {
  return BW_STYLES[idx % BW_STYLES.length];
}

/**
 * Get p-value significance asterisks
 */
export function getPValueAsterisks(pValue: number): string {
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';
  return 'ns';
}

/**
 * Calculate x-center for a group at given index
 */
export function getCenterX(idx: number): number {
  return LEFT_PADDING + idx * GROUP_WIDTH + GROUP_WIDTH / 2;
}

/**
 * Calculate SVG width based on number of groups
 */
export function calculateSvgWidth(groupCount: number): number {
  return Math.max(450, groupCount * GROUP_WIDTH + LEFT_PADDING + RIGHT_PADDING);
}

/**
 * Calculate bracket area height based on number of comparisons
 */
export function calculateBracketAreaHeight(comparisonsCount: number, showBrackets: boolean): number {
  if (!showBrackets || comparisonsCount === 0) return 0;
  return comparisonsCount * BRACKET_ROW_HEIGHT + BRACKET_TOP_PADDING;
}

/**
 * Calculate nice axis boundaries and ticks for data range
 */
export function calculateNiceAxisBounds(values: number[]): { niceMin: number; niceMax: number; niceTicks: number[] } {
  if (values.length === 0) {
    return { niceMin: 0, niceMax: 100, niceTicks: [0, 25, 50, 75, 100] };
  }
  
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = (rawMax - rawMin) * 0.15;
  const paddedMin = rawMin - padding;
  const paddedMax = rawMax + padding;
  
  // Calculate nice step
  const range = paddedMax - paddedMin;
  const targetCount = 5;
  const roughStep = range / (targetCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  
  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;
  
  // Round min DOWN and max UP to nice values
  const niceMin = Math.floor(paddedMin / niceStep) * niceStep;
  const niceMax = Math.ceil(paddedMax / niceStep) * niceStep;
  
  // Generate ticks
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + niceStep * 0.001; v += niceStep) {
    ticks.push(Math.round(v / niceStep) * niceStep);
  }
  
  return { 
    niceMin, 
    niceMax, 
    niceTicks: ticks.length > 0 ? ticks : [niceMin, niceMax] 
  };
}

/**
 * Convert a data value to Y coordinate
 */
export function valueToY(value: number, niceMin: number, niceMax: number, topMargin: number): number {
  const niceRange = niceMax - niceMin;
  return topMargin + ((niceMax - value) / niceRange) * PLOT_HEIGHT;
}

/**
 * Format axis tick value for display
 */
export function formatValue(val: number): string {
  const absVal = Math.abs(val);
  if (absVal >= 1000) return val.toFixed(0);
  if (absVal >= 100) return val.toFixed(1);
  if (absVal >= 10) return val.toFixed(1);
  if (absVal >= 1) return val.toFixed(2);
  if (absVal >= 0.01) return val.toFixed(3);
  return val.toExponential(1);
}
