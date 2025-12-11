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

// Concave hull using simplified k-nearest approach
export function computeConcaveHull(points: ZonePoint[], k: number = 3): ZonePoint[] {
  if (points.length < 4) return computeConvexHull(points);

  const convexHull = computeConvexHull(points);
  if (convexHull.length < 3) return convexHull;

  const interiorPoints = points.filter(p => 
    !convexHull.some(hp => Math.abs(hp.x - p.x) < 0.0001 && Math.abs(hp.y - p.y) < 0.0001)
  );

  if (interiorPoints.length === 0) return convexHull;

  // Calculate average edge length for threshold
  let totalDist = 0;
  for (let i = 0; i < convexHull.length; i++) {
    const next = convexHull[(i + 1) % convexHull.length];
    totalDist += Math.hypot(convexHull[i].x - next.x, convexHull[i].y - next.y);
  }
  const avgEdge = totalDist / convexHull.length;

  const result: ZonePoint[] = [];
  for (let i = 0; i < convexHull.length; i++) {
    const p1 = convexHull[i];
    const p2 = convexHull[(i + 1) % convexHull.length];
    result.push(p1);

    const edgeLength = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    
    // Only refine edges significantly longer than average
    if (edgeLength > avgEdge * 1.3) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      let closest: ZonePoint | null = null;
      let closestDist = Infinity;

      for (const ip of interiorPoints) {
        const dist = Math.hypot(ip.x - midX, ip.y - midY);
        if (dist < edgeLength * 0.35 && dist < closestDist) {
          closestDist = dist;
          closest = ip;
        }
      }

      if (closest) {
        result.push(closest);
      }
    }
  }

  return result;
}

// Create rounded offset around a hull by adding arc segments around each vertex
export function expandHullWithRoundedCorners(points: ZonePoint[], padding: number): ZonePoint[] {
  if (points.length < 3 || padding <= 0) return points;

  const n = points.length;
  const result: ZonePoint[] = [];

  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];

    // Calculate edge vectors
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    // Calculate angles of incoming and outgoing edges
    const angle1 = Math.atan2(v1y, v1x);
    const angle2 = Math.atan2(v2y, v2x);

    // Outward normal angles (perpendicular, pointing outward for CCW)
    const normalAngle1 = angle1 - Math.PI / 2;
    const normalAngle2 = angle2 - Math.PI / 2;

    // Generate arc from normalAngle1 to normalAngle2 (going CCW around the vertex)
    let startAngle = normalAngle1;
    let endAngle = normalAngle2;

    // Ensure we go the short way around (CCW)
    while (endAngle < startAngle) {
      endAngle += Math.PI * 2;
    }
    if (endAngle - startAngle > Math.PI * 2) {
      endAngle -= Math.PI * 2;
    }

    // Number of segments for the arc (more for sharper corners)
    const arcSpan = endAngle - startAngle;
    const numSegments = Math.max(2, Math.ceil(Math.abs(arcSpan) / (Math.PI / 6)));

    for (let j = 0; j <= numSegments; j++) {
      const t = j / numSegments;
      const angle = startAngle + t * arcSpan;
      result.push({
        x: curr.x + padding * Math.cos(angle),
        y: curr.y + padding * Math.sin(angle),
      });
    }
  }

  return result;
}

// Expand hull using perpendicular offset (legacy, kept for compatibility)
export function expandHull(points: ZonePoint[], padding: number): ZonePoint[] {
  return expandHullWithRoundedCorners(points, padding);
}

// Catmull-Rom spline for smooth curves
export function catmullRomSpline(
  points: ZonePoint[],
  tension: number = 0.5,
  numSegments: number = 4
): ZonePoint[] {
  if (points.length < 3) return points;

  const result: ZonePoint[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    for (let t = 0; t < numSegments; t++) {
      const s = t / numSegments;
      const s2 = s * s;
      const s3 = s2 * s;

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

// Calculate bounding box
function getBoundingBox(points: ZonePoint[]): { width: number; height: number; diagonal: number } {
  if (points.length === 0) return { width: 0, height: 0, diagonal: 0 };
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  
  return { width, height, diagonal: Math.hypot(width, height) };
}

// Calculate average nearest neighbor distance
function getAverageSpacing(points: ZonePoint[]): number {
  if (points.length < 2) return 0.5;
  
  // Sample for performance on large datasets
  const sampleSize = Math.min(points.length, 50);
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

// Main function: Generate smooth boundary from member points
// pointRadius is the visual radius of each point (in data units) to wrap around
export function generateZoneBoundary(
  memberPoints: ZonePoint[],
  padding: number = 0.1,       // Extra padding beyond point radius (0-1)
  smoothness: number = 0.5,    // Smoothness factor (0-1)
  boundaryType: 'convex' | 'concave' = 'convex',
  pointRadius: number = 0      // Visual radius of points in data units
): ZonePoint[] {
  if (memberPoints.length === 0) return [];

  // Get average spacing between points
  const avgSpacing = getAverageSpacing(memberPoints);
  
  // Base padding is the point radius (to wrap around the dot's edge)
  // Plus a small extra based on the padding parameter
  const basePadding = pointRadius > 0 ? pointRadius : avgSpacing * 0.35;
  const extraPadding = avgSpacing * padding * 0.3; // Small extra padding
  const totalPadding = basePadding + extraPadding;

  // Single point: circle around the point
  if (memberPoints.length === 1) {
    const cx = memberPoints[0].x;
    const cy = memberPoints[0].y;
    return Array.from({ length: 12 }, (_, i) => ({
      x: cx + totalPadding * Math.cos((i / 12) * Math.PI * 2),
      y: cy + totalPadding * Math.sin((i / 12) * Math.PI * 2),
    }));
  }

  // Two points: capsule shape
  if (memberPoints.length === 2) {
    const [p1, p2] = memberPoints;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dx = (p2.x - p1.x) / (dist || 1);
    const dy = (p2.y - p1.y) / (dist || 1);
    const nx = -dy;
    const ny = dx;

    const capsule: ZonePoint[] = [];
    capsule.push({ x: p1.x + nx * totalPadding, y: p1.y + ny * totalPadding });
    capsule.push({ x: p2.x + nx * totalPadding, y: p2.y + ny * totalPadding });
    for (let i = 0; i <= 6; i++) {
      const angle = Math.atan2(dy, dx) - Math.PI / 2 + (i / 6) * Math.PI;
      capsule.push({ x: p2.x + totalPadding * Math.cos(angle), y: p2.y + totalPadding * Math.sin(angle) });
    }
    capsule.push({ x: p2.x - nx * totalPadding, y: p2.y - ny * totalPadding });
    capsule.push({ x: p1.x - nx * totalPadding, y: p1.y - ny * totalPadding });
    for (let i = 0; i <= 6; i++) {
      const angle = Math.atan2(dy, dx) + Math.PI / 2 + (i / 6) * Math.PI;
      capsule.push({ x: p1.x + totalPadding * Math.cos(angle), y: p1.y + totalPadding * Math.sin(angle) });
    }
    return capsule;
  }

  // Compute hull
  let hull = boundaryType === 'concave'
    ? computeConcaveHull(memberPoints)
    : computeConvexHull(memberPoints);

  if (hull.length < 3) return hull;

  // Apply perpendicular padding (wraps around the dot circumference)
  hull = expandHull(hull, totalPadding);

  // Apply smoothing
  if (smoothness > 0 && hull.length >= 3) {
    const tension = 1 - smoothness * 0.5; // 0.5 to 1.0
    const segments = Math.max(2, Math.round(2 + smoothness * 2)); // 2-4 segments
    hull = catmullRomSpline(hull, tension, segments);
  }

  return hull;
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
