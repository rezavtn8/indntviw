import React from 'react';
import { Zone, DEFAULT_ZONE_COLORS } from '@/types/zones';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ZoneEditorProps {
  zone: Zone;
  onUpdate: (zone: Zone) => void;
}

export const ZoneEditor: React.FC<ZoneEditorProps> = ({ zone, onUpdate }) => {
  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      <h4 className="font-mono text-sm font-semibold uppercase tracking-wider">
        Zone Properties
      </h4>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Name</Label>
        <Input
          value={zone.name}
          onChange={(e) => onUpdate({ ...zone, name: e.target.value })}
          className="font-mono"
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Color</Label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_ZONE_COLORS.map(color => (
            <button
              key={color}
              className={`w-7 h-7 rounded border-2 transition-transform hover:scale-110 ${
                zone.color === color ? 'border-foreground scale-110' : 'border-border'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onUpdate({ ...zone, color })}
            />
          ))}
          <Input
            type="color"
            value={zone.color}
            onChange={(e) => onUpdate({ ...zone, color: e.target.value })}
            className="w-7 h-7 p-0 border-border cursor-pointer"
          />
        </div>
      </div>

      {/* Border Style */}
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase text-muted-foreground">Border Style</Label>
        <Select
          value={zone.borderStyle}
          onValueChange={(value: Zone['borderStyle']) => onUpdate({ ...zone, borderStyle: value })}
        >
          <SelectTrigger className="font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Border Width */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-mono uppercase text-muted-foreground">Border Width</Label>
          <span className="text-xs font-mono">{zone.borderWidth}px</span>
        </div>
        <Slider
          value={[zone.borderWidth]}
          onValueChange={([value]) => onUpdate({ ...zone, borderWidth: value })}
          min={1}
          max={6}
          step={1}
        />
      </div>

      {/* Fill Opacity */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-mono uppercase text-muted-foreground">Fill Opacity</Label>
          <span className="text-xs font-mono">{Math.round(zone.fillOpacity * 100)}%</span>
        </div>
        <Slider
          value={[zone.fillOpacity]}
          onValueChange={([value]) => onUpdate({ ...zone, fillOpacity: value })}
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      {/* Label Settings */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-mono uppercase text-muted-foreground">Show Label</Label>
          <Switch
            checked={zone.showLabel}
            onCheckedChange={(checked) => onUpdate({ ...zone, showLabel: checked })}
          />
        </div>

        {zone.showLabel && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Label Size</Label>
              <span className="text-xs font-mono">{zone.labelFontSize}px</span>
            </div>
            <Slider
              value={[zone.labelFontSize]}
              onValueChange={([value]) => onUpdate({ ...zone, labelFontSize: value })}
              min={10}
              max={24}
              step={1}
            />
          </div>
        )}
      </div>
    </div>
  );
};
