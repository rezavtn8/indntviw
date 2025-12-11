import React, { useMemo, useCallback, useState, useRef } from 'react';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { Zone, ZonePoint } from '@/types/zones';
import { getColorForValue } from '@/utils/colorScales';
import { generateBoundaryContour, generateFilledContours, generateSmoothBoundaryPath } from '@/utils/contourGenerator';
import { isPointInPolygon } from '@/utils/statisticsUtils';
import { getZoneDashArray, getZoneCentroid } from '@/utils/zoneUtils';
import { generateZoneBoundary, boundaryToSVGPath } from '@/utils/boundaryGenerator';
import { DrawingTool } from '@/components/controls/ZoneToolbar';

interface Heatmap2DProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  selectedPoint: IndentationPoint | null;
  highlightedPoints?: number[];
  selectedPointIds?: number[];
  showContours?: boolean;
  showInterpolation?: boolean;
  drawingTool?: DrawingTool;
  zones?: Zone[];
  selectedZoneId?: string | null;
  onPointSelect: (point: IndentationPoint | null) => void;
  onPointHover: (point: IndentationPoint | null) => void;
  onPointsSelected?: (pointIds: number[]) => void;
  onZoneSelect?: (zoneId: string | null) => void;
}

interface ViewState {
  scale: number;
  translateX: number;
  translateY: number;
}

export const Heatmap2D: React.FC<Heatmap2DProps> = ({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  selectedPoint,
  highlightedPoints = [],
  selectedPointIds = [],
  showContours = false,
  showInterpolation = false,
  drawingTool = 'select',
  zones = [],
  selectedZoneId = null,
  onPointSelect,
  onPointHover,
  onPointsSelected,
  onZoneSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lassoPath, setLassoPath] = useState<ZonePoint[]>([]);
  const [boxStart, setBoxStart] = useState<ZonePoint | null>(null);
  const [currentPos, setCurrentPos] = useState<ZonePoint | null>(null);
  
  // Zoom state (button-controlled only)
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, translateX: 0, translateY: 0 });

  const { normalizedPoints, viewBox, pointRadius, scale, padding, xMin, yMin, height, offsetX, offsetY } = useMemo(() => {
    if (points.length === 0) {
      return { normalizedPoints: [], viewBox: '0 0 100 100', pointRadius: 2, scale: 1, padding: 40, xMin: 0, yMin: 0, height: 600, offsetX: 40, offsetY: 40 };
    }

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    
    const xMinVal = Math.min(...xValues);
    const xMaxVal = Math.max(...xValues);
    const yMinVal = Math.min(...yValues);
    const yMaxVal = Math.max(...yValues);
    
    const xRange = xMaxVal - xMinVal || 1;
    const yRange = yMaxVal - yMinVal || 1;
    
    const pad = 40;
    const width = 800;
    const h = 600;
    
    const scaleVal = Math.min((width - pad * 2) / xRange, (h - pad * 2) / yRange);
    
    // Calculate the actual size the data will take
    const dataWidth = xRange * scaleVal;
    const dataHeight = yRange * scaleVal;
    
    // Center the data in the viewBox
    const offsetX = pad + (width - pad * 2 - dataWidth) / 2;
    const offsetY = pad + (h - pad * 2 - dataHeight) / 2;
    
    const normalized = points.map(point => {
      const value = point.properties[selectedProperty] ?? 0;
      return {
        ...point,
        cx: offsetX + (point.x - xMinVal) * scaleVal,
        cy: h - offsetY - (point.y - yMinVal) * scaleVal,
        color: getColorForValue(value, minValue, maxValue, colorScheme),
        value,
        isHighlighted: highlightedPoints.includes(point.id),
        isSelected: selectedPointIds.includes(point.id),
      };
    });

    // Calculate optimal point radius based on density
    const avgDistance = Math.sqrt((xRange * yRange) / points.length);
    const radius = Math.max(4, Math.min(15, avgDistance * scaleVal * 0.4));

    return {
      normalizedPoints: normalized,
      viewBox: `0 0 ${width} ${h}`,
      pointRadius: radius,
      scale: scaleVal,
      padding: pad,
      xMin: xMinVal,
      yMin: yMinVal,
      height: h,
      offsetX,
      offsetY,
    };
  }, [points, selectedProperty, colorScheme, minValue, maxValue, highlightedPoints, selectedPointIds]);

  // Point radius in data units (for boundary generation)
  const pointRadiusDataUnits = useMemo(() => {
    return pointRadius / scale;
  }, [pointRadius, scale]);

  // Generate boundary contour for display and clipping
  const boundaryContour = useMemo(() => {
    if (points.length < 3) return [];
    return generateBoundaryContour(points);
  }, [points]);

  // Interpolated cells for background
  const interpolatedCells = useMemo(() => {
    if (showInterpolation && points.length >= 3) {
      return generateFilledContours(points, selectedProperty, 80);
    }
    return [];
  }, [points, selectedProperty, showInterpolation]);

  const handlePointClick = useCallback((point: IndentationPoint) => {
    if (drawingTool === 'select') {
      onPointSelect(selectedPoint?.id === point.id ? null : point);
    }
  }, [selectedPoint, onPointSelect, drawingTool]);

  // Transform contour coordinates to SVG space (using centered offsets)
  const transformPoint = useCallback((x: number, y: number) => ({
    cx: offsetX + (x - xMin) * scale,
    cy: height - offsetY - (y - yMin) * scale,
  }), [offsetX, offsetY, xMin, yMin, scale, height]);

  // Inverse transform: SVG to data coordinates
  const inverseTransform = useCallback((cx: number, cy: number) => ({
    x: xMin + (cx - offsetX) / scale,
    y: yMin + (height - offsetY - cy) / scale,
  }), [padding, xMin, yMin, scale, height]);

  // Get SVG coordinates from mouse event (accounting for zoom/pan)
  const getSVGCoords = useCallback((e: React.MouseEvent<SVGSVGElement>): ZonePoint => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const svgWidth = 800;
    const svgHeight = 600;
    const rawX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const rawY = ((e.clientY - rect.top) / rect.height) * svgHeight;
    // Convert to pre-transform coordinates, then to data coords
    const svgX = (rawX - viewState.translateX) / viewState.scale;
    const svgY = (rawY - viewState.translateY) / viewState.scale;
    return inverseTransform(svgX, svgY);
  }, [viewState, inverseTransform]);

  // Helper to check if point is in box
  const isPointInBox = useCallback((point: { x: number; y: number }, start: ZonePoint, end: ZonePoint): boolean => {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }, []);

  // Drawing handlers (simplified - no panning via mouse)
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (drawingTool === 'select') {
      // Click to toggle individual point selection
      const coords = getSVGCoords(e);
      const clickedPoint = points.find(p => {
        const dist = Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2);
        return dist < pointRadiusDataUnits * 2;
      });
      
      if (clickedPoint) {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl) {
          // Toggle selection
          if (selectedPointIds.includes(clickedPoint.id)) {
            onPointsSelected?.(selectedPointIds.filter(id => id !== clickedPoint.id));
          } else {
            onPointsSelected?.([...selectedPointIds, clickedPoint.id]);
          }
        } else {
          // Single select
          onPointsSelected?.([clickedPoint.id]);
        }
      } else {
        // Click on empty space - clear selection or select zone
        onZoneSelect?.(null);
        if (!e.ctrlKey && !e.metaKey) {
          onPointsSelected?.([]);
        }
      }
      return;
    }

    const coords = getSVGCoords(e);
    setIsDrawing(true);

    if (drawingTool === 'lasso') {
      setLassoPath([coords]);
    } else if (drawingTool === 'box') {
      setBoxStart(coords);
      setCurrentPos(coords);
    }
  }, [drawingTool, getSVGCoords, points, pointRadiusDataUnits, selectedPointIds, onPointsSelected, onZoneSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;

    const coords = getSVGCoords(e);

    if (drawingTool === 'lasso') {
      setLassoPath(prev => [...prev, coords]);
    } else if (drawingTool === 'box') {
      setCurrentPos(coords);
    }
  }, [isDrawing, drawingTool, getSVGCoords]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;

    const isAdditive = e.ctrlKey || e.metaKey || e.shiftKey;

    if (drawingTool === 'lasso' && lassoPath.length >= 3) {
      // Select all points within the lasso
      const selectedIds = points
        .filter(p => isPointInPolygon({ x: p.x, y: p.y }, lassoPath))
        .map(p => p.id);
      
      if (isAdditive) {
        onPointsSelected?.([...new Set([...selectedPointIds, ...selectedIds])]);
      } else {
        onPointsSelected?.(selectedIds);
      }
    } else if (drawingTool === 'box' && boxStart && currentPos) {
      // Select all points within the box
      const selectedIds = points
        .filter(p => isPointInBox({ x: p.x, y: p.y }, boxStart, currentPos))
        .map(p => p.id);
      
      if (isAdditive) {
        onPointsSelected?.([...new Set([...selectedPointIds, ...selectedIds])]);
      } else {
        onPointsSelected?.(selectedIds);
      }
    }

    setIsDrawing(false);
    setLassoPath([]);
    setBoxStart(null);
    setCurrentPos(null);
  }, [isDrawing, drawingTool, lassoPath, boxStart, currentPos, points, selectedPointIds, isPointInBox, onPointsSelected]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setViewState({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  // Zoom to specific level (from center)
  const zoomTo = useCallback((newScale: number) => {
    const clampedScale = Math.max(0.8, Math.min(4, newScale));
    const centerX = 400;
    const centerY = 300;
    const scaleRatio = clampedScale / viewState.scale;
    let newTranslateX = centerX - (centerX - viewState.translateX) * scaleRatio;
    let newTranslateY = centerY - (centerY - viewState.translateY) * scaleRatio;
    
    const maxPan = 200 * clampedScale;
    newTranslateX = Math.max(-maxPan, Math.min(maxPan, newTranslateX));
    newTranslateY = Math.max(-maxPan, Math.min(maxPan, newTranslateY));
    
    setViewState({ scale: clampedScale, translateX: newTranslateX, translateY: newTranslateY });
  }, [viewState]);

  // Generate selection preview boundary (same as ExportCanvas)
  const selectionPreviewPath = useMemo(() => {
    if (selectedPointIds.length < 1) return null;
    
    const selectedPoints = points.filter(p => selectedPointIds.includes(p.id));
    if (selectedPoints.length === 0) return null;
    
    const memberCoords: ZonePoint[] = selectedPoints.map(p => ({ x: p.x, y: p.y }));
    const boundaryPoints = generateZoneBoundary(memberCoords, 0.1, 0.5, 'convex', pointRadiusDataUnits);
    
    if (boundaryPoints.length < 3) return null;
    
    return boundaryToSVGPath(boundaryPoints, transformPoint);
  }, [selectedPointIds, points, transformPoint, pointRadiusDataUnits]);

  // Generate drawing preview path (lasso)
  const getDrawingPreviewPath = useCallback(() => {
    if (drawingTool === 'lasso' && lassoPath.length >= 2) {
      const transformed = lassoPath.map(p => transformPoint(p.x, p.y));
      return transformed.map((t, i) => `${i === 0 ? 'M' : 'L'} ${t.cx} ${t.cy}`).join(' ');
    }
    return '';
  }, [drawingTool, lassoPath, transformPoint]);

  // Generate drawing preview rect (box)
  const getDrawingPreviewRect = useCallback(() => {
    if (drawingTool === 'box' && boxStart && currentPos) {
      const p1 = transformPoint(boxStart.x, boxStart.y);
      const p2 = transformPoint(currentPos.x, currentPos.y);
      return {
        x: Math.min(p1.cx, p2.cx),
        y: Math.min(p1.cy, p2.cy),
        width: Math.abs(p2.cx - p1.cx),
        height: Math.abs(p2.cy - p1.cy),
      };
    }
    return null;
  }, [drawingTool, boxStart, currentPos, transformPoint]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-muted-foreground/30">
        <p className="text-muted-foreground font-mono">No data loaded</p>
      </div>
    );
  }

  const transformStr = `translate(${viewState.translateX}, ${viewState.translateY}) scale(${viewState.scale})`;
  const zoomPercent = Math.round(viewState.scale * 100);
  const cursor = drawingTool === 'select' ? 'cursor-default' : 'cursor-crosshair';

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Enhanced zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-card/90 border border-border rounded p-1">
        <button
          onClick={() => zoomTo(viewState.scale * 1.3)}
          className="w-8 h-8 bg-card border border-border text-foreground font-mono text-base hover:bg-muted flex items-center justify-center rounded"
          title="Zoom In (+)"
        >
          +
        </button>
        <div className="text-center font-mono text-xs text-muted-foreground py-0.5">
          {zoomPercent}%
        </div>
        <button
          onClick={() => zoomTo(viewState.scale * 0.75)}
          className="w-8 h-8 bg-card border border-border text-foreground font-mono text-base hover:bg-muted flex items-center justify-center rounded"
          title="Zoom Out (-)"
        >
          −
        </button>
        <div className="border-t border-border my-1" />
        <button
          onClick={resetZoom}
          className="w-8 h-8 bg-card border border-border text-foreground font-mono text-xs hover:bg-muted flex items-center justify-center rounded"
          title="Reset View (R)"
        >
          1:1
        </button>
        <button
          onClick={() => zoomTo(2)}
          className="w-8 h-8 bg-card border border-border text-foreground font-mono text-xs hover:bg-muted flex items-center justify-center rounded"
          title="Zoom 200%"
        >
          2×
        </button>
      </div>
      

      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
        className={`w-full h-full ${cursor}`}
        style={{ background: 'hsl(var(--card))', display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid pattern - rendered behind transform group */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="1"
              opacity="0.5"
            />
          </pattern>
          {/* Smooth clip path for interpolation */}
          {boundaryContour.length >= 3 && (
            <clipPath id="heatmap-smooth-clip">
              <path
                d={generateSmoothBoundaryPath(
                  boundaryContour.map(p => {
                    const { cx, cy } = transformPoint(p.x, p.y);
                    return { x: cx, y: cy };
                  }),
                  pointRadius * 0.5
                )}
              />
            </clipPath>
          )}
        </defs>
        <rect x="0" y="0" width="800" height="600" fill="url(#grid)" />

        {/* Axis labels - OUTSIDE transform group so they stay fixed */}
        <text
          x="400"
          y="590"
          textAnchor="middle"
          className="fill-foreground font-mono text-sm"
        >
          X Position (mm)
        </text>
        <text
          x="15"
          y="300"
          textAnchor="middle"
          transform="rotate(-90 15 300)"
          className="fill-foreground font-mono text-sm"
        >
          Y Position (mm)
        </text>

        {/* Transform group for zoom/pan */}
        <g transform={transformStr}>

          {/* Background interpolation */}
          {showInterpolation && interpolatedCells.length > 0 && (
            <g clipPath="url(#heatmap-smooth-clip)" opacity="0.6">
              {interpolatedCells.map((cell, i) => {
                const { cx, cy } = transformPoint(cell.x, cell.y);
                const color = getColorForValue(cell.value, minValue, maxValue, colorScheme);
                const cellSize = cell.width * scale * 1.3;
                return (
                  <rect
                    key={`cell-${i}`}
                    x={cx - cellSize / 2}
                    y={cy - cellSize / 2}
                    width={cellSize}
                    height={cellSize}
                    fill={color}
                  />
                );
              })}
            </g>
          )}

          {/* Smooth boundary contour line */}
          {showContours && boundaryContour.length >= 3 && (
            <path
              d={generateSmoothBoundaryPath(
                boundaryContour.map(p => {
                  const { cx, cy } = transformPoint(p.x, p.y);
                  return { x: cx, y: cy };
                }),
                pointRadius * 1.1
              )}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          )}

          {/* Zones - using same smooth boundary logic as outer contour */}
          {zones.filter(z => z.visible).map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            
            // Get member points for this zone
            const memberPoints = zone.memberPointIds.length > 0
              ? points.filter(p => zone.memberPointIds.includes(p.id))
              : [];
            
            if (memberPoints.length === 0) return null;
            
            // Generate smooth boundary path (same logic as boundary contour)
            const zonePath = generateSmoothBoundaryPath(
              memberPoints.map(p => {
                const { cx, cy } = transformPoint(p.x, p.y);
                return { x: cx, y: cy };
              }),
              pointRadius * 1.1
            );
            
            if (!zonePath) return null;
            
            const centroid = getZoneCentroid(zone, points);
            const labelPos = transformPoint(centroid.x, centroid.y);
            
            return (
              <g key={zone.id}>
                {/* Zone fill */}
                <path
                  d={zonePath}
                  fill={zone.color}
                  fillOpacity={zone.fillOpacity}
                  stroke={isSelected ? 'hsl(var(--foreground))' : zone.color}
                  strokeWidth={isSelected ? zone.borderWidth + 1 : zone.borderWidth}
                  strokeDasharray={getZoneDashArray(zone.borderStyle)}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoneSelect?.(isSelected ? null : zone.id);
                  }}
                />
                
                {/* Zone label */}
                {zone.showLabel && (
                  <text
                    x={labelPos.cx}
                    y={labelPos.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={zone.labelFontSize}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    fill="#1f2937"
                    stroke="white"
                    strokeWidth="3"
                    paintOrder="stroke"
                    className="pointer-events-none"
                  >
                    {zone.name}
                  </text>
                )}
                
                {/* Selection highlight for zones */}
                {isSelected && (
                  <path
                    d={zonePath}
                    fill="none"
                    stroke="hsl(var(--foreground))"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    className="pointer-events-none animate-pulse"
                  />
                )}
              </g>
            );
          })}

          {/* Data points */}
          {normalizedPoints.map((point) => {
            const isPointSelected = selectedPointIds.includes(point.id);
            return (
              <g key={point.id}>
                {/* Highlight ring for outliers */}
                {point.isHighlighted && (
                  <circle
                    cx={point.cx}
                    cy={point.cy}
                    r={pointRadius + 8}
                    fill="none"
                    stroke="hsl(var(--destructive))"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                )}
                {/* Selection ring for selected points */}
                {isPointSelected && (
                  <circle
                    cx={point.cx}
                    cy={point.cy}
                    r={pointRadius * 1.3}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                )}
                <circle
                  cx={point.cx}
                  cy={point.cy}
                  r={isPointSelected ? pointRadius * 1.3 : pointRadius}
                  fill={point.color}
                  stroke={
                    point.isHighlighted 
                      ? 'hsl(var(--destructive))' 
                      : isPointSelected
                        ? '#3b82f6'
                        : selectedPoint?.id === point.id 
                          ? 'hsl(var(--foreground))' 
                          : '#374151'
                  }
                  strokeWidth={selectedPoint?.id === point.id || point.isHighlighted || isPointSelected ? 2 : 0.5}
                  className="cursor-pointer transition-all duration-150 hover:opacity-80"
                  onClick={() => handlePointClick(point)}
                  onMouseEnter={() => onPointHover(point)}
                  onMouseLeave={() => onPointHover(null)}
                />
                {selectedPoint?.id === point.id && (
                  <circle
                    cx={point.cx}
                    cy={point.cy}
                    r={pointRadius + 6}
                    fill="none"
                    stroke="hsl(var(--foreground))"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}

          {/* Selection preview boundary (same as ExportCanvas) */}
          {selectionPreviewPath && !isDrawing && (
            <path
              d={selectionPreviewPath}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="8 4"
              pointerEvents="none"
            />
          )}

          {/* Drawing preview */}
          {isDrawing && (
            <>
              {drawingTool === 'lasso' && (
                <path
                  d={getDrawingPreviewPath()}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              )}
              {drawingTool === 'box' && (() => {
                const rect = getDrawingPreviewRect();
                return rect && (
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  />
                );
              })()}
            </>
          )}
        </g>
      </svg>
    </div>
  );
};
