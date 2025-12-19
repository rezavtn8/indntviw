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

// Detect separate clusters of points using distance-based clustering
function findClusters(points: ZonePoint[], maxDistance: number): ZonePoint[][] {
  if (points.length === 0) return [];
  if (points.length === 1) return [[points[0]]];
  
  const visited = new Set<number>();
  const clusters: ZonePoint[][] = [];
  
  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;
    
    const cluster: ZonePoint[] = [];
    const queue = [i];
    
    while (queue.length > 0) {
      const idx = queue.shift()!;
      if (visited.has(idx)) continue;
      visited.add(idx);
      cluster.push(points[idx]);
      
      // Find all neighbors within maxDistance
      for (let j = 0; j < points.length; j++) {
        if (visited.has(j)) continue;
        const dist = Math.hypot(points[idx].x - points[j].x, points[idx].y - points[j].y);
        if (dist <= maxDistance) {
          queue.push(j);
        }
      }
    }
    
    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

// Calculate typical point spacing in data
function getTypicalSpacing(points: ZonePoint[]): number {
  if (points.length < 2) return 1;
  
  // Sample distances between nearby points
  const distances: number[] = [];
  const sampleSize = Math.min(points.length, 30);
  const step = Math.max(1, Math.floor(points.length / sampleSize));
  
  for (let i = 0; i < points.length; i += step) {
    let minDist = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (dist > 0 && dist < minDist) minDist = dist;
    }
    if (minDist !== Infinity) distances.push(minDist);
  }
  
  if (distances.length === 0) return 1;
  
  // Return median distance
  distances.sort((a, b) => a - b);
  return distances[Math.floor(distances.length / 2)];
}

// PHASE 1: Tight radius calculation for non-overlapping zones
// pointRadius is the VISUAL radius of points - boundary should just enclose this
function getMinimumSafeRadius(memberPoints: ZonePoint[], pointRadius: number): number {
  // Use exactly the point radius with minimal margin (5%) to keep zones tight
  const safetyMargin = 1.05;
  
  if (pointRadius > 0) {
    return pointRadius * safetyMargin;
  }
  
  // Fallback: estimate based on point spacing if no radius given
  if (memberPoints.length < 2) return 0.3;
  
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
  
  // Use 40% of minimum spacing as radius - tight fit to avoid overlaps
  return minDist !== Infinity ? (minDist * 0.4 * safetyMargin) : 0.3;
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

// Generate boundary for a single cluster
function generateClusterBoundary(
  clusterPoints: ZonePoint[],
  totalRadius: number
): ZonePoint[] {
  // Single point: simple circle
  if (clusterPoints.length === 1) {
    const cx = clusterPoints[0].x;
    const cy = clusterPoints[0].y;
    const numPoints = 32;
    return Array.from({ length: numPoints }, (_, i) => ({
      x: cx + totalRadius * Math.cos((i / numPoints) * Math.PI * 2),
      y: cy + totalRadius * Math.sin((i / numPoints) * Math.PI * 2),
    }));
  }

  // Two points: capsule shape
  if (clusterPoints.length === 2) {
    const [p1, p2] = clusterPoints;
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

  // 3+ points: Create envelope around cluster points
  return createRoundedEnvelope(clusterPoints, totalRadius);
}

// Main function: Generate smooth boundary from member points
// Returns array of boundaries (one per cluster)
export function generateZoneBoundary(
  memberPoints: ZonePoint[],
  padding: number = 0.05,       // Extra padding factor (0-1) - reduced for tighter fit
  smoothness: number = 0.5,    // Not used currently, kept for API compatibility
  boundaryType: 'convex' | 'concave' = 'convex',
  pointRadius: number = 0      // Visual radius of points in data units
): ZonePoint[] {
  if (memberPoints.length === 0) return [];

  // PHASE 1: Calculate tight radius for non-overlapping zones
  const baseRadius = getMinimumSafeRadius(memberPoints, pointRadius);
  // Reduce extra padding to keep boundaries close to dots
  const extraPadding = baseRadius * Math.min(padding, 0.1);
  const totalRadius = baseRadius + extraPadding;

  // For backward compatibility, return single boundary
  // Use generateZoneBoundaries for multiple cluster support
  return generateClusterBoundary(memberPoints, totalRadius);
}

// NEW: Generate boundaries for all clusters separately
export function generateZoneBoundaries(
  memberPoints: ZonePoint[],
  padding: number = 0.05,
  smoothness: number = 0.5,
  boundaryType: 'convex' | 'concave' = 'convex',
  pointRadius: number = 0
): ZonePoint[][] {
  if (memberPoints.length === 0) return [];

  // Calculate radius
  const baseRadius = getMinimumSafeRadius(memberPoints, pointRadius);
  const extraPadding = baseRadius * Math.min(padding, 0.1);
  const totalRadius = baseRadius + extraPadding;

  // Detect clusters - points are in same cluster if within 2x typical spacing
  const typicalSpacing = getTypicalSpacing(memberPoints);
  const clusterDistance = typicalSpacing * 2.5; // Points within 2.5x spacing are clustered
  
  const clusters = findClusters(memberPoints, clusterDistance);
  
  // Generate boundary for each cluster
  return clusters.map(cluster => generateClusterBoundary(cluster, totalRadius));
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

// NEW: Generate SVG path for multiple boundaries
export function boundariesToSVGPath(
  boundaries: ZonePoint[][],
  transformPoint?: (x: number, y: number) => { cx: number; cy: number }
): string {
  return boundaries
    .map(boundary => boundaryToSVGPath(boundary, transformPoint))
    .join(' ');
}
