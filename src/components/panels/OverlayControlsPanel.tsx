import React, { useRef } from 'react';
import { Upload, RotateCcw, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  OverlayTransform,
  OverlayPointSettings,
  DEFAULT_OVERLAY_TRANSFORM,
  DEFAULT_OVERLAY_POINT_SETTINGS,
  OverlayCanvasRef,
} from '@/components/visualization/OverlayCanvas';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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
      if (exportFormat === 'pdf') {
        const dataUrl = await canvasRef.current.exportToDataURL('png', exportDpi);
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [800, 600] });
        pdf.addImage(dataUrl, 'PNG', 0, 0, 800, 600);
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

  const SliderRow = ({ label, value, min, max, step, onChange, unit }: {
    label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className="text-xs font-mono">{label}</Label>
        <span className="text-xs text-muted-foreground font-mono">{value}{unit || ''}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase font-medium">Microscope Image</Label>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" />
            {imageUrl ? 'Replace' : 'Upload'}
          </Button>
          {imageUrl && (
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onImageChange(null)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Image Transform */}
      {imageUrl && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="font-mono text-xs uppercase font-medium">Image Transform</span>
            <ChevronDown className="w-4 h-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <SliderRow label="X Offset" value={transform.offsetX} min={-500} max={500} step={1} onChange={v => onTransformChange({ ...transform, offsetX: v })} unit="px" />
            <SliderRow label="Y Offset" value={transform.offsetY} min={-500} max={500} step={1} onChange={v => onTransformChange({ ...transform, offsetY: v })} unit="px" />
            <SliderRow label="Scale" value={transform.scale} min={0.1} max={10} step={0.05} onChange={v => onTransformChange({ ...transform, scale: v })} unit="x" />
            <SliderRow label="Rotation" value={transform.rotation} min={0} max={360} step={1} onChange={v => onTransformChange({ ...transform, rotation: v })} unit="°" />
            <SliderRow label="Opacity" value={transform.opacity} min={0} max={100} step={1} onChange={v => onTransformChange({ ...transform, opacity: v })} unit="%" />
            <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => onTransformChange(DEFAULT_OVERLAY_TRANSFORM)}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset Transform
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Point Settings */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
          <span className="font-mono text-xs uppercase font-medium">Points</span>
          <ChevronDown className="w-4 h-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <SliderRow label="Size" value={pointSettings.sizeMultiplier} min={0.3} max={3} step={0.1} onChange={v => onPointSettingsChange({ ...pointSettings, sizeMultiplier: v })} unit="x" />
          <SliderRow label="Opacity" value={pointSettings.opacity} min={0} max={100} step={1} onChange={v => onPointSettingsChange({ ...pointSettings, opacity: v })} unit="%" />
          <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => onPointSettingsChange(DEFAULT_OVERLAY_POINT_SETTINGS)}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset Points
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Export */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
          <span className="font-mono text-xs uppercase font-medium">Export</span>
          <ChevronDown className="w-4 h-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="grid grid-cols-3 gap-1">
            {(['png', 'svg', 'pdf'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`px-2 py-1.5 rounded text-xs font-mono uppercase transition-colors ${
                  exportFormat === fmt ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          {exportFormat !== 'svg' && (
            <div className="space-y-1">
              <Label className="text-xs font-mono">DPI</Label>
              <Input type="number" value={exportDpi} onChange={e => setExportDpi(Number(e.target.value))} className="h-8 text-xs font-mono" />
            </div>
          )}
          <Button onClick={handleExport} disabled={isExporting} className="w-full gap-2" size="sm">
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
