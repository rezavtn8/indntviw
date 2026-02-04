import React from 'react';
import { ExportSettings } from '@/types/zones';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, Layers, ChevronDown, PaintBucket } from 'lucide-react';

interface DisplaySectionProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
}

export const DisplaySection: React.FC<DisplaySectionProps> = ({ settings, onSettingsChange }) => {
  return (
    <div className="space-y-3">
      {/* Quick Toggles - Compact Grid */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Show Elements</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            { key: 'showAxisLabels', label: 'Axis Labels' },
            { key: 'showColorLegend', label: 'Color Legend' },
            { key: 'showTitle', label: 'Title' },
            { key: 'showBoundaryContour', label: 'Boundary' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer group">
              <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
              </span>
              <Switch
                checked={settings[key as keyof ExportSettings] as boolean}
                onCheckedChange={(checked) => onSettingsChange({ ...settings, [key]: checked })}
                className="scale-90"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Zones - Collapsible */}
      <Collapsible defaultOpen className="rounded-lg border border-border bg-card/50">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/30 transition-colors rounded-lg">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Zones</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.showZones}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, showZones: checked })}
              className="scale-90"
              onClick={(e) => e.stopPropagation()}
            />
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </CollapsibleTrigger>
        
        {settings.showZones && (
          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-3">
              {/* Show Labels Toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[11px] text-muted-foreground">Show Labels</span>
                <Switch
                  checked={settings.showZoneLabels}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, showZoneLabels: checked })}
                  className="scale-90"
                />
              </label>

              {settings.showZoneLabels && (
                <div className="space-y-3 pl-2 border-l-2 border-border/50">
                  {/* Label Position */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Position</Label>
                    <RadioGroup
                      value={settings.zoneLabelPosition}
                      onValueChange={(value: 'center' | 'edge' | 'legend') =>
                        onSettingsChange({ ...settings, zoneLabelPosition: value })
                      }
                      className="flex gap-3"
                    >
                      {['center', 'edge', 'legend'].map((pos) => (
                        <label key={pos} className="flex items-center gap-1.5 cursor-pointer">
                          <RadioGroupItem value={pos} id={`pos-${pos}`} className="scale-90" />
                          <span className="text-[10px] capitalize">{pos}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Label Color */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Color</Label>
                    <RadioGroup
                      value={settings.zoneLabelColor}
                      onValueChange={(value: 'zone' | 'black') =>
                        onSettingsChange({ ...settings, zoneLabelColor: value })
                      }
                      className="flex gap-3"
                    >
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <RadioGroupItem value="zone" id="color-zone" className="scale-90" />
                        <span className="text-[10px]">Match Zone</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <RadioGroupItem value="black" id="color-black" className="scale-90" />
                        <span className="text-[10px]">Black</span>
                      </label>
                    </RadioGroup>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>

      {/* Background */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <PaintBucket className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Background</span>
        </div>
        <RadioGroup
          value={settings.background}
          onValueChange={(value: ExportSettings['background']) =>
            onSettingsChange({ ...settings, background: value })
          }
          className="flex gap-4"
        >
          {[
            { value: 'white', label: 'White' },
            { value: 'transparent', label: 'Transparent' },
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center gap-1.5 cursor-pointer">
              <RadioGroupItem value={value} id={`bg-${value}`} className="scale-90" />
              <span className="text-[11px]">{label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};
