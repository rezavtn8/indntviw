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

// Cross product of vectors OA and OB where O is origin
function cross(O: { x: number; y: number }, A: { x: number; y: number }, B: { x: number; y: number }): number {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

// Convex hull using Andrew's monotone chain algorithm
function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points;

  // Sort by x, then by y
  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  // Build lower hull
  const lower: { x: number; y: number }[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper: { x: number; y: number }[] = [];
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

// Generate boundary contour - simple convex hull around all points
export function generateBoundaryContour(
  points: IndentationPoint[]
): { x: number; y: number }[] {
  if (points.length < 3) return [];
  const coords = points.map(p => ({ x: p.x, y: p.y }));
  return convexHull(coords);
}

// Generate smooth SVG path from points using perpendicular offset
export function generateSmoothBoundaryPath(
  points: { x: number; y: number }[],
  padding: number = 0
): string {
  if (points.length < 3) return '';
  
  // Use perpendicular offset instead of centroid-based expansion
  let usedPoints = points;
  if (padding > 0) {
    usedPoints = offsetPolygon(points, padding);
  }
  
  // Simple closed polygon path
  let path = `M ${usedPoints[0].x.toFixed(2)} ${usedPoints[0].y.toFixed(2)}`;
  for (let i = 1; i < usedPoints.length; i++) {
    path += ` L ${usedPoints[i].x.toFixed(2)} ${usedPoints[i].y.toFixed(2)}`;
  }
  path += ' Z';
  
  return path;
}

// Offset a polygon outward by a fixed distance using perpendicular offset
function offsetPolygon(
  points: { x: number; y: number }[],
  offset: number
): { x: number; y: number }[] {
  const n = points.length;
  if (n < 3) return points;
  
  return points.map((curr, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    
    // Edge vectors
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    
    const len1 = Math.hypot(v1x, v1y) || 1;
    const len2 = Math.hypot(v2x, v2y) || 1;
    
    // Outward normals (perpendicular)
    const n1x = -v1y / len1;
    const n1y = v1x / len1;
    const n2x = -v2y / len2;
    const n2y = v2x / len2;
    
    // Average normal
    let nx = (n1x + n2x) / 2;
    let ny = (n1y + n2y) / 2;
    const nlen = Math.hypot(nx, ny);
    
    if (nlen < 0.001) {
      nx = n1x;
      ny = n1y;
    } else {
      nx /= nlen;
      ny /= nlen;
    }
    
    // Miter limit
    const dot = n1x * n2x + n1y * n2y;
    const miterScale = Math.min(2, 1 / Math.max(0.3, Math.sqrt((1 + dot) / 2)));
    
    return {
      x: curr.x + nx * offset * miterScale,
      y: curr.y + ny * offset * miterScale,
    };
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

  const boundary = generateBoundaryContour(points);
  if (boundary.length < 3) return [];

  const cellWidth = (xMax - xMin) / (gridSize - 1);
  const cellHeight = (yMax - yMin) / (gridSize - 1);

  const cells: { x: number; y: number; value: number; width: number; height: number }[] = [];

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

// Generate filled contour bands (like topographic maps)
export function generateFilledContourBands(
  points: IndentationPoint[],
  property: string,
  numLevels: number = 12,
  gridSize: number = 80
): { level: number; nextLevel: number; path: string }[] {
  const { grid, xMin, xMax, yMin, yMax } = generateInterpolatedGrid(points, property, gridSize);
  
  if (grid.length === 0) return [];

  const values = points.map(p => p.properties[property] ?? 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  const levels = generateContourLevels(minValue, maxValue, numLevels);
  const allLevels = [minValue, ...levels, maxValue];
  
  const bands: { level: number; nextLevel: number; path: string }[] = [];
  
  // For each level pair, trace the contour and create a filled region
  for (let i = 0; i < allLevels.length - 1; i++) {
    const level = allLevels[i];
    const nextLevel = allLevels[i + 1];
    
    // Create a path that covers all cells within this value range
    const pathPoints: { x: number; y: number }[][] = [];
    
    // Find connected regions for this level
    const visited = new Set<string>();
    
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row][col];
        const key = `${row},${col}`;
        
        if (visited.has(key)) continue;
        if (cell.value < level || cell.value >= nextLevel) continue;
        
        // Start a new region - trace its boundary
        const regionBoundary = traceRegionBoundary(grid, row, col, level, nextLevel, visited);
        if (regionBoundary.length >= 3) {
          pathPoints.push(regionBoundary);
        }
      }
    }
    
    if (pathPoints.length > 0) {
      // Create SVG path from all regions
      let path = '';
      for (const region of pathPoints) {
        if (region.length < 3) continue;
        path += `M ${region[0].x} ${region[0].y} `;
        for (let j = 1; j < region.length; j++) {
          path += `L ${region[j].x} ${region[j].y} `;
        }
        path += 'Z ';
      }
      
      if (path) {
        bands.push({ level, nextLevel, path });
      }
    }
  }
  
  return bands;
}

// Trace the boundary of a connected region
function traceRegionBoundary(
  grid: GridCell[][],
  startRow: number,
  startCol: number,
  minLevel: number,
  maxLevel: number,
  visited: Set<string>
): { x: number; y: number }[] {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  // Flood fill to find all cells in this region
  const regionCells: { row: number; col: number; x: number; y: number }[] = [];
  const queue: [number, number][] = [[startRow, startCol]];
  
  while (queue.length > 0) {
    const [row, col] = queue.shift()!;
    const key = `${row},${col}`;
    
    if (visited.has(key)) continue;
    if (row < 0 || row >= rows || col < 0 || col >= cols) continue;
    
    const cell = grid[row][col];
    if (cell.value < minLevel || cell.value >= maxLevel) continue;
    
    visited.add(key);
    regionCells.push({ row, col, x: cell.x, y: cell.y });
    
    // Add neighbors
    queue.push([row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]);
  }
  
  if (regionCells.length === 0) return [];
  
  // Find boundary cells (cells with at least one neighbor outside the region)
  const regionSet = new Set(regionCells.map(c => `${c.row},${c.col}`));
  const boundaryCells: { x: number; y: number }[] = [];
  
  for (const cell of regionCells) {
    const neighbors = [
      [cell.row - 1, cell.col],
      [cell.row + 1, cell.col],
      [cell.row, cell.col - 1],
      [cell.row, cell.col + 1]
    ];
    
    const isBoundary = neighbors.some(([r, c]) => !regionSet.has(`${r},${c}`));
    if (isBoundary) {
      boundaryCells.push({ x: cell.x, y: cell.y });
    }
  }
  
  // Sort boundary cells to form a path (convex hull for simplicity)
  return convexHull(boundaryCells);
}

// Generate boundary polygon path for SVG clip path
export function generateBoundaryPath(points: IndentationPoint[]): { x: number; y: number }[] {
  return generateBoundaryContour(points);
}
