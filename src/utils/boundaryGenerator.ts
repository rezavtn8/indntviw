import { ZonePoint } from '@/types/zones';

// Cross product of vectors OA and OB where O is origin
function cross(O: ZonePoint, A: ZonePoint, B: ZonePoint): number {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

// Convex hull using Andrew's monotone chain algorithm
export function computeConvexHull(points: ZonePoint[]): ZonePoint[] {
  if (points.length < 3) return [...points];

  // Sort by x, then by y
  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  // Build lower hull
  const lower: ZonePoint[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper: ZonePoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

// Concave hull using k-nearest neighbors approach
export function computeConcaveHull(points: ZonePoint[], k: number = 3): ZonePoint[] {
  if (points.length < 3) return [...points];
  if (points.length <= k) return computeConvexHull(points);

  // Start with convex hull as fallback
  const convexHull = computeConvexHull(points);
  if (convexHull.length < 3) return convexHull;

  // For small point sets, convex hull is sufficient
  if (points.length <= 10) return convexHull;

  // Simple concave hull: refine convex hull by checking if interior points should be included
  // This is a simplified approach - for each edge, check if there's a point that should "indent" the hull
  const result: ZonePoint[] = [];
  const interiorPoints = points.filter(p => 
    !convexHull.some(hp => hp.x === p.x && hp.y === p.y)
  );

  if (interiorPoints.length === 0) return convexHull;

  for (let i = 0; i < convexHull.length; i++) {
    const p1 = convexHull[i];
    const p2 = convexHull[(i + 1) % convexHull.length];
    
    result.push(p1);
    
    // Find interior points near this edge
    const edgeMidX = (p1.x + p2.x) / 2;
    const edgeMidY = (p1.y + p2.y) / 2;
    const edgeLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    
    // Find closest interior point to edge midpoint
    let closestPoint: ZonePoint | null = null;
    let closestDist = Infinity;
    
    for (const ip of interiorPoints) {
      const dist = Math.sqrt((ip.x - edgeMidX) ** 2 + (ip.y - edgeMidY) ** 2);
      // Only consider points within half the edge length
      if (dist < edgeLength * 0.4 && dist < closestDist) {
        closestDist = dist;
        closestPoint = ip;
      }
    }
    
    if (closestPoint) {
      result.push(closestPoint);
    }
  }

  return result;
}

// Expand hull outward by padding amount
export function expandHull(points: ZonePoint[], padding: number): ZonePoint[] {
  if (points.length < 3 || padding <= 0) return points;

  // Calculate centroid
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  // Expand each point outward from centroid
  return points.map(p => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return p;
    
    const scale = (dist + padding) / dist;
    return { x: cx + dx * scale, y: cy + dy * scale };
  });
}

// Catmull-Rom spline interpolation for smooth curves
export function catmullRomSpline(
  points: ZonePoint[],
  tension: number = 0.5,
  numSegments: number = 8
): ZonePoint[] {
  if (points.length < 3) return points;

  const result: ZonePoint[] = [];
  const n = points.length;

  // For closed curve, wrap around
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    for (let t = 0; t < numSegments; t++) {
      const s = t / numSegments;
      const s2 = s * s;
      const s3 = s2 * s;

      // Catmull-Rom basis functions with tension
      const m = 1 - tension;
      const b0 = -m * s3 + 2 * m * s2 - m * s;
      const b1 = (2 - m) * s3 + (m - 3) * s2 + 1;
      const b2 = (m - 2) * s3 + (3 - 2 * m) * s2 + m * s;
      const b3 = m * s3 - m * s2;

      result.push({
        x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
        y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
      });
    }
  }

  return result;
}

// Main function: Generate smooth boundary from member points
export function generateZoneBoundary(
  memberPoints: ZonePoint[],
  padding: number = 0.5,
  smoothness: number = 0.5,
  boundaryType: 'convex' | 'concave' = 'convex'
): ZonePoint[] {
  if (memberPoints.length === 0) return [];
  if (memberPoints.length === 1) {
    // Single point: create a small circle
    const cx = memberPoints[0].x;
    const cy = memberPoints[0].y;
    const r = padding || 0.5;
    const circlePoints: ZonePoint[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      circlePoints.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
    return circlePoints;
  }
  if (memberPoints.length === 2) {
    // Two points: create a capsule/stadium shape
    const p1 = memberPoints[0];
    const p2 = memberPoints[1];
    const r = padding || 0.5;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len * r;
    const ny = dx / len * r;
    
    const capsule: ZonePoint[] = [];
    // First side
    capsule.push({ x: p1.x + nx, y: p1.y + ny });
    capsule.push({ x: p2.x + nx, y: p2.y + ny });
    // End cap
    for (let i = 0; i <= 8; i++) {
      const angle = Math.atan2(dy, dx) - Math.PI / 2 + (i / 8) * Math.PI;
      capsule.push({ x: p2.x + r * Math.cos(angle), y: p2.y + r * Math.sin(angle) });
    }
    // Second side
    capsule.push({ x: p2.x - nx, y: p2.y - ny });
    capsule.push({ x: p1.x - nx, y: p1.y - ny });
    // Start cap
    for (let i = 0; i <= 8; i++) {
      const angle = Math.atan2(dy, dx) + Math.PI / 2 + (i / 8) * Math.PI;
      capsule.push({ x: p1.x + r * Math.cos(angle), y: p1.y + r * Math.sin(angle) });
    }
    return capsule;
  }

  // 3+ points: compute hull, expand, smooth
  let hull = boundaryType === 'concave'
    ? computeConcaveHull(memberPoints)
    : computeConvexHull(memberPoints);

  // Apply padding
  if (padding > 0) {
    hull = expandHull(hull, padding);
  }

  // Apply smoothing based on smoothness parameter
  if (smoothness > 0 && hull.length >= 3) {
    const tension = 1 - smoothness; // Higher smoothness = lower tension = smoother
    const segments = Math.max(4, Math.round(8 * smoothness));
    hull = catmullRomSpline(hull, tension, segments);
  }

  return hull;
}

// Generate SVG path string from boundary points
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

  let path = `M ${transformed[0].x} ${transformed[0].y}`;
  for (let i = 1; i < transformed.length; i++) {
    path += ` L ${transformed[i].x} ${transformed[i].y}`;
  }
  path += ' Z';

  return path;
}
