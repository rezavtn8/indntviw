import React from 'react';
import { ExportSettings, AxisBounds } from '@/types/zones';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, FileImage, FileCode, FileText, ChevronDown, Settings2, Maximize2, Type, Hash } from 'lucide-react';

interface ExportOptionsPanelProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  onExport: () => void;
  isExporting: boolean;
  dataBounds?: AxisBounds;
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
  dataBounds,
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

  const handleAxisBoundsChange = (key: keyof AxisBounds, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const currentBounds = settings.customAxisBounds || dataBounds || { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    onSettingsChange({
      ...settings,
      customAxisBounds: {
        ...currentBounds,
        [key]: numValue,
      },
    });
  };

  const handleAutoAxisToggle = (auto: boolean) => {
    if (auto) {
      onSettingsChange({
        ...settings,
        useAutoAxisBounds: true,
        customAxisBounds: undefined,
      });
    } else {
      onSettingsChange({
        ...settings,
        useAutoAxisBounds: false,
        customAxisBounds: dataBounds || { xMin: 0, xMax: 100, yMin: 0, yMax: 100 },
      });
    }
  };

  const currentAxisBounds = settings.customAxisBounds || dataBounds || { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };

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

      {/* Labels & Text Collapsible */}
      <Collapsible defaultOpen className="space-y-3">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs font-mono uppercase text-muted-foreground cursor-pointer">Labels & Text</Label>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Title</Label>
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

          {/* Axis Labels */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-xs text-muted-foreground">Axis Labels</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">X Axis</Label>
                <Input
                  value={settings.xAxisLabel}
                  onChange={(e) => onSettingsChange({ ...settings, xAxisLabel: e.target.value })}
                  className="font-mono text-sm h-8"
                  placeholder="x (mm)"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Y Axis</Label>
                <Input
                  value={settings.yAxisLabel}
                  onChange={(e) => onSettingsChange({ ...settings, yAxisLabel: e.target.value })}
                  className="font-mono text-sm h-8"
                  placeholder="y (mm)"
                />
              </div>
            </div>
          </div>

          {/* Legend Label */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Legend Label (optional)</Label>
            <Input
              value={settings.legendLabel}
              onChange={(e) => onSettingsChange({ ...settings, legendLabel: e.target.value })}
              className="font-mono text-sm h-8"
              placeholder="Auto from property"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Number Formatting Collapsible */}
      <Collapsible className="space-y-3">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs font-mono uppercase text-muted-foreground cursor-pointer">Number Formatting</Label>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          {/* Decimal Places */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Axis Tick Decimals</Label>
                <span className="text-xs font-mono text-muted-foreground">{settings.axisDecimals}</span>
              </div>
              <Slider
                value={[settings.axisDecimals]}
                onValueChange={([value]) => onSettingsChange({ ...settings, axisDecimals: value })}
                min={0}
                max={4}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Legend Decimals</Label>
                <span className="text-xs font-mono text-muted-foreground">{settings.legendDecimals}</span>
              </div>
              <Slider
                value={[settings.legendDecimals]}
                onValueChange={([value]) => onSettingsChange({ ...settings, legendDecimals: value })}
                min={0}
                max={4}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Font Sizes */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <Label className="text-xs text-muted-foreground">Font Sizes</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Select
                  value={settings.titleFontSize.toString()}
                  onValueChange={(v) => onSettingsChange({ ...settings, titleFontSize: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[12, 14, 16, 18, 20, 24, 28].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Axis Labels</Label>
                <Select
                  value={settings.axisLabelFontSize.toString()}
                  onValueChange={(v) => onSettingsChange({ ...settings, axisLabelFontSize: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 12, 14, 16, 18].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tick Numbers</Label>
                <Select
                  value={settings.tickFontSize.toString()}
                  onValueChange={(v) => onSettingsChange({ ...settings, tickFontSize: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 10, 12, 14, 16].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Legend</Label>
                <Select
                  value={settings.legendFontSize.toString()}
                  onValueChange={(v) => onSettingsChange({ ...settings, legendFontSize: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 10, 12, 14, 16].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Axis Settings Collapsible */}
      <Collapsible className="space-y-3">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs font-mono uppercase text-muted-foreground cursor-pointer">Axis Bounds</Label>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          {/* Axis Padding */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Axis Padding</Label>
              <span className="text-xs font-mono text-muted-foreground">{settings.axisPadding}%</span>
            </div>
            <Slider
              value={[settings.axisPadding]}
              onValueChange={([value]) => onSettingsChange({ ...settings, axisPadding: value })}
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
          </div>

          {/* Auto/Manual Axis Bounds */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto Axis Bounds</Label>
              <Switch
                checked={settings.useAutoAxisBounds}
                onCheckedChange={handleAutoAxisToggle}
              />
            </div>
            
            {!settings.useAutoAxisBounds && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">X Axis</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={currentAxisBounds.xMin.toFixed(2)}
                        onChange={(e) => handleAxisBoundsChange('xMin', e.target.value)}
                        className="font-mono text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={currentAxisBounds.xMax.toFixed(2)}
                        onChange={(e) => handleAxisBoundsChange('xMax', e.target.value)}
                        className="font-mono text-sm h-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Y Axis</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={currentAxisBounds.yMin.toFixed(2)}
                        onChange={(e) => handleAxisBoundsChange('yMin', e.target.value)}
                        className="font-mono text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={currentAxisBounds.yMax.toFixed(2)}
                        onChange={(e) => handleAxisBoundsChange('yMax', e.target.value)}
                        className="font-mono text-sm h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

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

      {/* Display Options */}
      <Collapsible className="space-y-3">
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs font-mono uppercase text-muted-foreground cursor-pointer">Display Options</Label>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
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
        </CollapsibleContent>
      </Collapsible>

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