import { ZonePoint } from '@/types/zones';

// Cross product of vectors OA and OB where O is origin
function cross(O: ZonePoint, A: ZonePoint, B: ZonePoint): number {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

// Convex hull using Andrew's monotone chain algorithm
export function computeConvexHull(points: ZonePoint[]): ZonePoint[] {
  if (points.length < 3) return [...points];

  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  const lower: ZonePoint[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: ZonePoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

// Calculate average nearest neighbor distance
function getAverageSpacing(points: ZonePoint[]): number {
  if (points.length < 2) return 0.5;
  
  const sampleSize = Math.min(points.length, 30);
  const step = Math.max(1, Math.floor(points.length / sampleSize));
  
  let totalMinDist = 0;
  let count = 0;
  
  for (let i = 0; i < points.length; i += step) {
    const p = points[i];
    let minDist = Infinity;
    for (const other of points) {
      if (p === other) continue;
      const dist = Math.hypot(p.x - other.x, p.y - other.y);
      if (dist < minDist && dist > 0) minDist = dist;
    }
    if (minDist !== Infinity) {
      totalMinDist += minDist;
      count++;
    }
  }
  
  return count > 0 ? totalMinDist / count : 0.5;
}

// FOOLPROOF approach: Generate circles around each hull point, 
// then compute convex hull of all circle points - guarantees all points inside
function createRoundedEnvelope(hullPoints: ZonePoint[], radius: number): ZonePoint[] {
  if (hullPoints.length < 3 || radius <= 0) return hullPoints;
  
  const circlePoints: ZonePoint[] = [];
  const pointsPerCircle = 16; // Points around each hull vertex
  
  // Generate circle points around each hull vertex
  for (const p of hullPoints) {
    for (let i = 0; i < pointsPerCircle; i++) {
      const angle = (i / pointsPerCircle) * Math.PI * 2;
      circlePoints.push({
        x: p.x + radius * Math.cos(angle),
        y: p.y + radius * Math.sin(angle),
      });
    }
  }
  
  // Compute convex hull of all circle points - this is the outer envelope
  return computeConvexHull(circlePoints);
}

// Main function: Generate smooth boundary from member points
export function generateZoneBoundary(
  memberPoints: ZonePoint[],
  padding: number = 0.1,       // Extra padding factor (0-1)
  smoothness: number = 0.5,    // Not used currently, kept for API compatibility
  boundaryType: 'convex' | 'concave' = 'convex',
  pointRadius: number = 0      // Visual radius of points in data units
): ZonePoint[] {
  if (memberPoints.length === 0) return [];

  // Calculate base radius for the envelope
  const avgSpacing = getAverageSpacing(memberPoints);
  const baseRadius = pointRadius > 0 ? pointRadius : avgSpacing * 0.4;
  const extraPadding = baseRadius * padding;
  const totalRadius = baseRadius + extraPadding;

  // Single point: simple circle
  if (memberPoints.length === 1) {
    const cx = memberPoints[0].x;
    const cy = memberPoints[0].y;
    const numPoints = 24;
    return Array.from({ length: numPoints }, (_, i) => ({
      x: cx + totalRadius * Math.cos((i / numPoints) * Math.PI * 2),
      y: cy + totalRadius * Math.sin((i / numPoints) * Math.PI * 2),
    }));
  }

  // Two points: capsule shape
  if (memberPoints.length === 2) {
    const [p1, p2] = memberPoints;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dx = (p2.x - p1.x) / (dist || 1);
    const dy = (p2.y - p1.y) / (dist || 1);
    
    const capsule: ZonePoint[] = [];
    const arcSegs = 12;
    
    // Arc around p1 (from -perpendicular around the back to +perpendicular)
    const baseAngle1 = Math.atan2(dy, dx) + Math.PI;
    for (let i = 0; i <= arcSegs; i++) {
      const angle = baseAngle1 - Math.PI / 2 + (i / arcSegs) * Math.PI;
      capsule.push({
        x: p1.x + totalRadius * Math.cos(angle),
        y: p1.y + totalRadius * Math.sin(angle),
      });
    }
    
    // Arc around p2 (from -perpendicular around the front to +perpendicular)
    const baseAngle2 = Math.atan2(dy, dx);
    for (let i = 0; i <= arcSegs; i++) {
      const angle = baseAngle2 - Math.PI / 2 + (i / arcSegs) * Math.PI;
      capsule.push({
        x: p2.x + totalRadius * Math.cos(angle),
        y: p2.y + totalRadius * Math.sin(angle),
      });
    }
    
    return capsule;
  }

  // 3+ points: convex hull with rounded envelope
  const hull = computeConvexHull(memberPoints);
  
  if (hull.length < 3) {
    // Fallback for degenerate cases
    return hull;
  }

  // Create smooth rounded envelope around the hull
  return createRoundedEnvelope(hull, totalRadius);
}

// Generate SVG path from boundary points
export function boundaryToSVGPath(
  points: ZonePoint[],
  transformPoint?: (x: number, y: number) => { cx: number; cy: number }
): string {
  if (points.length < 3) return '';

  const transformed = transformPoint
    ? points.map(p => {
        const t = transformPoint(p.x, p.y);
        return { x: t.cx, y: t.cy };
      })
    : points;

  let path = `M ${transformed[0].x.toFixed(2)} ${transformed[0].y.toFixed(2)}`;
  
  for (let i = 1; i < transformed.length; i++) {
    path += ` L ${transformed[i].x.toFixed(2)} ${transformed[i].y.toFixed(2)}`;
  }
  
  path += ' Z';
  return path;
}
