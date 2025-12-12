import React from 'react';
import { ExportSettings } from '@/types/zones';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface DisplaySectionProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
}

export const DisplaySection: React.FC<DisplaySectionProps> = ({ settings, onSettingsChange }) => {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-mono uppercase text-muted-foreground">Display</Label>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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
          <Label className="text-sm">Title</Label>
          <Switch
            checked={settings.showTitle}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, showTitle: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Boundary</Label>
          <Switch
            checked={settings.showBoundaryContour}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, showBoundaryContour: checked })}
          />
        </div>
      </div>

      {/* Zones section */}
      <div className="pt-2 border-t border-border/50 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Zones</Label>
          <Switch
            checked={settings.showZones}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, showZones: checked })}
          />
        </div>
        
        {settings.showZones && (
          <div className="pl-4 space-y-3 border-l-2 border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Labels</Label>
              <Switch
                checked={settings.showZoneLabels}
                onCheckedChange={(checked) => onSettingsChange({ ...settings, showZoneLabels: checked })}
              />
            </div>

            {settings.showZoneLabels && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Position</Label>
                  <RadioGroup
                    value={settings.zoneLabelPosition}
                    onValueChange={(value: 'center' | 'outside') =>
                      onSettingsChange({ ...settings, zoneLabelPosition: value })
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="center" id="label-pos-center" />
                      <Label htmlFor="label-pos-center" className="text-sm cursor-pointer">Center</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="outside" id="label-pos-outside" />
                      <Label htmlFor="label-pos-outside" className="text-sm cursor-pointer">Outside</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <RadioGroup
                    value={settings.zoneLabelColor}
                    onValueChange={(value: 'zone' | 'black') =>
                      onSettingsChange({ ...settings, zoneLabelColor: value })
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="zone" id="label-color-zone" />
                      <Label htmlFor="label-color-zone" className="text-sm cursor-pointer">Match Zone</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="black" id="label-color-black" />
                      <Label htmlFor="label-color-black" className="text-sm cursor-pointer">Black</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Background */}
      <div className="pt-2 border-t border-border/50 space-y-2">
        <Label className="text-xs text-muted-foreground">Background</Label>
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
    </div>
  );
};
