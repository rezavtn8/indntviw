import React, { useRef } from 'react';
import { Upload, RotateCcw, Download, Trash2, Maximize, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  OverlayTransform,
  OverlayPointSettings,
  DEFAULT_OVERLAY_TRANSFORM,
  DEFAULT_OVERLAY_POINT_SETTINGS,
  OverlayCanvasRef,
} from '@/components/visualization/OverlayCanvas';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// Standalone memoized slider row — no ref warnings, no re-mount
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
  canvasRef: React.RefObject<OverlayCanvasRef>;
}

export const OverlayControlsPanel: React.FC<OverlayControlsPanelProps> = ({
  imageUrl,
  onImageChange,
  transform,
  onTransformChange,
  pointSettings,
  onPointSettingsChange,
  canvasRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  return (
    <div className="space-y-3">
      {/* Image Upload — compact row */}
      <div className="space-y-1.5">
        <Label className="text-xs font-mono uppercase font-medium">Microscope Image</Label>
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

      {/* Image Transform — flat, no collapsible */}
      {imageUrl && (
        <div className="space-y-2 pt-1 border-t border-border">
          <SliderRow label="Opacity" value={transform.opacity} min={0} max={100} step={1} onChange={v => onTransformChange({ ...transform, opacity: v })} unit="%" />
          <SliderRow label="Scale" value={transform.scale} min={0.1} max={5} step={0.01} onChange={v => onTransformChange({ ...transform, scale: v })} unit="x" />
          <SliderRow label="Rotation" value={transform.rotation} min={0} max={360} step={1} onChange={v => onTransformChange({ ...transform, rotation: v })} unit="°" />
          <SliderRow label="X Offset" value={transform.offsetX} min={-500} max={500} step={1} onChange={v => onTransformChange({ ...transform, offsetX: v })} unit="px" />
          <SliderRow label="Y Offset" value={transform.offsetY} min={-500} max={500} step={1} onChange={v => onTransformChange({ ...transform, offsetY: v })} unit="px" />
          <div className="flex gap-1">
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
      )}

      {/* Point Settings — flat */}
      <div className="space-y-2 pt-1 border-t border-border">
        <Label className="text-xs font-mono uppercase font-medium">Points</Label>
        <SliderRow label="Size" value={pointSettings.sizeMultiplier} min={0.3} max={3} step={0.1} onChange={v => onPointSettingsChange({ ...pointSettings, sizeMultiplier: v })} unit="x" />
        <SliderRow label="Opacity" value={pointSettings.opacity} min={0} max={100} step={1} onChange={v => onPointSettingsChange({ ...pointSettings, opacity: v })} unit="%" />
      </div>

      {/* Export — single compact row */}
      <div className="space-y-2 pt-1 border-t border-border">
        <Label className="text-xs font-mono uppercase font-medium">Export</Label>
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
