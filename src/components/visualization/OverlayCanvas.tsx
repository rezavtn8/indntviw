import React, { useMemo, useCallback, useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue } from '@/utils/colorScales';

export interface OverlayTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface OverlayPointSettings {
  sizeMultiplier: number;
  opacity: number;
}

export const DEFAULT_OVERLAY_TRANSFORM: OverlayTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  opacity: 80,
};

export const DEFAULT_OVERLAY_POINT_SETTINGS: OverlayPointSettings = {
  sizeMultiplier: 1,
  opacity: 90,
};

interface OverlayCanvasProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  imageUrl: string | null;
  transform: OverlayTransform;
  pointSettings: OverlayPointSettings;
  width: number;
  height: number;
}

export interface OverlayCanvasRef {
  exportToDataURL: (format: 'png' | 'svg', dpi: number) => Promise<string>;
}

export const OverlayCanvas = forwardRef<OverlayCanvasRef, OverlayCanvasProps>(({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  imageUrl,
  transform,
  pointSettings,
  width,
  height,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);

  // Pan/zoom state for the entire view
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [viewZoom, setViewZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Load image dimensions
  useEffect(() => {
    if (!imageUrl) { setImageDimensions(null); return; }
    const img = new Image();
    img.onload = () => setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate data bounds
  const dataBounds = useMemo(() => {
    if (points.length === 0) return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return { xMin: Math.min(...xs), xMax: Math.max(...xs), yMin: Math.min(...ys), yMax: Math.max(...ys) };
  }, [points]);

  const margin = 40;
  const plotWidth = width - margin * 2;
  const plotHeight = height - margin * 2;
  const xRange = dataBounds.xMax - dataBounds.xMin || 1;
  const yRange = dataBounds.yMax - dataBounds.yMin || 1;
  const scaleX = plotWidth / xRange;
  const scaleY = plotHeight / yRange;

  const transformPoint = useCallback((x: number, y: number) => ({
    cx: margin + (x - dataBounds.xMin) * scaleX,
    cy: margin + plotHeight - (y - dataBounds.yMin) * scaleY,
  }), [dataBounds, scaleX, scaleY, plotHeight]);

  // Point radius
  const pointRadius = useMemo(() => {
    if (points.length === 0) return 5;
    const avgDist = Math.sqrt((xRange * yRange) / points.length);
    return Math.max(2, Math.min(10, avgDist * scaleX * 0.35)) * pointSettings.sizeMultiplier;
  }, [points.length, xRange, yRange, scaleX, pointSettings.sizeMultiplier]);

  // Colored points
  const coloredPoints = useMemo(() => points.map(p => {
    const val = p.properties[selectedProperty] ?? 0;
    const { cx, cy } = transformPoint(p.x, p.y);
    return { cx, cy, color: getColorForValue(val, minValue, maxValue, colorScheme) };
  }), [points, selectedProperty, colorScheme, minValue, maxValue, transformPoint]);

  // Image transform string (applied to image layer only)
  const imageTransformStr = useMemo(() => {
    if (!imageDimensions) return '';
    const centerX = width / 2 + transform.offsetX;
    const centerY = height / 2 + transform.offsetY;
    return `translate(${centerX}, ${centerY}) rotate(${transform.rotation}) scale(${transform.scale}) translate(${-imageDimensions.w / 2}, ${-imageDimensions.h / 2})`;
  }, [transform, imageDimensions, width, height]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y });
    }
  }, [viewOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setViewOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewZoom(z => Math.max(0.1, Math.min(10, z * delta)));
  }, []);

  // Export
  useImperativeHandle(ref, () => ({
    exportToDataURL: async (format, dpi) => {
      if (!svgRef.current) return '';
      const serializer = new XMLSerializer();
      // Clone and remove view transform for export
      const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
      const g = clone.querySelector('[data-view-group]');
      if (g) g.removeAttribute('transform');

      if (format === 'svg') {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serializer.serializeToString(clone));
      }

      const canvas = document.createElement('canvas');
      const sf = dpi / 96;
      canvas.width = width * sf;
      canvas.height = height * sf;
      const ctx = canvas.getContext('2d')!;
      const svgBlob = new Blob([serializer.serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      return new Promise<string>(resolve => {
        const img = new Image();
        img.onload = () => { ctx.scale(sf, sf); ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/png')); };
        img.src = url;
      });
    },
  }), [width, height]);

  const viewTransform = `translate(${viewOffset.x}, ${viewOffset.y}) scale(${viewZoom})`;

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-muted/20">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-w-full max-h-full"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <rect width={width} height={height} fill="white" />
        <g data-view-group transform={viewTransform}>
          {/* Background image */}
          {imageUrl && imageDimensions && (
            <g transform={imageTransformStr} opacity={transform.opacity / 100}>
              <image href={imageUrl} width={imageDimensions.w} height={imageDimensions.h} />
            </g>
          )}

          {/* Data points */}
          <g opacity={pointSettings.opacity / 100}>
            {coloredPoints.map((p, i) => (
              <circle key={i} cx={p.cx} cy={p.cy} r={pointRadius} fill={p.color} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />
            ))}
          </g>
        </g>

        {/* No-image placeholder */}
        {!imageUrl && points.length === 0 && (
          <text x={width / 2} y={height / 2} textAnchor="middle" fill="#999" fontSize={14} fontFamily="monospace">
            Upload a microscope image and load data to begin
          </text>
        )}
      </svg>
    </div>
  );
});

OverlayCanvas.displayName = 'OverlayCanvas';
