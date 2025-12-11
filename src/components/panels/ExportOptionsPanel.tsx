import React from 'react';
import { ExportSettings } from '@/types/zones';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileImage, FileCode, FileText } from 'lucide-react';

interface ExportOptionsPanelProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  onExport: () => void;
  isExporting: boolean;
}

const DPI_PRESETS = [
  { value: 72, label: '72 DPI (Screen)' },
  { value: 150, label: '150 DPI (Draft)' },
  { value: 300, label: '300 DPI (Print)' },
  { value: 600, label: '600 DPI (High Quality)' },
];

const SIZE_PRESETS = [
  { value: '800x600', label: 'Small (800×600)', width: 800, height: 600 },
  { value: '1200x900', label: 'Medium (1200×900)', width: 1200, height: 900 },
  { value: '1600x1200', label: 'Large (1600×1200)', width: 1600, height: 1200 },
  { value: '1920x1440', label: 'HD (1920×1440)', width: 1920, height: 1440 },
];

export const ExportOptionsPanel: React.FC<ExportOptionsPanelProps> = ({
  settings,
  onSettingsChange,
  onExport,
  isExporting,
}) => {
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
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Format</Label>
        <RadioGroup
          value={settings.format}
          onValueChange={(value: ExportSettings['format']) => 
            onSettingsChange({ ...settings, format: value })
          }
          className="grid grid-cols-3 gap-2"
        >
          <div>
            <RadioGroupItem value="png" id="format-png" className="peer sr-only" />
            <Label
              htmlFor="format-png"
              className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <FileImage className="w-5 h-5 mb-1" />
              <span className="text-xs font-mono">PNG</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="svg" id="format-svg" className="peer sr-only" />
            <Label
              htmlFor="format-svg"
              className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <FileCode className="w-5 h-5 mb-1" />
              <span className="text-xs font-mono">SVG</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="pdf" id="format-pdf" className="peer sr-only" />
            <Label
              htmlFor="format-pdf"
              className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <FileText className="w-5 h-5 mb-1" />
              <span className="text-xs font-mono">PDF</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Size */}
      <div className="space-y-3">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Size</Label>
        <Select value={currentSizePreset} onValueChange={handleSizePreset}>
          <SelectTrigger className="font-mono">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {SIZE_PRESETS.map(preset => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DPI (for PNG) */}
      {settings.format === 'png' && (
        <div className="space-y-3">
          <Label className="text-xs font-mono uppercase text-muted-foreground">Resolution</Label>
          <Select
            value={settings.dpi.toString()}
            onValueChange={(value) => onSettingsChange({ ...settings, dpi: parseInt(value) })}
          >
            <SelectTrigger className="font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DPI_PRESETS.map(preset => (
                <SelectItem key={preset.value} value={preset.value.toString()}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Background */}
      <div className="space-y-3">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Background</Label>
        <RadioGroup
          value={settings.background}
          onValueChange={(value: ExportSettings['background']) =>
            onSettingsChange({ ...settings, background: value })
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="white" id="bg-white" />
            <Label htmlFor="bg-white" className="text-sm cursor-pointer">White</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="transparent" id="bg-transparent" />
            <Label htmlFor="bg-transparent" className="text-sm cursor-pointer">Transparent</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Title */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-mono uppercase text-muted-foreground">Custom Title</Label>
          <Switch
            checked={settings.showTitle}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, showTitle: checked })}
          />
        </div>
        {settings.showTitle && (
          <Input
            placeholder="Auto-generated title"
            value={settings.customTitle || ''}
            onChange={(e) => onSettingsChange({ ...settings, customTitle: e.target.value })}
            className="font-mono text-sm"
          />
        )}
      </div>

      {/* Include Options */}
      <div className="space-y-3 pt-2 border-t border-border">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Include</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Axis Labels</Label>
            <Switch
              checked={settings.showAxisLabels}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, showAxisLabels: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Color Legend</Label>
            <Switch
              checked={settings.showColorLegend}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, showColorLegend: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Zones</Label>
            <Switch
              checked={settings.showZones}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, showZones: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Zone Labels</Label>
            <Switch
              checked={settings.showZoneLabels}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, showZoneLabels: checked })}
              disabled={!settings.showZones}
            />
          </div>
        </div>
      </div>

      {/* Export Button */}
      <Button
        onClick={onExport}
        disabled={isExporting}
        className="w-full gap-2"
        size="lg"
      >
        <Download className="w-4 h-4" />
        {isExporting ? 'Exporting...' : `Export ${settings.format.toUpperCase()}`}
      </Button>
    </div>
  );
};
