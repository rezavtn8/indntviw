import { IndentationPoint } from '@/types/indentation';

export interface ExtendedStatistics {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  percentile25: number;
  percentile75: number;
}

export const calculateExtendedStatistics = (
  points: IndentationPoint[],
  property: string
): ExtendedStatistics => {
  if (points.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      percentile25: 0,
      percentile75: 0,
    };
  }

  const values = points
    .map(p => p.properties[property])
    .filter(v => v !== undefined && !isNaN(v))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return {
      count: points.length,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      percentile25: 0,
      percentile75: 0,
    };
  }

  const min = values[0];
  const max = values[values.length - 1];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const getPercentile = (arr: number[], p: number) => {
    const index = (p / 100) * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return arr[lower];
    return arr[lower] + (arr[upper] - arr[lower]) * (index - lower);
  };

  return {
    count: points.length,
    min,
    max,
    mean,
    median: getPercentile(values, 50),
    stdDev,
    percentile25: getPercentile(values, 25),
    percentile75: getPercentile(values, 75),
  };
};

export const calculateCoordinateRanges = (points: IndentationPoint[]) => {
  if (points.length === 0) {
    return { xRange: [0, 0], yRange: [0, 0], zRange: [0, 0] };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const zs = points.map(p => p.z);

  return {
    xRange: [Math.min(...xs), Math.max(...xs)] as [number, number],
    yRange: [Math.min(...ys), Math.max(...ys)] as [number, number],
    zRange: [Math.min(...zs), Math.max(...zs)] as [number, number],
  };
};

// Point-in-polygon algorithm (ray casting)
export const isPointInPolygon = (
  point: { x: number; y: number },
  polygon: { x: number; y: number }[]
): boolean => {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
};
