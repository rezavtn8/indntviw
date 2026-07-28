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

// Extract boundary from a set of edges (edges that appear exactly once)
function extractBoundaryFromEdges(
  edges: Map<string, number>,
  points: ZonePoint[]
): ZonePoint[] {
  // Get edges that appear exactly once (boundary edges)
  const boundaryEdges: [number, number][] = [];
  for (const [key, count] of edges.entries()) {
    if (count === 1) {
      const [a, b] = key.split('-').map(Number);
      boundaryEdges.push([a, b]);
    }
  }

  if (boundaryEdges.length === 0) return [];

  // Order boundary edges to form a closed polygon
  const orderedPoints: ZonePoint[] = [];
  const usedEdges = new Set<number>();

  const currentEdge = boundaryEdges[0];
  usedEdges.add(0);
  orderedPoints.push(points[currentEdge[0]]);
  let currentVertex = currentEdge[1];

  while (orderedPoints.length < boundaryEdges.length) {
    orderedPoints.push(points[currentVertex]);

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

    if (!found) break;
  }

  return orderedPoints;
}

// NEW: Compute boundary that explicitly avoids unselected points
// Uses Delaunay triangulation of ALL points, keeps only triangles where all vertices are selected
function computeBoundaryAvoidingPoints(
  allPoints: ZonePoint[],
  selectedIndices: Set<number>,
  padding: number
): ZonePoint[] {
  if (selectedIndices.size === 0) return [];
  if (allPoints.length < 3) {
    const selected = Array.from(selectedIndices).map(i => allPoints[i]);
    return computeConvexHull(selected);
  }

  // Create flat coords array for Delaunator
  const coords: number[] = [];
  for (const p of allPoints) {
    coords.push(p.x, p.y);
  }

  // Compute Delaunay triangulation of ALL points
  const delaunay = new Delaunator(coords);
  const triangles = delaunay.triangles;

  // Build edge count map for triangles where ALL vertices are selected
  const edgeCounts = new Map<string, number>();

  const makeEdgeKey = (i: number, j: number) => {
    const min = Math.min(i, j);
    const max = Math.max(i, j);
    return `${min}-${max}`;
  };

  // Process each triangle - only keep if all 3 vertices are selected
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t];
    const b = triangles[t + 1];
    const c = triangles[t + 2];

    // Check if all vertices are selected
    if (!selectedIndices.has(a) || !selectedIndices.has(b) || !selectedIndices.has(c)) {
      continue; // Skip triangles that touch unselected points
    }

    // Add edges of this valid triangle
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = makeEdgeKey(i, j);
      edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    }
  }

  // Extract boundary (edges that appear exactly once)
  const boundary = extractBoundaryFromEdges(edgeCounts, allPoints);

  if (boundary.length >= 3) {
    // Add padding around the boundary
    return addPaddingToBoundary(boundary, padding);
  }

  // Fallback: just use convex hull of selected points with padding
  const selected = Array.from(selectedIndices).map(i => allPoints[i]);
  const hull = computeConvexHull(selected);
  return addPaddingToBoundary(hull, padding);
}

// Add padding/offset to a boundary polygon
function addPaddingToBoundary(boundary: ZonePoint[], padding: number): ZonePoint[] {
  if (boundary.length < 3 || padding <= 0) return boundary;

  // Calculate centroid
  const cx = boundary.reduce((sum, p) => sum + p.x, 0) / boundary.length;
  const cy = boundary.reduce((sum, p) => sum + p.y, 0) / boundary.length;

  // Offset each point outward from centroid
  return boundary.map(p => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return p;
    
    const scale = (dist + padding) / dist;
    return {
      x: cx + dx * scale,
      y: cy + dy * scale,
    };
  });
}

// Simple concave hull using alpha shapes (for when we don't have all points)
function computeConcaveHull(points: ZonePoint[], alpha: number): ZonePoint[] {
  if (points.length < 3) return [...points];
  if (points.length === 3) return [...points];

  const coords: number[] = [];
  for (const p of points) {
    coords.push(p.x, p.y);
  }

  const delaunay = new Delaunator(coords);
  const triangles = delaunay.triangles;

  const edgeCounts = new Map<string, number>();

  const makeEdgeKey = (i: number, j: number) => {
    const min = Math.min(i, j);
    const max = Math.max(i, j);
    return `${min}-${max}`;
  };

  const getEdgeLength = (i: number, j: number) => {
    return Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
  };

  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t];
    const b = triangles[t + 1];
    const c = triangles[t + 2];

    const lenAB = getEdgeLength(a, b);
    const lenBC = getEdgeLength(b, c);
    const lenCA = getEdgeLength(c, a);

    const maxEdge = Math.max(lenAB, lenBC, lenCA);
    if (maxEdge > alpha) continue;

    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = makeEdgeKey(i, j);
      edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    }
  }

  const boundary = extractBoundaryFromEdges(edgeCounts, points);
  return boundary.length >= 3 ? boundary : computeConvexHull(points);
}

// Calculate point radius in data units
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

// Calculate alpha for concave hull
function calculateAlpha(memberPoints: ZonePoint[], radius: number): number {
  if (memberPoints.length < 2) return radius * 3;

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
  return Math.max(avgNearestDist * 1.5, radius * 2.5);
}

// Create envelope with circles around points
function createRoundedEnvelope(
  memberPoints: ZonePoint[],
  radius: number,
  useConcave: boolean = true
): ZonePoint[] {
  if (memberPoints.length === 0) return [];
  if (radius <= 0) return computeConvexHull(memberPoints);

  const circlePoints: ZonePoint[] = [];
  const pointsPerCircle = 16;

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
    const alpha = calculateAlpha(memberPoints, radius);
    const concaveResult = computeConcaveHull(circlePoints, alpha);
    if (concaveResult.length >= 3) {
      return concaveResult;
    }
  }

  return computeConvexHull(circlePoints);
}

// Main function: Generate smooth boundary from member points
// Now accepts optional allPoints to avoid unselected dots
export function generateZoneBoundary(
  memberPoints: ZonePoint[],
  padding: number = 0.05,
  smoothness: number = 0.5,
  boundaryType: 'convex' | 'concave' = 'concave',
  pointRadius: number = 0,
  allPoints?: ZonePoint[],           // All data points (selected + unselected)
  selectedPointIds?: Set<number>     // Which indices in allPoints are selected
): ZonePoint[] {
  if (memberPoints.length === 0) return [];

  const baseRadius = getMinimumSafeRadius(memberPoints, pointRadius);
  const extraPadding = baseRadius * Math.min(padding, 0.15);
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

  // 3+ points: Try to avoid unselected points if we have all the data
  if (boundaryType === 'concave' && allPoints && selectedPointIds && allPoints.length > memberPoints.length) {
    // Use the new algorithm that triangulates all points and excludes triangles touching unselected ones
    const boundary = computeBoundaryAvoidingPoints(allPoints, selectedPointIds, totalRadius);
    if (boundary.length >= 3) {
      return boundary;
    }
  }

  // Fallback: Use standard concave/convex envelope
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
