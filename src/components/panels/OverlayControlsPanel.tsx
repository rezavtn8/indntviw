import React, { useRef } from 'react';
import { Upload, RotateCcw, Download, Trash2, Maximize, Crosshair, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  OverlayTransform,
  OverlayPointSettings,
  PointsTransform,
  OverlayActiveLayer,
  DEFAULT_OVERLAY_TRANSFORM,
  DEFAULT_POINTS_TRANSFORM,
  OverlayCanvasRef,
} from '@/components/visualization/OverlayCanvas';
import { BRAND } from '@/components/layout/Brand';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const SliderRow: React.FC<{
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string;
}> = React.memo(({ label, value, min, max, step, onChange, unit }) => (
  <div className="flex items-center gap-2">
    <Label className="text-xs font-mono w-16 shrink-0">{label}</Label>
    <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} className="flex-1" />
    <span className="text-xs text-muted-foreground font-mono w-12 text-right">{value}{unit || ''}</span>
  </div>
));
SliderRow.displayName = 'SliderRow';

interface OverlayControlsPanelProps {
  imageUrl: string | null;
  onImageChange: (file: File | null) => void;
  transform: OverlayTransform;
  onTransformChange: (t: OverlayTransform) => void;
  pointSettings: OverlayPointSettings;
  onPointSettingsChange: (s: OverlayPointSettings) => void;
  pointsTransform: PointsTransform;
  onPointsTransformChange: (t: PointsTransform) => void;
  activeLayer: OverlayActiveLayer;
  onActiveLayerChange: (l: OverlayActiveLayer) => void;
  canvasRef: React.RefObject<OverlayCanvasRef>;
  pointsVisible: boolean;
  onPointsVisibleChange: (v: boolean) => void;
  uploadInputRef?: React.RefObject<HTMLInputElement>;
}

export const OverlayControlsPanel: React.FC<OverlayControlsPanelProps> = ({
  imageUrl,
  onImageChange,
  transform,
  onTransformChange,
  pointSettings,
  onPointSettingsChange,
  pointsTransform,
  onPointsTransformChange,
  activeLayer,
  onActiveLayerChange,
  canvasRef,
  pointsVisible,
  onPointsVisibleChange,
  uploadInputRef,
}) => {
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = uploadInputRef ?? localFileInputRef;
  const [exportFormat, setExportFormat] = React.useState<'png' | 'svg' | 'pdf'>('png');
  const [exportDpi, setExportDpi] = React.useState(300);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageChange(file);
    e.target.value = '';
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dims = canvasRef.current.getCanvasDimensions();
      if (exportFormat === 'pdf') {
        const dataUrl = await canvasRef.current.exportToDataURL('png', exportDpi);
        const pdf = new jsPDF({ orientation: dims.width >= dims.height ? 'landscape' : 'portrait', unit: 'px', format: [dims.width, dims.height] });
        pdf.addImage(dataUrl, 'PNG', 0, 0, dims.width, dims.height);
        pdf.save('overlay_export.pdf');
      } else {
        const dataUrl = await canvasRef.current.exportToDataURL(exportFormat === 'svg' ? 'svg' : 'png', exportDpi);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `overlay_export.${exportFormat}`;
        a.click();
      }
      toast.success(`Exported as ${exportFormat.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFitPoints = () => {
    canvasRef.current?.centerPoints();
    onPointsTransformChange({ ...pointsTransform, scale: 1, xStretch: 1, yStretch: 1, offsetX: 0, offsetY: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div className="space-y-1.5">
        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Microscope Image</Label>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-7" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3 h-3" />
            {imageUrl ? 'Replace' : 'Upload'}
          </Button>
          {imageUrl && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => onImageChange(null)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Layer Selector — Points pill includes inline visibility toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Active Layer</Label>
        <div className="flex gap-1">
          <button
            onClick={() => onActiveLayerChange('image')}
            className="flex-1 px-2 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors border"
            style={
              activeLayer === 'image'
                ? { background: BRAND.navy, color: '#fff', borderColor: BRAND.navy }
                : { background: 'transparent', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }
            }
          >
            Image
          </button>
          <button
            onClick={() => onActiveLayerChange('points')}
            className="flex-1 px-2 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors border flex items-center justify-center gap-1.5"
            style={
              activeLayer === 'points'
                ? { background: BRAND.teal, color: '#fff', borderColor: BRAND.teal }
                : { background: 'transparent', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }
            }
          >
            <span>Points</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onPointsVisibleChange(!pointsVisible); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPointsVisibleChange(!pointsVisible); } }}
              className="inline-flex items-center justify-center w-4 h-4 rounded hover:bg-black/10 transition-colors cursor-pointer"
              title={pointsVisible ? 'Hide points' : 'Show points'}
            >
              {pointsVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </span>
          </button>
        </div>
      </div>

      {/* Context-aware layer controls */}
      {activeLayer === 'image' ? (
        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Image Controls</Label>
          <SliderRow label="Opacity" value={transform.opacity} min={0} max={100} step={1} onChange={v => onTransformChange({ ...transform, opacity: v })} unit="%" />
          <SliderRow label="Scale" value={transform.scale} min={0.05} max={5} step={0.01} onChange={v => onTransformChange({ ...transform, scale: v })} unit="x" />
          <SliderRow label="Rotation" value={transform.rotation} min={0} max={360} step={1} onChange={v => onTransformChange({ ...transform, rotation: v })} unit="°" />
          <SliderRow label="X Offset" value={transform.offsetX} min={-500} max={500} step={1} onChange={v => onTransformChange({ ...transform, offsetX: v })} unit="px" />
          <SliderRow label="Y Offset" value={transform.offsetY} min={-500} max={500} step={1} onChange={v => onTransformChange({ ...transform, offsetY: v })} unit="px" />
          <div className="flex gap-1 pt-1">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-7 gap-1" onClick={() => canvasRef.current?.fitImageToData()}>
              <Maximize className="w-3 h-3" /> Fit
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs h-7 gap-1" onClick={() => canvasRef.current?.centerImage()}>
              <Crosshair className="w-3 h-3" /> Center
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs h-7 gap-1" onClick={() => onTransformChange(DEFAULT_OVERLAY_TRANSFORM)}>
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Points Controls</Label>
          <SliderRow label="X Stretch" value={pointsTransform.xStretch ?? 1} min={0.1} max={5} step={0.05} onChange={v => onPointsTransformChange({ ...pointsTransform, xStretch: v })} unit="x" />
          <SliderRow label="Y Stretch" value={pointsTransform.yStretch ?? 1} min={0.1} max={5} step={0.05} onChange={v => onPointsTransformChange({ ...pointsTransform, yStretch: v })} unit="x" />
          <SliderRow label="Opacity" value={pointsTransform.opacity} min={0} max={100} step={1} onChange={v => onPointsTransformChange({ ...pointsTransform, opacity: v })} unit="%" />
          <SliderRow label="Scale" value={pointsTransform.scale} min={0.05} max={5} step={0.01} onChange={v => onPointsTransformChange({ ...pointsTransform, scale: v })} unit="x" />
          <SliderRow label="Size" value={pointSettings.sizeMultiplier} min={0.3} max={3} step={0.1} onChange={v => onPointSettingsChange({ ...pointSettings, sizeMultiplier: v })} unit="x" />
          <SliderRow label="X Offset" value={pointsTransform.offsetX} min={-500} max={500} step={1} onChange={v => onPointsTransformChange({ ...pointsTransform, offsetX: v })} unit="px" />
          <SliderRow label="Y Offset" value={pointsTransform.offsetY} min={-500} max={500} step={1} onChange={v => onPointsTransformChange({ ...pointsTransform, offsetY: v })} unit="px" />
          <div className="flex gap-1 pt-1">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-7 gap-1" onClick={handleFitPoints}>
              <Maximize className="w-3 h-3" /> Fit
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs h-7 gap-1" onClick={() => canvasRef.current?.centerPoints()}>
              <Crosshair className="w-3 h-3" /> Center
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs h-7 gap-1" onClick={() => onPointsTransformChange(DEFAULT_POINTS_TRANSFORM)}>
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          </div>
        </div>
      )}

      {/* Export */}
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Export</Label>
        <div className="flex gap-1">
          {(['png', 'svg', 'pdf'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => setExportFormat(fmt)}
              className={`flex-1 px-2 py-1 rounded text-xs font-mono uppercase transition-colors ${
                exportFormat === fmt ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
        {exportFormat !== 'svg' && (
          <div className="flex items-center gap-2">
            <Label className="text-xs font-mono w-16 shrink-0">DPI</Label>
            <Input type="number" value={exportDpi} onChange={e => setExportDpi(Number(e.target.value))} className="h-7 text-xs font-mono flex-1" />
          </div>
        )}
        <Button onClick={handleExport} disabled={isExporting} className="w-full gap-1.5 h-8" size="sm">
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
        </Button>
      </div>
    </div>
  );
};
