import React, { useMemo, useCallback, useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
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
  onTransformChange: (t: OverlayTransform) => void;
  pointSettings: OverlayPointSettings;
  containerWidth: number;
  containerHeight: number;
}

export interface OverlayCanvasRef {
  exportToDataURL: (format: 'png' | 'svg', dpi: number) => Promise<string>;
  fitImageToData: () => void;
  centerImage: () => void;
  getCanvasDimensions: () => { width: number; height: number };
}

export const OverlayCanvas = forwardRef<OverlayCanvasRef, OverlayCanvasProps>(({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  imageUrl,
  transform,
  onTransformChange,
  pointSettings,
  containerWidth,
  containerHeight,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; type: 'pan' | 'image'; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const rafRef = useRef<number>(0);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
  const prevImageUrlRef = useRef<string | null>(null);

  // === STALE CLOSURE FIX: keep transform in a ref ===
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  const onTransformChangeRef = useRef(onTransformChange);
  useEffect(() => { onTransformChangeRef.current = onTransformChange; }, [onTransformChange]);

  const width = containerWidth || 800;
  const height = containerHeight || 600;

  // Load image dimensions
  useEffect(() => {
    if (!imageUrl) { setImageDimensions(null); return; }
    const img = new Image();
    img.onload = () => setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  // Data bounds
  const dataBounds = useMemo(() => {
    if (points.length === 0) return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of points) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    return { xMin, xMax, yMin, yMax };
  }, [points]);

  const margin = 40;
  const plotWidth = width - margin * 2;
  const plotHeight = height - margin * 2;
  const xRange = dataBounds.xMax - dataBounds.xMin || 1;
  const yRange = dataBounds.yMax - dataBounds.yMin || 1;
  const scaleX = plotWidth / xRange;
  const scaleY = plotHeight / yRange;

  // Compute colored points data (no DOM nodes)
  const coloredPoints = useMemo(() => points.map(p => {
    const val = p.properties[selectedProperty] ?? 0;
    const cx = margin + (p.x - dataBounds.xMin) * scaleX;
    const cy = margin + plotHeight - (p.y - dataBounds.yMin) * scaleY;
    return { cx, cy, color: getColorForValue(val, minValue, maxValue, colorScheme) };
  }), [points, selectedProperty, colorScheme, minValue, maxValue, dataBounds, scaleX, scaleY, plotHeight]);

  // Point radius
  const pointRadius = useMemo(() => {
    if (points.length === 0) return 5;
    const avgDist = Math.sqrt((xRange * yRange) / points.length);
    return Math.max(2, Math.min(10, avgDist * scaleX * 0.35)) * pointSettings.sizeMultiplier;
  }, [points.length, xRange, yRange, scaleX, pointSettings.sizeMultiplier]);

  // Fit / Center helpers
  const fitImageToData = useCallback(() => {
    if (!imageDimensions) return;
    const scaleToFitX = plotWidth / imageDimensions.w;
    const scaleToFitY = plotHeight / imageDimensions.h;
    const fitScale = Math.min(scaleToFitX, scaleToFitY);
    onTransformChangeRef.current({ ...transformRef.current, scale: fitScale, offsetX: 0, offsetY: 0, rotation: 0 });
  }, [imageDimensions, plotWidth, plotHeight]);

  const centerImage = useCallback(() => {
    onTransformChangeRef.current({ ...transformRef.current, offsetX: 0, offsetY: 0 });
  }, []);

  // === AUTO-FIT on first image upload ===
  useEffect(() => {
    if (imageUrl && imageDimensions && prevImageUrlRef.current !== imageUrl) {
      prevImageUrlRef.current = imageUrl;
      // Auto-fit: schedule after state settles
      requestAnimationFrame(() => fitImageToData());
    }
    if (!imageUrl) {
      prevImageUrlRef.current = null;
    }
  }, [imageUrl, imageDimensions, fitImageToData]);

  // Draw points onto canvas (single redraw, no DOM nodes)
  useEffect(() => {
    const canvas = pointsCanvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = pointSettings.opacity / 100;
    for (const p of coloredPoints) {
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }, [coloredPoints, pointRadius, pointSettings.opacity, width, height]);

  // Apply view transform via DOM (no re-render)
  const applyViewTransform = useCallback(() => {
    if (!sceneRef.current) return;
    const { x, y, zoom } = viewRef.current;
    sceneRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  }, []);

  // === STABLE mouse handlers using refs — no stale closures ===
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const t = transformRef.current;
    if (e.altKey) {
      dragRef.current = { active: true, type: 'pan', startX: e.clientX - viewRef.current.x, startY: e.clientY - viewRef.current.y, startOffsetX: 0, startOffsetY: 0 };
    } else if (imageUrl) {
      dragRef.current = { active: true, type: 'image', startX: e.clientX, startY: e.clientY, startOffsetX: t.offsetX, startOffsetY: t.offsetY };
    }
  }, [imageUrl]); // no transform dependency!

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current?.active) return;
    if (dragRef.current.type === 'pan') {
      viewRef.current.x = e.clientX - dragRef.current.startX;
      viewRef.current.y = e.clientY - dragRef.current.startY;
      applyViewTransform();
    } else {
      const zoom = viewRef.current.zoom || 1;
      const dx = (e.clientX - dragRef.current.startX) / zoom;
      const dy = (e.clientY - dragRef.current.startY) / zoom;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onTransformChangeRef.current({
          ...transformRef.current,
          offsetX: dragRef.current!.startOffsetX + dx,
          offsetY: dragRef.current!.startOffsetY + dy,
        });
      });
    }
  }, [applyViewTransform]); // no transform dependency!

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) dragRef.current.active = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.altKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      viewRef.current.zoom = Math.max(0.1, Math.min(10, viewRef.current.zoom * delta));
      applyViewTransform();
    }
    // No scroll-to-scale — image scale is controlled only via sidebar slider
  }, [applyViewTransform]);

  // Image CSS transform
  const imageStyle = useMemo((): React.CSSProperties => {
    if (!imageDimensions) return {};
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: imageDimensions.w,
      height: imageDimensions.h,
      transform: `translate(-50%, -50%) translate(${transform.offsetX}px, ${transform.offsetY}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
      opacity: transform.opacity / 100,
      pointerEvents: 'none' as const,
      willChange: 'transform',
    };
  }, [imageDimensions, transform]);

  // Export
  useImperativeHandle(ref, () => ({
    fitImageToData,
    centerImage,
    getCanvasDimensions: () => ({ width, height }),
    exportToDataURL: async (format, dpi) => {
      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      svg.setAttribute('xmlns', svgNs);
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      const bg = document.createElementNS(svgNs, 'rect');
      bg.setAttribute('width', String(width));
      bg.setAttribute('height', String(height));
      bg.setAttribute('fill', 'white');
      svg.appendChild(bg);

      if (imageUrl && imageDimensions) {
        const g = document.createElementNS(svgNs, 'g');
        const cx = width / 2 + transform.offsetX;
        const cy = height / 2 + transform.offsetY;
        g.setAttribute('transform', `translate(${cx}, ${cy}) rotate(${transform.rotation}) scale(${transform.scale}) translate(${-imageDimensions.w / 2}, ${-imageDimensions.h / 2})`);
        g.setAttribute('opacity', String(transform.opacity / 100));
        const img = document.createElementNS(svgNs, 'image');
        img.setAttribute('href', imageUrl);
        img.setAttribute('width', String(imageDimensions.w));
        img.setAttribute('height', String(imageDimensions.h));
        g.appendChild(img);
        svg.appendChild(g);
      }

      const pg = document.createElementNS(svgNs, 'g');
      pg.setAttribute('opacity', String(pointSettings.opacity / 100));
      for (const p of coloredPoints) {
        const c = document.createElementNS(svgNs, 'circle');
        c.setAttribute('cx', String(p.cx));
        c.setAttribute('cy', String(p.cy));
        c.setAttribute('r', String(pointRadius));
        c.setAttribute('fill', p.color);
        c.setAttribute('stroke', 'rgba(0,0,0,0.3)');
        c.setAttribute('stroke-width', '0.5');
        pg.appendChild(c);
      }
      svg.appendChild(pg);

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);

      if (format === 'svg') {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
      }

      const canvas = document.createElement('canvas');
      const sf = dpi / 96;
      canvas.width = width * sf;
      canvas.height = height * sf;
      const ctx = canvas.getContext('2d')!;
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      return new Promise<string>(resolve => {
        const img = new Image();
        img.onload = () => {
          ctx.scale(sf, sf);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = url;
      });
    },
  }), [width, height, imageUrl, imageDimensions, transform, pointSettings, coloredPoints, pointRadius, fitImageToData, centerImage]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-muted/20 relative"
      style={{ cursor: dragRef.current?.active ? 'grabbing' : (imageUrl ? 'grab' : 'default') }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        ref={sceneRef}
        style={{ width, height, position: 'relative', transformOrigin: '0 0', willChange: 'transform' }}
      >
        {imageUrl && imageDimensions && (
          <img src={imageUrl} alt="Overlay" style={imageStyle} draggable={false} />
        )}
        <canvas
          ref={pointsCanvasRef}
          width={width}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
      </div>

      {!imageUrl && points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground font-mono text-sm">
            Upload a microscope image and load data to begin
          </span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-muted-foreground/60 pointer-events-none select-none">
        Drag: move image · Scroll: scale · Alt+drag: pan · Alt+scroll: zoom
      </div>
    </div>
  );
});

OverlayCanvas.displayName = 'OverlayCanvas';
