import { IndentationPoint } from '@/types/indentation';

// ============= DEPTH ANALYSIS =============

export interface DepthLayerStats {
  layerName: string;
  zMin: number;
  zMax: number;
  pointCount: number;
  meanProperty: number;
  stdProperty: number;
  minProperty: number;
  maxProperty: number;
}

export interface DepthAnalysisResult {
  zMin: number;
  zMax: number;
  zRange: number;
  zMean: number;
  zStdDev: number;
  zMedian: number;
  layers: DepthLayerStats[];
  depthGradient: number; // Rate of property change per unit depth
  depthCorrelation: number; // Pearson correlation between Z and property
}

export function calculateDepthAnalysis(
  points: IndentationPoint[],
  property: string,
  numLayers: number = 4
): DepthAnalysisResult {
  if (points.length === 0) {
    return {
      zMin: 0, zMax: 0, zRange: 0, zMean: 0, zStdDev: 0, zMedian: 0,
      layers: [], depthGradient: 0, depthCorrelation: 0
    };
  }

  const zValues = points.map(p => p.z);
  const propValues = points.map(p => p.properties[property] ?? 0);
  
  const zMin = Math.min(...zValues);
  const zMax = Math.max(...zValues);
  const zRange = zMax - zMin;
  const zMean = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  const zVariance = zValues.reduce((sum, z) => sum + (z - zMean) ** 2, 0) / zValues.length;
  const zStdDev = Math.sqrt(zVariance);
  
  const sortedZ = [...zValues].sort((a, b) => a - b);
  const zMedian = sortedZ[Math.floor(sortedZ.length / 2)];

  // Create depth layers
  const layerHeight = zRange / numLayers || 1;
  const layers: DepthLayerStats[] = [];
  
  for (let i = 0; i < numLayers; i++) {
    const layerZMin = zMin + i * layerHeight;
    const layerZMax = zMin + (i + 1) * layerHeight;
    const layerPoints = points.filter(p => p.z >= layerZMin && (i === numLayers - 1 ? p.z <= layerZMax : p.z < layerZMax));
    const layerPropValues = layerPoints.map(p => p.properties[property] ?? 0);
    
    if (layerPropValues.length > 0) {
      const mean = layerPropValues.reduce((a, b) => a + b, 0) / layerPropValues.length;
      const variance = layerPropValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / layerPropValues.length;
      layers.push({
        layerName: `Layer ${i + 1} (${layerZMin.toFixed(2)} - ${layerZMax.toFixed(2)})`,
        zMin: layerZMin,
        zMax: layerZMax,
        pointCount: layerPropValues.length,
        meanProperty: mean,
        stdProperty: Math.sqrt(variance),
        minProperty: Math.min(...layerPropValues),
        maxProperty: Math.max(...layerPropValues),
      });
    }
  }

  // Calculate depth gradient and correlation
  const { gradient, correlation } = calculateLinearRegression(zValues, propValues);

  return {
    zMin, zMax, zRange, zMean, zStdDev, zMedian,
    layers,
    depthGradient: gradient,
    depthCorrelation: correlation,
  };
}

// ============= SURFACE ANALYSIS =============

export interface SurfaceAnalysisResult {
  // Roughness parameters
  Ra: number;  // Arithmetic average roughness
  Rq: number;  // RMS roughness
  Rz: number;  // Peak-to-valley height
  Rsk: number; // Skewness
  Rku: number; // Kurtosis
  
  // Surface statistics
  surfaceArea: number;        // Estimated surface area
  projectedArea: number;      // XY projected area
  surfaceRatio: number;       // surfaceArea / projectedArea
  meanHeight: number;
  heightVariance: number;
  peakDensity: number;        // Peaks per unit area
}

export function calculateSurfaceAnalysis(points: IndentationPoint[]): SurfaceAnalysisResult {
  if (points.length === 0) {
    return {
      Ra: 0, Rq: 0, Rz: 0, Rsk: 0, Rku: 0,
      surfaceArea: 0, projectedArea: 0, surfaceRatio: 1,
      meanHeight: 0, heightVariance: 0, peakDensity: 0
    };
  }

  const zValues = points.map(p => p.z);
  const meanZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  
  // Deviations from mean
  const deviations = zValues.map(z => z - meanZ);
  
  // Ra - Arithmetic average roughness
  const Ra = deviations.reduce((sum, d) => sum + Math.abs(d), 0) / deviations.length;
  
  // Rq - RMS roughness
  const Rq = Math.sqrt(deviations.reduce((sum, d) => sum + d * d, 0) / deviations.length);
  
  // Rz - Peak-to-valley
  const Rz = Math.max(...zValues) - Math.min(...zValues);
  
  // Rsk - Skewness
  const Rsk = Rq > 0 
    ? deviations.reduce((sum, d) => sum + (d / Rq) ** 3, 0) / deviations.length 
    : 0;
  
  // Rku - Kurtosis
  const Rku = Rq > 0 
    ? deviations.reduce((sum, d) => sum + (d / Rq) ** 4, 0) / deviations.length 
    : 3;
  
  // Surface area estimation using Delaunay-like triangulation approximation
  const { surfaceArea, projectedArea } = estimateSurfaceArea(points);
  const surfaceRatio = projectedArea > 0 ? surfaceArea / projectedArea : 1;
  
  // Height statistics
  const heightVariance = deviations.reduce((sum, d) => sum + d * d, 0) / deviations.length;
  
  // Peak density (simple: points above mean / area)
  const peaksCount = zValues.filter(z => z > meanZ + Rq).length;
  const peakDensity = projectedArea > 0 ? peaksCount / projectedArea : 0;

  return {
    Ra, Rq, Rz, Rsk, Rku,
    surfaceArea, projectedArea, surfaceRatio,
    meanHeight: meanZ, heightVariance, peakDensity
  };
}

function estimateSurfaceArea(points: IndentationPoint[]): { surfaceArea: number; projectedArea: number } {
  if (points.length < 3) {
    return { surfaceArea: 0, projectedArea: 0 };
  }

  // Use convex hull for projected area
  const xyPoints = points.map(p => ({ x: p.x, y: p.y }));
  const hull = convexHull2D(xyPoints);
  const projectedArea = polygonArea(hull);

  // Estimate surface area using local triangulation
  // Simple approach: sum of small triangular patches
  let surfaceArea = 0;
  const sortedPoints = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  
  // Grid-based triangulation approximation
  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  
  const gridSize = Math.ceil(Math.sqrt(points.length));
  const cellWidth = (xMax - xMin) / gridSize || 1;
  const cellHeight = (yMax - yMin) / gridSize || 1;
  
  // For each grid cell, estimate surface area
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const cellPoints = points.filter(p => 
        p.x >= xMin + i * cellWidth && p.x < xMin + (i + 1) * cellWidth &&
        p.y >= yMin + j * cellHeight && p.y < yMin + (j + 1) * cellHeight
      );
      
      if (cellPoints.length >= 1) {
        // Calculate local slope
        if (cellPoints.length >= 3) {
          const plane = fitPlane(cellPoints);
          const slopeArea = cellWidth * cellHeight * Math.sqrt(1 + plane.a ** 2 + plane.b ** 2);
          surfaceArea += slopeArea;
        } else {
          surfaceArea += cellWidth * cellHeight;
        }
      }
    }
  }

  return { surfaceArea, projectedArea };
}

// ============= SPATIAL DISTRIBUTION =============

export interface SpatialDistributionResult {
  // Point density
  pointDensity: number;         // Points per unit area
  densityVariance: number;      // Variance in local density
  
  // Nearest neighbor analysis
  meanNearestNeighborDist: number;
  nnRatio: number;              // Observed / Expected NN distance (< 1 = clustered, > 1 = dispersed)
  
  // Spatial autocorrelation
  moransI: number;              // -1 to 1, positive = clustered values
  moransIZScore: number;
  
  // Clustering
  clusterCount: number;
  hotspotCount: number;
  coldspotCount: number;
}

export function calculateSpatialDistribution(
  points: IndentationPoint[],
  property: string
): SpatialDistributionResult {
  if (points.length === 0) {
    return {
      pointDensity: 0, densityVariance: 0,
      meanNearestNeighborDist: 0, nnRatio: 1,
      moransI: 0, moransIZScore: 0,
      clusterCount: 0, hotspotCount: 0, coldspotCount: 0
    };
  }

  // Calculate bounding area
  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const area = (xMax - xMin) * (yMax - yMin) || 1;
  
  const pointDensity = points.length / area;
  
  // Nearest neighbor analysis
  const nnDistances = points.map(p => {
    let minDist = Infinity;
    points.forEach(other => {
      if (other.id !== p.id) {
        const dist = Math.sqrt((p.x - other.x) ** 2 + (p.y - other.y) ** 2);
        if (dist < minDist) minDist = dist;
      }
    });
    return minDist === Infinity ? 0 : minDist;
  });
  
  const meanNearestNeighborDist = nnDistances.reduce((a, b) => a + b, 0) / nnDistances.length;
  const expectedNNDist = 0.5 / Math.sqrt(pointDensity);
  const nnRatio = expectedNNDist > 0 ? meanNearestNeighborDist / expectedNNDist : 1;
  
  // Local density variance
  const localDensities = points.map(p => {
    const radius = meanNearestNeighborDist * 2;
    const neighbors = points.filter(other => 
      other.id !== p.id && 
      Math.sqrt((p.x - other.x) ** 2 + (p.y - other.y) ** 2) <= radius
    ).length;
    return neighbors;
  });
  const meanLocalDensity = localDensities.reduce((a, b) => a + b, 0) / localDensities.length;
  const densityVariance = localDensities.reduce((sum, d) => sum + (d - meanLocalDensity) ** 2, 0) / localDensities.length;
  
  // Moran's I for spatial autocorrelation
  const { moransI, zScore } = calculateMoransI(points, property);
  
  // Simple hotspot/coldspot detection
  const propValues = points.map(p => p.properties[property] ?? 0);
  const propMean = propValues.reduce((a, b) => a + b, 0) / propValues.length;
  const propStd = Math.sqrt(propValues.reduce((sum, v) => sum + (v - propMean) ** 2, 0) / propValues.length);
  
  const hotspotCount = propValues.filter(v => v > propMean + 2 * propStd).length;
  const coldspotCount = propValues.filter(v => v < propMean - 2 * propStd).length;
  
  // Cluster detection (simple k-means-like)
  const clusterCount = detectClusters(points, property);

  return {
    pointDensity, densityVariance,
    meanNearestNeighborDist, nnRatio,
    moransI, moransIZScore: zScore,
    clusterCount, hotspotCount, coldspotCount
  };
}

function calculateMoransI(points: IndentationPoint[], property: string): { moransI: number; zScore: number } {
  if (points.length < 3) return { moransI: 0, zScore: 0 };
  
  const values = points.map(p => p.properties[property] ?? 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const deviations = values.map(v => v - mean);
  const variance = deviations.reduce((sum, d) => sum + d * d, 0) / values.length;
  
  if (variance === 0) return { moransI: 0, zScore: 0 };
  
  // Distance threshold for neighbors
  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const xRange = Math.max(...xValues) - Math.min(...xValues);
  const yRange = Math.max(...yValues) - Math.min(...yValues);
  const threshold = Math.sqrt(xRange ** 2 + yRange ** 2) / Math.sqrt(points.length);
  
  let sumWeighted = 0;
  let sumWeights = 0;
  
  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        const dist = Math.sqrt((points[i].x - points[j].x) ** 2 + (points[i].y - points[j].y) ** 2);
        const weight = dist <= threshold ? 1 : 0;
        sumWeighted += weight * deviations[i] * deviations[j];
        sumWeights += weight;
      }
    }
  }
  
  const n = points.length;
  const moransI = sumWeights > 0 ? (n / sumWeights) * (sumWeighted / (variance * n)) : 0;
  
  // Expected value and z-score (simplified)
  const expectedI = -1 / (n - 1);
  const expectedVariance = 1 / (n - 1); // Simplified
  const zScore = expectedVariance > 0 ? (moransI - expectedI) / Math.sqrt(expectedVariance) : 0;
  
  return { moransI, zScore };
}

function detectClusters(points: IndentationPoint[], property: string): number {
  if (points.length < 4) return 1;
  
  // Simple variance-based cluster detection
  const values = points.map(p => p.properties[property] ?? 0);
  const sortedValues = [...values].sort((a, b) => a - b);
  
  // Find natural breaks (Jenks-like)
  let maxGapIndex = 0;
  let maxGap = 0;
  
  for (let i = 1; i < sortedValues.length; i++) {
    const gap = sortedValues[i] - sortedValues[i - 1];
    if (gap > maxGap) {
      maxGap = gap;
      maxGapIndex = i;
    }
  }
  
  // If there's a significant gap, we have at least 2 clusters
  const range = sortedValues[sortedValues.length - 1] - sortedValues[0];
  return maxGap > range * 0.3 ? 2 : 1;
}

// ============= VOLUME ANALYSIS =============

export interface VolumeAnalysisResult {
  boundingVolume: number;       // Volume of bounding box
  convexHullVolume: number;     // Volume of 3D convex hull (estimated)
  pointCoverage: number;        // Percentage of grid cells with data
  voidPercentage: number;       // Percentage of empty cells
  volumeUnderSurface: number;   // Volume between surface and base
  fillingRatio: number;         // How densely packed the points are
  meanSpacing: number;          // Average spacing between points
}

export function calculateVolumeAnalysis(points: IndentationPoint[]): VolumeAnalysisResult {
  if (points.length === 0) {
    return {
      boundingVolume: 0, convexHullVolume: 0,
      pointCoverage: 0, voidPercentage: 100,
      volumeUnderSurface: 0, fillingRatio: 0, meanSpacing: 0
    };
  }

  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const zValues = points.map(p => p.z);
  
  const xMin = Math.min(...xValues), xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues), yMax = Math.max(...yValues);
  const zMin = Math.min(...zValues), zMax = Math.max(...zValues);
  
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const zRange = zMax - zMin || 0.1;
  
  const boundingVolume = xRange * yRange * zRange;
  
  // Convex hull volume estimation (approximate as 0.6-0.7 of bounding box for typical data)
  const convexHullVolume = boundingVolume * 0.65;
  
  // Grid coverage analysis
  const gridSize = Math.ceil(Math.cbrt(points.length));
  const cellWidth = xRange / gridSize;
  const cellHeight = yRange / gridSize;
  const cellDepth = zRange / gridSize;
  
  const occupiedCells = new Set<string>();
  const totalCells = gridSize ** 3;
  
  points.forEach(p => {
    const ix = Math.floor((p.x - xMin) / cellWidth);
    const iy = Math.floor((p.y - yMin) / cellHeight);
    const iz = Math.floor((p.z - zMin) / cellDepth);
    occupiedCells.add(`${ix},${iy},${iz}`);
  });
  
  const pointCoverage = (occupiedCells.size / totalCells) * 100;
  const voidPercentage = 100 - pointCoverage;
  
  // Volume under surface (approximation using mean height)
  const meanZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  const baseArea = xRange * yRange;
  const volumeUnderSurface = baseArea * (meanZ - zMin);
  
  // Filling ratio
  const idealPointsPerCell = 1;
  const fillingRatio = points.length / (totalCells * idealPointsPerCell);
  
  // Mean spacing
  let totalSpacing = 0;
  let spacingCount = 0;
  const sampleSize = Math.min(points.length, 100);
  const sampledPoints = points.slice(0, sampleSize);
  
  sampledPoints.forEach(p => {
    let minDist = Infinity;
    points.forEach(other => {
      if (other.id !== p.id) {
        const dist = Math.sqrt((p.x - other.x) ** 2 + (p.y - other.y) ** 2 + (p.z - other.z) ** 2);
        if (dist < minDist) minDist = dist;
      }
    });
    if (minDist !== Infinity) {
      totalSpacing += minDist;
      spacingCount++;
    }
  });
  
  const meanSpacing = spacingCount > 0 ? totalSpacing / spacingCount : 0;

  return {
    boundingVolume, convexHullVolume,
    pointCoverage, voidPercentage,
    volumeUnderSurface, fillingRatio, meanSpacing
  };
}

// ============= GRADIENT & ANISOTROPY =============

export interface GradientAnalysisResult {
  // Property gradients
  gradientMagnitude: number;    // Overall gradient magnitude
  gradientDirectionX: number;   // Component in X direction
  gradientDirectionY: number;   // Component in Y direction
  gradientDirectionZ: number;   // Component in Z direction
  
  // Anisotropy
  anisotropyIndex: number;      // 0 = isotropic, 1 = highly anisotropic
  principalAxis: { x: number; y: number; z: number };
  
  // Directional statistics
  xDirectionVariance: number;
  yDirectionVariance: number;
  zDirectionVariance: number;
}

export function calculateGradientAnalysis(
  points: IndentationPoint[],
  property: string
): GradientAnalysisResult {
  if (points.length < 4) {
    return {
      gradientMagnitude: 0, gradientDirectionX: 0, gradientDirectionY: 0, gradientDirectionZ: 0,
      anisotropyIndex: 0, principalAxis: { x: 1, y: 0, z: 0 },
      xDirectionVariance: 0, yDirectionVariance: 0, zDirectionVariance: 0
    };
  }

  // Fit a 3D plane to property values: prop = a*x + b*y + c*z + d
  const { gradX, gradY, gradZ } = calculate3DGradient(points, property);
  
  const gradientMagnitude = Math.sqrt(gradX ** 2 + gradY ** 2 + gradZ ** 2);
  
  // Normalize gradient direction
  const norm = gradientMagnitude || 1;
  const gradientDirectionX = gradX / norm;
  const gradientDirectionY = gradY / norm;
  const gradientDirectionZ = gradZ / norm;
  
  // Directional variance analysis
  const xVariance = calculateDirectionalVariance(points, property, 'x');
  const yVariance = calculateDirectionalVariance(points, property, 'y');
  const zVariance = calculateDirectionalVariance(points, property, 'z');
  
  const totalVariance = xVariance + yVariance + zVariance;
  const maxVariance = Math.max(xVariance, yVariance, zVariance);
  const minVariance = Math.min(xVariance, yVariance, zVariance);
  
  // Anisotropy: ratio of max to mean variance
  const anisotropyIndex = totalVariance > 0 
    ? (maxVariance - minVariance) / (maxVariance + 0.001) 
    : 0;
  
  // Principal axis (direction of maximum variance)
  const principalAxis = {
    x: xVariance === maxVariance ? 1 : 0,
    y: yVariance === maxVariance ? 1 : 0,
    z: zVariance === maxVariance ? 1 : 0,
  };

  return {
    gradientMagnitude,
    gradientDirectionX,
    gradientDirectionY,
    gradientDirectionZ,
    anisotropyIndex,
    principalAxis,
    xDirectionVariance: xVariance,
    yDirectionVariance: yVariance,
    zDirectionVariance: zVariance,
  };
}

function calculate3DGradient(points: IndentationPoint[], property: string): { gradX: number; gradY: number; gradZ: number } {
  // Multiple linear regression: prop = a*x + b*y + c*z + d
  // Simplified gradient calculation using covariance
  const values = points.map(p => p.properties[property] ?? 0);
  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const zValues = points.map(p => p.z);
  
  const meanV = values.reduce((a, b) => a + b, 0) / values.length;
  const meanX = xValues.reduce((a, b) => a + b, 0) / xValues.length;
  const meanY = yValues.reduce((a, b) => a + b, 0) / yValues.length;
  const meanZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  
  let covXV = 0, covYV = 0, covZV = 0;
  let varX = 0, varY = 0, varZ = 0;
  
  for (let i = 0; i < points.length; i++) {
    const dx = xValues[i] - meanX;
    const dy = yValues[i] - meanY;
    const dz = zValues[i] - meanZ;
    const dv = values[i] - meanV;
    
    covXV += dx * dv;
    covYV += dy * dv;
    covZV += dz * dv;
    varX += dx * dx;
    varY += dy * dy;
    varZ += dz * dz;
  }
  
  const gradX = varX > 0 ? covXV / varX : 0;
  const gradY = varY > 0 ? covYV / varY : 0;
  const gradZ = varZ > 0 ? covZV / varZ : 0;
  
  return { gradX, gradY, gradZ };
}

function calculateDirectionalVariance(points: IndentationPoint[], property: string, direction: 'x' | 'y' | 'z'): number {
  // Calculate variance of property along one direction
  const sorted = [...points].sort((a, b) => a[direction] - b[direction]);
  const values = sorted.map(p => p.properties[property] ?? 0);
  
  // Calculate running variance
  let totalVariance = 0;
  const windowSize = Math.max(3, Math.floor(points.length / 10));
  
  for (let i = 0; i < values.length - windowSize; i++) {
    const window = values.slice(i, i + windowSize);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / window.length;
    totalVariance += variance;
  }
  
  return totalVariance / Math.max(1, values.length - windowSize);
}

// ============= HELPER FUNCTIONS =============

function calculateLinearRegression(x: number[], y: number[]): { gradient: number; correlation: number } {
  if (x.length !== y.length || x.length < 2) return { gradient: 0, correlation: 0 };
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const gradient = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const correlation = denominator > 0 ? numerator / denominator : 0;
  
  return { gradient, correlation };
}

function convexHull2D(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points;
  
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  
  const lower: { x: number; y: number }[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  
  const upper: { x: number; y: number }[] = [];
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

function polygonArea(vertices: { x: number; y: number }[]): number {
  if (vertices.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  
  return Math.abs(area) / 2;
}

function fitPlane(points: IndentationPoint[]): { a: number; b: number; c: number } {
  if (points.length < 3) return { a: 0, b: 0, c: 0 };
  
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumZ = points.reduce((s, p) => s + p.z, 0);
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  const meanZ = sumZ / n;
  
  let sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
  
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    const dz = p.z - meanZ;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
    sxz += dx * dz;
    syz += dy * dz;
  }
  
  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-10) return { a: 0, b: 0, c: 1 };
  
  const a = (syy * sxz - sxy * syz) / det;
  const b = (sxx * syz - sxy * sxz) / det;
  
  return { a, b, c: 1 };
}
