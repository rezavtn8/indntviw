import { Zone, ZonePoint, ZoneStatistics, createDefaultZone } from '@/types/zones';
import { IndentationPoint } from '@/types/indentation';
import { isPointInPolygon } from './statisticsUtils';
import { generateZoneBoundary, boundaryToSVGPath } from './boundaryGenerator';

// Check if a data point is inside a zone
export function isPointInZone(point: IndentationPoint, zone: Zone): boolean {
  if (!zone.visible) return false;

  // For member-point-based zones, check if point ID is in memberPointIds
  const memberIds = zone.memberPointIds ?? [];
  if (memberIds.length > 0) {
    return memberIds.includes(point.id);
  }

  // Legacy: freeform path-based check
  if (zone.type === 'freeform' && zone.points.length >= 3) {
    return isPointInPolygon({ x: point.x, y: point.y }, zone.points);
  }

  if (zone.type === 'ellipse' && zone.centerX !== undefined && zone.centerY !== undefined) {
    const rx = zone.radiusX || 1;
    const ry = zone.radiusY || 1;
    const rotation = (zone.rotation || 0) * Math.PI / 180;
    
    // Translate point to ellipse center
    const dx = point.x - zone.centerX;
    const dy = point.y - zone.centerY;
    
    // Rotate point
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const rotX = dx * cos - dy * sin;
    const rotY = dx * sin + dy * cos;
    
    // Check if inside ellipse
    return (rotX * rotX) / (rx * rx) + (rotY * rotY) / (ry * ry) <= 1;
  }

  if (zone.type === 'rectangle' && zone.points.length >= 2) {
    const minX = Math.min(zone.points[0].x, zone.points[1].x);
    const maxX = Math.max(zone.points[0].x, zone.points[1].x);
    const minY = Math.min(zone.points[0].y, zone.points[1].y);
    const maxY = Math.max(zone.points[0].y, zone.points[1].y);
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }

  return false;
}

// Get all points inside a zone
export function getPointsInZone(points: IndentationPoint[], zone: Zone): IndentationPoint[] {
  return points.filter(p => isPointInZone(p, zone));
}

// Get member points from IDs
export function getMemberPoints(allPoints: IndentationPoint[], memberIds: number[]): IndentationPoint[] {
  return allPoints.filter(p => memberIds.includes(p.id));
}

// Calculate statistics for points in a zone
export function calculateZoneStatistics(
  points: IndentationPoint[],
  zone: Zone,
  property: string
): ZoneStatistics {
  const zonePoints = getPointsInZone(points, zone);
  const values = zonePoints
    .map(p => p.properties[property])
    .filter(v => v !== undefined && !isNaN(v));

  if (values.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, stdDev: 0 };
  }

  const count = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / count;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return { count, min, max, mean, stdDev };
}

// Calculate centroid of a zone for label placement
export function getZoneCentroid(zone: Zone): ZonePoint {
  if (zone.type === 'ellipse' && zone.centerX !== undefined && zone.centerY !== undefined) {
    return { x: zone.centerX, y: zone.centerY };
  }

  if (zone.type === 'rectangle' && zone.points.length >= 2) {
    return {
      x: (zone.points[0].x + zone.points[1].x) / 2,
      y: (zone.points[0].y + zone.points[1].y) / 2,
    };
  }

  if (zone.points.length === 0) {
    return { x: 0, y: 0 };
  }

  const sumX = zone.points.reduce((sum, p) => sum + p.x, 0);
  const sumY = zone.points.reduce((sum, p) => sum + p.y, 0);
  return {
    x: sumX / zone.points.length,
    y: sumY / zone.points.length,
  };
}

// Update zone boundary from member points
export function updateZoneBoundary(
  zone: Zone,
  allPoints: IndentationPoint[],
  pointRadius: number = 0  // Point radius in data units
): Zone {
  if (zone.memberPointIds.length === 0) {
    return zone;
  }

  const memberPoints = getMemberPoints(allPoints, zone.memberPointIds);
  const memberCoords: ZonePoint[] = memberPoints.map(p => ({ x: p.x, y: p.y }));

  const boundaryPoints = generateZoneBoundary(
    memberCoords,
    zone.boundaryPadding,
    zone.smoothness,
    zone.boundaryType,
    pointRadius
  );

  return {
    ...zone,
    points: boundaryPoints,
  };
}

// Create zone from selected point IDs
export function createZoneFromSelection(
  selectedIds: number[],
  allPoints: IndentationPoint[],
  zoneId: string,
  colorIndex: number,
  name?: string,
  pointRadius: number = 0
): Zone | null {
  // Validate we have points to create a zone
  if (selectedIds.length === 0) {
    return null;
  }

  const newZone = createDefaultZone(zoneId, colorIndex);
  newZone.memberPointIds = [...selectedIds];
  
  if (name) {
    newZone.name = name;
  }

  return updateZoneBoundary(newZone, allPoints, pointRadius);
}

// Generate SVG path for a zone
// IMPORTANT: This regenerates the smooth boundary from member points at render time
export function getZoneSVGPath(
  zone: Zone,
  transformPoint: (x: number, y: number) => { cx: number; cy: number },
  allPoints?: IndentationPoint[],
  pointRadius?: number
): string {
  // If we have member points and allPoints, regenerate boundary from member points
  if (zone.memberPointIds.length > 0 && allPoints && allPoints.length > 0) {
    const memberPoints = getMemberPoints(allPoints, zone.memberPointIds);
    if (memberPoints.length > 0) {
      const memberCoords: ZonePoint[] = memberPoints.map(p => ({ x: p.x, y: p.y }));
      const boundaryPoints = generateZoneBoundary(
        memberCoords,
        zone.boundaryPadding,
        zone.smoothness,
        zone.boundaryType,
        pointRadius || 0
      );
      
      if (boundaryPoints.length >= 3) {
        return boundaryToSVGPath(boundaryPoints, transformPoint);
      }
    }
  }

  // Fallback: use stored zone.points
  if (zone.points.length >= 3) {
    return boundaryToSVGPath(zone.points, transformPoint);
  }

  if (zone.type === 'rectangle' && zone.points.length >= 2) {
    const p1 = transformPoint(zone.points[0].x, zone.points[0].y);
    const p2 = transformPoint(zone.points[1].x, zone.points[1].y);
    const minX = Math.min(p1.cx, p2.cx);
    const maxX = Math.max(p1.cx, p2.cx);
    const minY = Math.min(p1.cy, p2.cy);
    const maxY = Math.max(p1.cy, p2.cy);
    return `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
  }

  return '';
}

// Generate ellipse SVG element attributes
export function getZoneEllipseAttrs(
  zone: Zone,
  transformPoint: (x: number, y: number) => { cx: number; cy: number },
  dataScale: number
): { cx: number; cy: number; rx: number; ry: number; transform: string } | null {
  if (zone.type !== 'ellipse' || zone.centerX === undefined || zone.centerY === undefined) {
    return null;
  }

  const center = transformPoint(zone.centerX, zone.centerY);
  const rx = (zone.radiusX || 1) * dataScale;
  const ry = (zone.radiusY || 1) * dataScale;
  const rotation = zone.rotation || 0;

  return {
    cx: center.cx,
    cy: center.cy,
    rx,
    ry,
    transform: `rotate(${rotation} ${center.cx} ${center.cy})`,
  };
}

// Get border dash array for zone style
export function getZoneDashArray(style: Zone['borderStyle']): string {
  switch (style) {
    case 'dashed': return '8 4';
    case 'dotted': return '2 2';
    default: return 'none';
  }
}

// Generate unique zone ID
export function generateZoneId(): string {
  return `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Add points to zone's member list
export function addPointsToZone(
  zone: Zone,
  pointIds: number[],
  allPoints: IndentationPoint[]
): Zone {
  const newMemberIds = [...new Set([...zone.memberPointIds, ...pointIds])];
  const updatedZone = { ...zone, memberPointIds: newMemberIds };
  return updateZoneBoundary(updatedZone, allPoints);
}

// Remove points from zone's member list
export function removePointsFromZone(
  zone: Zone,
  pointIds: number[],
  allPoints: IndentationPoint[]
): Zone {
  const newMemberIds = zone.memberPointIds.filter(id => !pointIds.includes(id));
  const updatedZone = { ...zone, memberPointIds: newMemberIds };
  return updateZoneBoundary(updatedZone, allPoints);
}
