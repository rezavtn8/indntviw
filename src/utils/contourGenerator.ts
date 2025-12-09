import { IndentationPoint } from '@/types/indentation';

interface GridCell {
  x: number;
  y: number;
  value: number;
}

// Inverse Distance Weighting interpolation
function interpolateIDW(
  x: number,
  y: number,
  points: { x: number; y: number; value: number }[],
  power: number = 2
): number {
  let weightedSum = 0;
  let weightSum = 0;

  for (const p of points) {
    const dist = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
    if (dist < 0.0001) return p.value;
    
    const weight = 1 / Math.pow(dist, power);
    weightedSum += weight * p.value;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

// Generate interpolated grid
export function generateInterpolatedGrid(
  points: IndentationPoint[],
  property: string,
  gridSize: number = 50
): { grid: GridCell[][]; xMin: number; xMax: number; yMin: number; yMax: number } {
  if (points.length === 0) {
    return { grid: [], xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  }

  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const xStep = (xMax - xMin) / (gridSize - 1) || 1;
  const yStep = (yMax - yMin) / (gridSize - 1) || 1;

  const pointData = points.map(p => ({
    x: p.x,
    y: p.y,
    value: p.properties[property] ?? 0
  }));

  const grid: GridCell[][] = [];

  for (let i = 0; i < gridSize; i++) {
    const row: GridCell[] = [];
    for (let j = 0; j < gridSize; j++) {
      const x = xMin + j * xStep;
      const y = yMin + i * yStep;
      const value = interpolateIDW(x, y, pointData);
      row.push({ x, y, value });
    }
    grid.push(row);
  }

  return { grid, xMin, xMax, yMin, yMax };
}

// Marching squares algorithm for contour lines
function marchingSquares(
  grid: GridCell[][],
  threshold: number
): { x: number; y: number }[][] {
  const contours: { x: number; y: number }[][] = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  if (rows < 2 || cols < 2) return contours;

  // Edge lookup table for marching squares
  const edgeTable: Record<number, [number, number][]> = {
    0: [], 1: [[0, 3]], 2: [[0, 1]], 3: [[1, 3]], 4: [[1, 2]], 5: [[0, 1], [2, 3]],
    6: [[0, 2]], 7: [[2, 3]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 3], [1, 2]],
    11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]], 15: []
  };

  const getInterpolatedPoint = (
    cell: GridCell,
    nextCell: GridCell,
    threshold: number
  ): { x: number; y: number } => {
    const t = (threshold - cell.value) / (nextCell.value - cell.value);
    return {
      x: cell.x + t * (nextCell.x - cell.x),
      y: cell.y + t * (nextCell.y - cell.y)
    };
  };

  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const cell = [
        grid[i][j],
        grid[i][j + 1],
        grid[i + 1][j + 1],
        grid[i + 1][j]
      ];

      // Calculate cell case
      let cellCase = 0;
      for (let k = 0; k < 4; k++) {
        if (cell[k].value >= threshold) {
          cellCase |= 1 << k;
        }
      }

      const edges = edgeTable[cellCase];
      if (!edges || edges.length === 0) continue;

      for (const [e1, e2] of edges) {
        const edgePoints: { x: number; y: number }[] = [];

        for (const edge of [e1, e2]) {
          let p1: GridCell, p2: GridCell;
          switch (edge) {
            case 0: p1 = cell[0]; p2 = cell[1]; break;
            case 1: p1 = cell[1]; p2 = cell[2]; break;
            case 2: p1 = cell[3]; p2 = cell[2]; break;
            case 3: p1 = cell[0]; p2 = cell[3]; break;
            default: continue;
          }
          edgePoints.push(getInterpolatedPoint(p1, p2, threshold));
        }

        if (edgePoints.length === 2) {
          contours.push(edgePoints);
        }
      }
    }
  }

  return contours;
}

// Generate contour levels
export function generateContourLevels(
  minValue: number,
  maxValue: number,
  numLevels: number = 10
): number[] {
  const levels: number[] = [];
  const step = (maxValue - minValue) / (numLevels + 1);
  
  for (let i = 1; i <= numLevels; i++) {
    levels.push(minValue + i * step);
  }
  
  return levels;
}

// Generate boundary contour that follows the outer edge of measured points
export function generateBoundaryContour(
  points: IndentationPoint[]
): { x: number; y: number }[] {
  if (points.length < 3) return [];

  const coords = points.map(p => ({ x: p.x, y: p.y }));
  
  // Find unique X and Y values to understand the grid structure
  const uniqueX = [...new Set(coords.map(p => p.x))].sort((a, b) => a - b);
  const uniqueY = [...new Set(coords.map(p => p.y))].sort((a, b) => a - b);
  
  // Create a set for quick point lookup
  const pointSet = new Set(coords.map(p => `${p.x.toFixed(6)},${p.y.toFixed(6)}`));
  const hasPoint = (x: number, y: number) => pointSet.has(`${x.toFixed(6)},${y.toFixed(6)}`);
  
  // Calculate spacing
  const xSpacing = uniqueX.length > 1 ? uniqueX[1] - uniqueX[0] : 1;
  const ySpacing = uniqueY.length > 1 ? uniqueY[1] - uniqueY[0] : 1;
  
  // Find boundary points - points that have at least one empty neighbor
  const boundaryPoints: { x: number; y: number }[] = [];
  
  for (const p of coords) {
    // Check 8 neighbors
    const neighbors = [
      { x: p.x - xSpacing, y: p.y },           // left
      { x: p.x + xSpacing, y: p.y },           // right
      { x: p.x, y: p.y - ySpacing },           // bottom
      { x: p.x, y: p.y + ySpacing },           // top
      { x: p.x - xSpacing, y: p.y - ySpacing }, // bottom-left
      { x: p.x + xSpacing, y: p.y - ySpacing }, // bottom-right
      { x: p.x - xSpacing, y: p.y + ySpacing }, // top-left
      { x: p.x + xSpacing, y: p.y + ySpacing }, // top-right
    ];
    
    // If any neighbor is missing, this is a boundary point
    const hasEmptyNeighbor = neighbors.some(n => !hasPoint(n.x, n.y));
    
    if (hasEmptyNeighbor) {
      boundaryPoints.push(p);
    }
  }

  if (boundaryPoints.length < 3) {
    return sortPointsClockwise(coords);
  }

  // Order boundary points to form a continuous outline
  return orderBoundaryPoints(boundaryPoints, xSpacing, ySpacing);
}

// Order boundary points to create a continuous outline path
function orderBoundaryPoints(
  points: { x: number; y: number }[],
  xSpacing: number,
  ySpacing: number
): { x: number; y: number }[] {
  if (points.length < 3) return points;
  
  const result: { x: number; y: number }[] = [];
  const used = new Set<string>();
  const key = (p: { x: number; y: number }) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
  
  // Start from the leftmost-bottom point
  let current = points.reduce((min, p) => 
    p.x < min.x || (p.x === min.x && p.y < min.y) ? p : min
  );
  
  result.push(current);
  used.add(key(current));
  
  // Trace the boundary
  const maxDist = Math.sqrt(xSpacing * xSpacing + ySpacing * ySpacing) * 1.5;
  
  while (result.length < points.length) {
    let nearest: { x: number; y: number } | null = null;
    let nearestDist = Infinity;
    let nearestAngle = Infinity;
    
    // Calculate previous direction
    const prevDir = result.length >= 2 
      ? Math.atan2(current.y - result[result.length - 2].y, current.x - result[result.length - 2].x)
      : -Math.PI / 2; // Start going up
    
    for (const p of points) {
      if (used.has(key(p))) continue;
      
      const dist = Math.sqrt(Math.pow(p.x - current.x, 2) + Math.pow(p.y - current.y, 2));
      if (dist > maxDist) continue;
      
      // Prefer points that continue in roughly the same direction (turning right)
      const angle = Math.atan2(p.y - current.y, p.x - current.x);
      let angleDiff = angle - prevDir;
      // Normalize to prefer right turns (clockwise)
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      // Score based on distance and direction continuity
      const score = dist + Math.abs(angleDiff) * maxDist * 0.5;
      
      if (score < nearestDist) {
        nearestDist = score;
        nearest = p;
      }
    }
    
    if (!nearest) {
      // No nearby point found, find any unused point
      for (const p of points) {
        if (!used.has(key(p))) {
          nearest = p;
          break;
        }
      }
    }
    
    if (!nearest) break;
    
    result.push(nearest);
    used.add(key(nearest));
    current = nearest;
  }
  
  return result;
}

// Sort points in clockwise order around their centroid (fallback)
function sortPointsClockwise(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points;

  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });
}

// Check if a point is inside a polygon using ray casting
function isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Generate all contour lines for given levels (keeping for backward compatibility)
export function generateContours(
  points: IndentationPoint[],
  property: string,
  numLevels: number = 8,
  gridSize: number = 40
): { level: number; paths: { x: number; y: number }[][] }[] {
  const { grid } = generateInterpolatedGrid(points, property, gridSize);
  
  if (grid.length === 0) return [];

  const values = points.map(p => p.properties[property] ?? 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  const levels = generateContourLevels(minValue, maxValue, numLevels);
  
  return levels.map(level => ({
    level,
    paths: marchingSquares(grid, level)
  }));
}

// Generate filled contour data clipped to boundary
export function generateFilledContours(
  points: IndentationPoint[],
  property: string,
  gridSize: number = 50
): { x: number; y: number; value: number; width: number; height: number }[] {
  const { grid, xMin, xMax, yMin, yMax } = generateInterpolatedGrid(points, property, gridSize);
  
  if (grid.length === 0) return [];

  // Get the convex hull boundary
  const boundary = generateBoundaryContour(points);
  if (boundary.length < 3) return [];

  const cellWidth = (xMax - xMin) / (gridSize - 1);
  const cellHeight = (yMax - yMin) / (gridSize - 1);

  const cells: { x: number; y: number; value: number; width: number; height: number }[] = [];

  // Only include cells that are inside the boundary
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const cell = grid[i][j];
      if (isPointInPolygon(cell.x, cell.y, boundary)) {
        cells.push({
          x: cell.x,
          y: cell.y,
          value: cell.value,
          width: cellWidth,
          height: cellHeight
        });
      }
    }
  }

  return cells;
}

// Generate boundary polygon path for SVG clip path
export function generateBoundaryPath(points: IndentationPoint[]): { x: number; y: number }[] {
  return generateBoundaryContour(points);
}
