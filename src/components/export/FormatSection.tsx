import React from 'react';
import { ExportSettings } from '@/types/zones';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileImage, FileCode, FileText, FlipHorizontal, FlipVertical, ChevronDown, Move, Circle } from 'lucide-react';

interface FormatSectionProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
}

const DPI_PRESETS = [
  { value: 72, label: '72 (Screen)' },
  { value: 150, label: '150 (Draft)' },
  { value: 300, label: '300 (Print)' },
  { value: 600, label: '600 (High)' },
];

const SIZE_PRESETS = [
  { value: '800x600', label: '800×600', width: 800, height: 600 },
  { value: '1200x900', label: '1200×900', width: 1200, height: 900 },
  { value: '1600x1200', label: '1600×1200', width: 1600, height: 1200 },
  { value: '1920x1440', label: '1920×1440', width: 1920, height: 1440 },
];

export const FormatSection: React.FC<FormatSectionProps> = ({ settings, onSettingsChange }) => {
  const xStretch = settings.xStretch ?? 1.0;
  const yStretch = settings.yStretch ?? 1.0;
  const flipXAxis = settings.flipXAxis ?? false;
  const flipYAxis = settings.flipYAxis ?? false;
  const pointSize = settings.pointSize ?? 1.0;

  const handleSizePreset = (preset: string) => {
    const size = SIZE_PRESETS.find(s => s.value === preset);
    if (size) {
      onSettingsChange({ ...settings, width: size.width, height: size.height });
    }
  };

  const currentSizePreset = SIZE_PRESETS.find(
    s => s.width === settings.width && s.height === settings.height
  )?.value || 'custom';

  return (
    <div className="space-y-4">
      {/* Format Selection - Compact Cards */}
      <div className="space-y-2">
        <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Format
        </Label>
        <RadioGroup
          value={settings.format}
          onValueChange={(value: ExportSettings['format']) => 
            onSettingsChange({ ...settings, format: value })
          }
          className="grid grid-cols-3 gap-1.5"
        >
          {[
            { value: 'png', icon: FileImage, label: 'PNG' },
            { value: 'svg', icon: FileCode, label: 'SVG' },
            { value: 'pdf', icon: FileText, label: 'PDF' },
          ].map(({ value, icon: Icon, label }) => (
            <div key={value}>
              <RadioGroupItem value={value} id={`format-${value}`} className="peer sr-only" />
              <Label
                htmlFor={`format-${value}`}
                className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-2.5 hover:bg-accent/50 hover:border-accent transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
              >
                <Icon className="w-4 h-4 mb-0.5 text-muted-foreground" />
                <span className="text-[10px] font-medium">{label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Size & DPI - Inline */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Size</Label>
          <Select value={currentSizePreset} onValueChange={handleSizePreset}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_PRESETS.map(preset => (
                <SelectItem key={preset.value} value={preset.value} className="text-xs">
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {settings.format === 'png' && (
          <div className="flex-1 space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">DPI</Label>
            <Select
              value={settings.dpi.toString()}
              onValueChange={(value) => onSettingsChange({ ...settings, dpi: parseInt(value) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DPI_PRESETS.map(preset => (
                  <SelectItem key={preset.value} value={preset.value.toString()} className="text-xs">
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Transform Controls - Collapsible */}
      <Collapsible defaultOpen className="rounded-lg border border-border bg-card/50">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/30 transition-colors rounded-lg">
          <div className="flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Transform</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Stretch Controls - Compact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">X Stretch</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">{xStretch.toFixed(1)}×</span>
                </div>
                <Slider
                  value={[xStretch]}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onValueChange={([value]) => onSettingsChange({ ...settings, xStretch: value })}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Y Stretch</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">{yStretch.toFixed(1)}×</span>
                </div>
                <Slider
                  value={[yStretch]}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onValueChange={([value]) => onSettingsChange({ ...settings, yStretch: value })}
                />
              </div>
            </div>

            {/* Flip Controls - Inline */}
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={flipXAxis}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, flipXAxis: checked })}
                  className="scale-90"
                />
                <FlipHorizontal className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px]">Flip X</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={flipYAxis}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, flipYAxis: checked })}
                  className="scale-90"
                />
                <FlipVertical className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px]">Flip Y</span>
              </label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Point Size - Standalone compact section */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Circle className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Point Size</span>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">{pointSize.toFixed(1)}×</span>
        </div>
        <Slider
          value={[pointSize]}
          onValueChange={([value]) => onSettingsChange({ ...settings, pointSize: value })}
          min={0.3}
          max={3.0}
          step={0.1}
        />
      </div>
    </div>
  );
};
