import { ZonePoint } from '@/types/zones';
import Delaunator from 'delaunator';

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

// Concave hull using alpha shape algorithm with Delaunay triangulation
function computeConcaveHull(points: ZonePoint[], alpha: number): ZonePoint[] {
  if (points.length < 3) return [...points];
  if (points.length === 3) return [...points];

  // Create flat coords array for Delaunator
  const coords: number[] = [];
  for (const p of points) {
    coords.push(p.x, p.y);
  }

  // Compute Delaunay triangulation
  const delaunay = new Delaunator(coords);
  const triangles = delaunay.triangles;

  // Build edge map: edge -> list of triangle indices that contain it
  const edgeToTriangles = new Map<string, number[]>();
  
  const makeEdgeKey = (i: number, j: number) => {
    const min = Math.min(i, j);
    const max = Math.max(i, j);
    return `${min}-${max}`;
  };

  const getEdgeLength = (i: number, j: number) => {
    return Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
  };

  // Process each triangle
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t];
    const b = triangles[t + 1];
    const c = triangles[t + 2];
    
    // Get edge lengths
    const lenAB = getEdgeLength(a, b);
    const lenBC = getEdgeLength(b, c);
    const lenCA = getEdgeLength(c, a);
    
    // Skip triangles with any edge longer than alpha (alpha filtering)
    const maxEdge = Math.max(lenAB, lenBC, lenCA);
    if (maxEdge > alpha) continue;
    
    // Add edges to map
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = makeEdgeKey(i, j);
      if (!edgeToTriangles.has(key)) {
        edgeToTriangles.set(key, []);
      }
      edgeToTriangles.get(key)!.push(t);
    }
  }

  // Boundary edges are those that belong to exactly one triangle
  const boundaryEdges: [number, number][] = [];
  for (const [key, tris] of edgeToTriangles.entries()) {
    if (tris.length === 1) {
      const [a, b] = key.split('-').map(Number);
      boundaryEdges.push([a, b]);
    }
  }

  if (boundaryEdges.length === 0) {
    // Fallback to convex hull if no boundary found
    return computeConvexHull(points);
  }

  // Order boundary edges to form a closed polygon
  const orderedPoints: ZonePoint[] = [];
  const usedEdges = new Set<number>();
  
  // Start with first edge
  let currentEdge = boundaryEdges[0];
  usedEdges.add(0);
  orderedPoints.push(points[currentEdge[0]]);
  let currentVertex = currentEdge[1];

  while (orderedPoints.length < boundaryEdges.length) {
    orderedPoints.push(points[currentVertex]);
    
    // Find next edge that shares currentVertex
    let found = false;
    for (let i = 0; i < boundaryEdges.length; i++) {
      if (usedEdges.has(i)) continue;
      
      const [a, b] = boundaryEdges[i];
      if (a === currentVertex) {
        usedEdges.add(i);
        currentVertex = b;
        found = true;
        break;
      } else if (b === currentVertex) {
        usedEdges.add(i);
        currentVertex = a;
        found = true;
        break;
      }
    }
    
    if (!found) break; // No more connected edges
  }

  return orderedPoints.length >= 3 ? orderedPoints : computeConvexHull(points);
}

// PHASE 1: Tight radius calculation for non-overlapping zones
function getMinimumSafeRadius(memberPoints: ZonePoint[], pointRadius: number): number {
  const safetyMargin = 1.05;
  
  if (pointRadius > 0) {
    return pointRadius * safetyMargin;
  }
  
  if (memberPoints.length < 2) return 0.3;
  
  let minDist = Infinity;
  const sampleSize = Math.min(memberPoints.length, 20);
  const step = Math.max(1, Math.floor(memberPoints.length / sampleSize));
  
  for (let i = 0; i < memberPoints.length; i += step) {
    for (let j = i + 1; j < memberPoints.length; j++) {
      const dist = Math.hypot(memberPoints[i].x - memberPoints[j].x, memberPoints[i].y - memberPoints[j].y);
      if (dist > 0 && dist < minDist) minDist = dist;
    }
  }
  
  return minDist !== Infinity ? (minDist * 0.4 * safetyMargin) : 0.3;
}

// Calculate alpha parameter based on point spacing
function calculateAlpha(memberPoints: ZonePoint[], radius: number): number {
  if (memberPoints.length < 2) return radius * 4;
  
  // Find average nearest neighbor distance
  let totalMinDist = 0;
  let count = 0;
  
  for (let i = 0; i < memberPoints.length; i++) {
    let minDist = Infinity;
    for (let j = 0; j < memberPoints.length; j++) {
      if (i === j) continue;
      const dist = Math.hypot(memberPoints[i].x - memberPoints[j].x, memberPoints[i].y - memberPoints[j].y);
      if (dist < minDist) minDist = dist;
    }
    if (minDist !== Infinity) {
      totalMinDist += minDist;
      count++;
    }
  }
  
  const avgNearestDist = count > 0 ? totalMinDist / count : radius * 2;
  
  // Alpha should be slightly larger than typical spacing to keep connected components
  // but small enough to create indentations for gaps
  return Math.max(avgNearestDist * 2.5, radius * 3);
}

// Create envelope around member points using concave or convex hull
function createRoundedEnvelope(
  memberPoints: ZonePoint[], 
  radius: number, 
  useConcave: boolean = true
): ZonePoint[] {
  if (memberPoints.length === 0) return [];
  if (radius <= 0) return computeConvexHull(memberPoints);
  
  const circlePoints: ZonePoint[] = [];
  const pointsPerCircle = 16; // Points per circle around each member
  
  // Generate circle points around each member point
  for (const p of memberPoints) {
    for (let i = 0; i < pointsPerCircle; i++) {
      const angle = (i / pointsPerCircle) * Math.PI * 2;
      circlePoints.push({
        x: p.x + radius * Math.cos(angle),
        y: p.y + radius * Math.sin(angle),
      });
    }
  }
  
  if (useConcave && memberPoints.length >= 3) {
    // Calculate alpha based on typical spacing between member points
    const alpha = calculateAlpha(memberPoints, radius);
    const concaveResult = computeConcaveHull(circlePoints, alpha);
    
    // Verify result is valid, fallback to convex if not
    if (concaveResult.length >= 3) {
      return concaveResult;
    }
  }
  
  return computeConvexHull(circlePoints);
}

// Main function: Generate smooth boundary from member points
export function generateZoneBoundary(
  memberPoints: ZonePoint[],
  padding: number = 0.05,
  smoothness: number = 0.5,
  boundaryType: 'convex' | 'concave' = 'concave', // Default to concave now
  pointRadius: number = 0
): ZonePoint[] {
  if (memberPoints.length === 0) return [];

  const baseRadius = getMinimumSafeRadius(memberPoints, pointRadius);
  const extraPadding = baseRadius * Math.min(padding, 0.1);
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
    
    const baseAngle1 = Math.atan2(dy, dx) + Math.PI;
    for (let i = 0; i <= arcSegs; i++) {
      const angle = baseAngle1 - Math.PI / 2 + (i / arcSegs) * Math.PI;
      capsule.push({
        x: p1.x + totalRadius * Math.cos(angle),
        y: p1.y + totalRadius * Math.sin(angle),
      });
    }
    
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

  // 3+ points: Use concave or convex based on boundaryType
  const useConcave = boundaryType === 'concave';
  return createRoundedEnvelope(memberPoints, totalRadius, useConcave);
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
