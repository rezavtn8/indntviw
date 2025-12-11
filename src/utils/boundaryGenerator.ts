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

// PHASE 1: Bulletproof radius calculation
// pointRadius is the VISUAL radius of points - we MUST exceed this
function getMinimumSafeRadius(memberPoints: ZonePoint[], pointRadius: number): number {
  // The boundary must be at least pointRadius away from each point center
  // Add 20% safety margin to guarantee no point ever touches the edge
  const safetyMargin = 1.2;
  
  if (pointRadius > 0) {
    return pointRadius * safetyMargin;
  }
  
  // Fallback: estimate based on point spacing if no radius given
  if (memberPoints.length < 2) return 0.5;
  
  // Find minimum distance between any two points
  let minDist = Infinity;
  const sampleSize = Math.min(memberPoints.length, 20);
  const step = Math.max(1, Math.floor(memberPoints.length / sampleSize));
  
  for (let i = 0; i < memberPoints.length; i += step) {
    for (let j = i + 1; j < memberPoints.length; j++) {
      const dist = Math.hypot(memberPoints[i].x - memberPoints[j].x, memberPoints[i].y - memberPoints[j].y);
      if (dist > 0 && dist < minDist) minDist = dist;
    }
  }
  
  // Use half the minimum spacing as radius estimate, with safety margin
  return minDist !== Infinity ? (minDist * 0.5 * safetyMargin) : 0.5;
}

// FOOLPROOF approach: Generate circles around EVERY member point (not just hull)
// This guarantees ALL points are fully inside with their visual radius
function createRoundedEnvelope(memberPoints: ZonePoint[], radius: number): ZonePoint[] {
  if (memberPoints.length === 0) return [];
  if (radius <= 0) return computeConvexHull(memberPoints);
  
  const circlePoints: ZonePoint[] = [];
  const pointsPerCircle = 24; // More points = smoother boundary
  
  // Generate circle points around EVERY member point
  // This ensures every single point is fully enclosed
  for (const p of memberPoints) {
    for (let i = 0; i < pointsPerCircle; i++) {
      const angle = (i / pointsPerCircle) * Math.PI * 2;
      circlePoints.push({
        x: p.x + radius * Math.cos(angle),
        y: p.y + radius * Math.sin(angle),
      });
    }
  }
  
  // Convex hull of all circle points = guaranteed envelope
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

  // PHASE 1: Calculate bulletproof radius
  const baseRadius = getMinimumSafeRadius(memberPoints, pointRadius);
  const extraPadding = baseRadius * padding;
  const totalRadius = baseRadius + extraPadding;

  // Single point: simple circle
  if (memberPoints.length === 1) {
    const cx = memberPoints[0].x;
    const cy = memberPoints[0].y;
    const numPoints = 32;
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
    const arcSegs = 16;
    
    // Arc around p1
    const baseAngle1 = Math.atan2(dy, dx) + Math.PI;
    for (let i = 0; i <= arcSegs; i++) {
      const angle = baseAngle1 - Math.PI / 2 + (i / arcSegs) * Math.PI;
      capsule.push({
        x: p1.x + totalRadius * Math.cos(angle),
        y: p1.y + totalRadius * Math.sin(angle),
      });
    }
    
    // Arc around p2
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

  // 3+ points: Create envelope around ALL member points (not just hull)
  // This guarantees every single point is fully inside
  return createRoundedEnvelope(memberPoints, totalRadius);
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
