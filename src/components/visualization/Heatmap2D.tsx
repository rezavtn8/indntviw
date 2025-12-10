import React, { useMemo, useCallback, useState, useRef } from 'react';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue } from '@/utils/colorScales';
import { generateBoundaryContour, generateFilledContours, generateSmoothBoundaryPath } from '@/utils/contourGenerator';
import { isPointInPolygon } from '@/utils/statisticsUtils';

export type HeatmapMode = 'dots' | 'filled';
export type SelectionMode = 'none' | 'lasso';

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
  heatmapMode?: HeatmapMode;
  blurIntensity?: number;
  selectionMode?: SelectionMode;
  onPointSelect: (point: IndentationPoint | null) => void;
  onPointHover: (point: IndentationPoint | null) => void;
  onLassoSelect?: (pointIds: number[]) => void;
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
  heatmapMode = 'dots',
  blurIntensity = 3,
  selectionMode = 'none',
  onPointSelect,
  onPointHover,
  onLassoSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  
  // Zoom and pan state
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, translateX: 0, translateY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewStart, setViewStart] = useState({ translateX: 0, translateY: 0 });

  const { normalizedPoints, viewBox, pointRadius, scale, padding, xMin, yMin, height } = useMemo(() => {
    if (points.length === 0) {
      return { normalizedPoints: [], viewBox: '0 0 100 100', pointRadius: 2, scale: 1, padding: 40, xMin: 0, yMin: 0, height: 600 };
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
    
    const normalized = points.map(point => {
      const value = point.properties[selectedProperty] ?? 0;
      return {
        ...point,
        cx: pad + (point.x - xMinVal) * scaleVal,
        cy: h - pad - (point.y - yMinVal) * scaleVal,
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
    };
  }, [points, selectedProperty, colorScheme, minValue, maxValue, highlightedPoints, selectedPointIds]);

  // Generate boundary contour for display and clipping
  const boundaryContour = useMemo(() => {
    if (points.length < 3) return [];
    return generateBoundaryContour(points);
  }, [points]);

  // Phase 2: Generate dense interpolation grid for gradient fill
  const gradientCells = useMemo(() => {
    if (heatmapMode === 'filled') {
      if (points.length < 3) return [];
      // Very dense grid for smooth gradient - 200x200 resolution
      return generateFilledContours(points, selectedProperty, 200);
    }
    return [];
  }, [points, selectedProperty, heatmapMode]);

  // Interpolated cells for dots mode background
  const interpolatedCells = useMemo(() => {
    if (showInterpolation && heatmapMode === 'dots') {
      if (points.length < 3) return [];
      return generateFilledContours(points, selectedProperty, 80);
    }
    return [];
  }, [points, selectedProperty, showInterpolation, heatmapMode]);

  const handlePointClick = useCallback((point: IndentationPoint) => {
    if (selectionMode === 'none') {
      onPointSelect(selectedPoint?.id === point.id ? null : point);
    }
  }, [selectedPoint, onPointSelect, selectionMode]);

  // Transform contour coordinates to SVG space
  const transformPoint = useCallback((x: number, y: number) => ({
    cx: padding + (x - xMin) * scale,
    cy: height - padding - (y - yMin) * scale,
  }), [padding, xMin, yMin, scale, height]);

  // Inverse transform: SVG to data coordinates
  const inverseTransform = useCallback((cx: number, cy: number) => ({
    x: xMin + (cx - padding) / scale,
    y: yMin + (height - padding - cy) / scale,
  }), [padding, xMin, yMin, scale, height]);

  // Get SVG coordinates from mouse event (accounting for zoom/pan)
  const getSVGCoords = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const svgWidth = 800;
    const svgHeight = 600;
    const rawX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const rawY = ((e.clientY - rect.top) / rect.height) * svgHeight;
    // Convert to pre-transform coordinates
    return {
      x: (rawX - viewState.translateX) / viewState.scale,
      y: (rawY - viewState.translateY) / viewState.scale,
    };
  }, [viewState]);

  // Lasso handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (selectionMode === 'lasso') {
      const coords = getSVGCoords(e);
      setIsDrawing(true);
      setLassoPath([coords]);
    } else if (selectionMode === 'none' && e.button === 0) {
      // Start panning - store initial mouse position and current view state
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setViewStart({ translateX: viewState.translateX, translateY: viewState.translateY });
    }
  }, [selectionMode, getSVGCoords, viewState.translateX, viewState.translateY]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isDrawing && selectionMode === 'lasso') {
      const coords = getSVGCoords(e);
      setLassoPath(prev => [...prev, coords]);
    } else if (isPanning) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Convert screen delta to SVG units
      const scaleX = 800 / rect.width;
      const scaleY = 600 / rect.height;
      const dx = (e.clientX - panStart.x) * scaleX;
      const dy = (e.clientY - panStart.y) * scaleY;
      
      // Limit panning range based on zoom level
      const maxPan = 200 * viewState.scale;
      const newX = Math.max(-maxPan, Math.min(maxPan, viewStart.translateX + dx));
      const newY = Math.max(-maxPan, Math.min(maxPan, viewStart.translateY + dy));
      
      setViewState(prev => ({
        ...prev,
        translateX: newX,
        translateY: newY,
      }));
    }
  }, [isDrawing, selectionMode, getSVGCoords, isPanning, panStart, viewStart, viewState.scale]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    if (!isDrawing || selectionMode !== 'lasso' || lassoPath.length < 3) {
      setIsDrawing(false);
      setLassoPath([]);
      return;
    }

    // Convert lasso path to data coordinates
    const dataPath = lassoPath.map(p => inverseTransform(p.x, p.y));

    // Find points inside lasso
    const selectedIds = points
      .filter(point => isPointInPolygon({ x: point.x, y: point.y }, dataPath))
      .map(p => p.id);

    onLassoSelect?.(selectedIds);
    setIsDrawing(false);
    setLassoPath([]);
  }, [isDrawing, isPanning, selectionMode, lassoPath, points, inverseTransform, onLassoSelect]);

  // Zoom handler - gentler zoom with limits
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = ((e.clientX - rect.left) / rect.width) * 800;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 600;

    // Gentler zoom factor
    const zoomFactor = e.deltaY < 0 ? 1.06 : 0.94;
    const newScale = Math.max(0.8, Math.min(4, viewState.scale * zoomFactor));
    
    if (newScale === viewState.scale) return;

    const scaleRatio = newScale / viewState.scale;
    let newTranslateX = mouseX - (mouseX - viewState.translateX) * scaleRatio;
    let newTranslateY = mouseY - (mouseY - viewState.translateY) * scaleRatio;

    // Limit panning range
    const maxPan = 200 * newScale;
    newTranslateX = Math.max(-maxPan, Math.min(maxPan, newTranslateX));
    newTranslateY = Math.max(-maxPan, Math.min(maxPan, newTranslateY));

    setViewState({
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY,
    });
  }, [viewState]);

  // Double-click to zoom in
  const handleDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (selectionMode !== 'none') return;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = ((e.clientX - rect.left) / rect.width) * 800;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 600;

    const newScale = Math.min(4, viewState.scale * 1.4);
    const scaleRatio = newScale / viewState.scale;
    const newTranslateX = mouseX - (mouseX - viewState.translateX) * scaleRatio;
    const newTranslateY = mouseY - (mouseY - viewState.translateY) * scaleRatio;

    setViewState({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
  }, [viewState, selectionMode]);

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

  // Generate lasso path string
  const lassoPathString = useMemo(() => {
    if (lassoPath.length < 2) return '';
    return lassoPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  }, [lassoPath]);


  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-muted-foreground/30">
        <p className="text-muted-foreground font-mono">No data loaded</p>
      </div>
    );
  }

  const transformStr = `translate(${viewState.translateX}, ${viewState.translateY}) scale(${viewState.scale})`;
  const zoomPercent = Math.round(viewState.scale * 100);

  return (
    <div className="relative w-full h-full">
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
      
      {/* Help hint */}
      <div className="absolute bottom-2 left-2 z-10 font-mono text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded">
        Scroll: zoom • Drag: pan • Double-click: zoom in
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        className={`w-full h-full ${selectionMode === 'lasso' ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ background: 'hsl(var(--card))' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
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
          {/* Smooth clip path for filled heatmap with padding */}
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
          {/* Phase 3: Blur filter for smooth gradient blending */}
          <filter id="gradient-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={blurIntensity} result="blur" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Transform group for zoom/pan */}
        <g transform={transformStr}>

      {/* Phase 1: Boundary shape filled with Phase 2+3: Dense gradient cells with blur */}
      {heatmapMode === 'filled' && gradientCells.length > 0 && (
        <g clipPath="url(#heatmap-smooth-clip)">
          {/* Apply blur for smooth blending between cells */}
          <g filter="url(#gradient-blur)">
            {gradientCells.map((cell, i) => {
              const { cx, cy } = transformPoint(cell.x, cell.y);
              const color = getColorForValue(cell.value, minValue, maxValue, colorScheme);
              // Cells overlap by 2x to ensure no gaps
              const cellSize = Math.max(cell.width, cell.height) * scale * 2;
              return (
                <rect
                  key={`g-${i}`}
                  x={cx - cellSize / 2}
                  y={cy - cellSize / 2}
                  width={cellSize}
                  height={cellSize}
                  fill={color}
                />
              );
            })}
          </g>
        </g>
      )}

      {/* Background interpolation for dots mode */}
      {heatmapMode === 'dots' && showInterpolation && interpolatedCells.length > 0 && (
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
            pointRadius * 0.5
          )}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}

      {/* Solid smooth boundary outline for filled mode */}
      {heatmapMode === 'filled' && boundaryContour.length >= 3 && (
        <path
          d={generateSmoothBoundaryPath(
            boundaryContour.map(p => {
              const { cx, cy } = transformPoint(p.x, p.y);
              return { x: cx, y: cy };
            }),
            pointRadius * 0.5
          )}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}

      {/* Data points - only show in dots mode */}
      {heatmapMode === 'dots' && normalizedPoints.map((point) => (
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
          {/* Selection ring for lasso-selected points */}
          {point.isSelected && (
            <circle
              cx={point.cx}
              cy={point.cy}
              r={pointRadius + 5}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          )}
          <circle
            cx={point.cx}
            cy={point.cy}
            r={pointRadius}
            fill={point.color}
            stroke={
              point.isHighlighted 
                ? 'hsl(var(--destructive))' 
                : point.isSelected
                  ? 'hsl(var(--primary))'
                  : selectedPoint?.id === point.id 
                    ? 'hsl(var(--foreground))' 
                    : 'hsl(var(--border))'
            }
            strokeWidth={selectedPoint?.id === point.id || point.isHighlighted || point.isSelected ? 3 : 1}
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
      ))}


      {/* Lasso selection path */}
      {isDrawing && lassoPathString && (
        <path
          d={lassoPathString}
          fill="hsl(var(--primary) / 0.1)"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
      )}

        {/* Axis labels */}
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
        </g>
      </svg>
    </div>
  );
};
