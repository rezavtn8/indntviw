import React from 'react';
import { ExportSettings, AxisBounds } from '@/types/zones';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings2 } from 'lucide-react';

interface AdvancedSectionProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  dataBounds?: AxisBounds;
}

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({ 
  settings, 
  onSettingsChange,
  dataBounds 
}) => {
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
    <Collapsible className="space-y-3">
      <CollapsibleTrigger className="flex items-center justify-between w-full group">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <Label className="text-xs font-mono uppercase text-muted-foreground cursor-pointer">Advanced</Label>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4">
        {/* Title Input */}
        {settings.showTitle && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Custom Title</Label>
            <Input
              placeholder="Auto-generated title"
              value={settings.customTitle || ''}
              onChange={(e) => onSettingsChange({ ...settings, customTitle: e.target.value })}
              className="font-mono text-sm h-8"
            />
          </div>
        )}

        {/* Axis Labels */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Axis Labels</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={settings.xAxisLabel}
              onChange={(e) => onSettingsChange({ ...settings, xAxisLabel: e.target.value })}
              className="font-mono text-sm h-8"
              placeholder="X axis"
            />
            <Input
              value={settings.yAxisLabel}
              onChange={(e) => onSettingsChange({ ...settings, yAxisLabel: e.target.value })}
              className="font-mono text-sm h-8"
              placeholder="Y axis"
            />
          </div>
        </div>

        {/* Legend Label */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Legend Label</Label>
          <Input
            value={settings.legendLabel}
            onChange={(e) => onSettingsChange({ ...settings, legendLabel: e.target.value })}
            className="font-mono text-sm h-8"
            placeholder="Auto from property"
          />
        </div>

        {/* Decimal Places */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          <Label className="text-xs text-muted-foreground">Decimal Places</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Axis</Label>
                <span className="text-xs font-mono text-muted-foreground">{settings.axisDecimals}</span>
              </div>
              <Slider
                value={[settings.axisDecimals]}
                onValueChange={([value]) => onSettingsChange({ ...settings, axisDecimals: value })}
                min={0}
                max={4}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Legend</Label>
                <span className="text-xs font-mono text-muted-foreground">{settings.legendDecimals}</span>
              </div>
              <Slider
                value={[settings.legendDecimals]}
                onValueChange={([value]) => onSettingsChange({ ...settings, legendDecimals: value })}
                min={0}
                max={4}
                step={1}
              />
            </div>
          </div>
        </div>

        {/* Font Sizes */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <Label className="text-xs text-muted-foreground">Font Sizes</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={settings.titleFontSize.toString()}
              onValueChange={(v) => onSettingsChange({ ...settings, titleFontSize: parseInt(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Title" />
              </SelectTrigger>
              <SelectContent>
                {[12, 14, 16, 18, 20, 24].map(size => (
                  <SelectItem key={size} value={size.toString()}>Title: {size}px</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={settings.tickFontSize.toString()}
              onValueChange={(v) => onSettingsChange({ ...settings, tickFontSize: parseInt(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Ticks" />
              </SelectTrigger>
              <SelectContent>
                {[8, 10, 12, 14, 16].map(size => (
                  <SelectItem key={size} value={size.toString()}>Ticks: {size}px</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Axis Bounds */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Auto Axis Bounds</Label>
            <Switch
              checked={settings.useAutoAxisBounds}
              onCheckedChange={handleAutoAxisToggle}
            />
          </div>
          
          {!settings.useAutoAxisBounds && (
            <div className="grid grid-cols-4 gap-2">
              <Input
                type="number"
                step="0.1"
                value={currentAxisBounds.xMin.toFixed(1)}
                onChange={(e) => handleAxisBoundsChange('xMin', e.target.value)}
                className="font-mono text-xs h-7"
                placeholder="xMin"
              />
              <Input
                type="number"
                step="0.1"
                value={currentAxisBounds.xMax.toFixed(1)}
                onChange={(e) => handleAxisBoundsChange('xMax', e.target.value)}
                className="font-mono text-xs h-7"
                placeholder="xMax"
              />
              <Input
                type="number"
                step="0.1"
                value={currentAxisBounds.yMin.toFixed(1)}
                onChange={(e) => handleAxisBoundsChange('yMin', e.target.value)}
                className="font-mono text-xs h-7"
                placeholder="yMin"
              />
              <Input
                type="number"
                step="0.1"
                value={currentAxisBounds.yMax.toFixed(1)}
                onChange={(e) => handleAxisBoundsChange('yMax', e.target.value)}
                className="font-mono text-xs h-7"
                placeholder="yMax"
              />
            </div>
          )}

          {settings.useAutoAxisBounds && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Padding</Label>
                <span className="text-xs font-mono text-muted-foreground">{settings.axisPadding}%</span>
              </div>
              <Slider
                value={[settings.axisPadding]}
                onValueChange={([value]) => onSettingsChange({ ...settings, axisPadding: value })}
                min={0}
                max={20}
                step={1}
              />
            </div>
          )}
        </div>

        {/* Tick Counts */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <Label className="text-xs text-muted-foreground">Tick Divisions</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={settings.xTickCount.toString()}
              onValueChange={(v) => onSettingsChange({ ...settings, xTickCount: parseInt(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 4, 6, 8, 10].map(n => (
                  <SelectItem key={n} value={n.toString()}>X: {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={settings.yTickCount.toString()}
              onValueChange={(v) => onSettingsChange({ ...settings, yTickCount: parseInt(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 4, 6, 8, 10].map(n => (
                  <SelectItem key={n} value={n.toString()}>Y: {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={settings.legendTickCount.toString()}
              onValueChange={(v) => onSettingsChange({ ...settings, legendTickCount: parseInt(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 8].map(n => (
                  <SelectItem key={n} value={n.toString()}>Legend: {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
