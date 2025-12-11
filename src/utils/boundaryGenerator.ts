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

// Generate a smooth rounded boundary by creating circles around each hull vertex
// and computing their outer tangent envelope
function createRoundedEnvelope(hullPoints: ZonePoint[], radius: number): ZonePoint[] {
  if (hullPoints.length < 3 || radius <= 0) return hullPoints;
  
  const n = hullPoints.length;
  const result: ZonePoint[] = [];
  const arcSegments = 16; // Segments per arc for smoothness
  
  for (let i = 0; i < n; i++) {
    const curr = hullPoints[i];
    const prev = hullPoints[(i - 1 + n) % n];
    const next = hullPoints[(i + 1) % n];
    
    // Direction from prev to curr
    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const len1 = Math.hypot(d1x, d1y);
    
    // Direction from curr to next
    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const len2 = Math.hypot(d2x, d2y);
    
    if (len1 === 0 || len2 === 0) continue;
    
    // Outward normals (perpendicular, pointing outside the hull)
    // For CCW hull, outward is to the right of direction
    const n1x = d1y / len1;
    const n1y = -d1x / len1;
    const n2x = d2y / len2;
    const n2y = -d2x / len2;
    
    // Angles of the outward normals
    const angle1 = Math.atan2(n1y, n1x);
    const angle2 = Math.atan2(n2y, n2x);
    
    // Generate arc from angle1 to angle2 going the short way around
    let startAngle = angle1;
    let endAngle = angle2;
    
    // Normalize angles - we want to go in the direction that covers the outside
    let diff = endAngle - startAngle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    
    // If diff is negative, we're going clockwise (correct for convex corners)
    const numSegs = Math.max(4, Math.ceil(Math.abs(diff) / (Math.PI / arcSegments)));
    
    for (let j = 0; j <= numSegs; j++) {
      const t = j / numSegs;
      const angle = startAngle + t * diff;
      result.push({
        x: curr.x + radius * Math.cos(angle),
        y: curr.y + radius * Math.sin(angle),
      });
    }
  }
  
  return result;
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
