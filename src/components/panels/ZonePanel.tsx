import React from 'react';
import { Zone, ZoneStatistics } from '@/types/zones';
import { IndentationPoint } from '@/types/indentation';
import { calculateZoneStatistics, getPointsInZone } from '@/utils/zoneUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, EyeOff, Trash2, GripVertical } from 'lucide-react';

interface ZonePanelProps {
  zones: Zone[];
  selectedZoneId: string | null;
  points: IndentationPoint[];
  selectedProperty: string;
  onSelectZone: (zoneId: string | null) => void;
  onUpdateZone: (zone: Zone) => void;
  onDeleteZone: (zoneId: string) => void;
}

export const ZonePanel: React.FC<ZonePanelProps> = ({
  zones,
  selectedZoneId,
  points,
  selectedProperty,
  onSelectZone,
  onUpdateZone,
  onDeleteZone,
}) => {
  if (zones.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground text-sm font-mono">
          No zones created yet.
        </p>
        <p className="text-muted-foreground text-xs mt-2">
          Use the drawing tools to create zones.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 p-2">
        {zones.map(zone => {
          const isSelected = zone.id === selectedZoneId;
          const stats = calculateZoneStatistics(points, zone, selectedProperty);
          const pointCount = getPointsInZone(points, zone).length;

          return (
            <div
              key={zone.id}
              className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card hover:border-primary/50'
              }`}
              onClick={() => onSelectZone(zone.id)}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                
                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: zone.color }}
                />
                
                {/* Zone name */}
                <Input
                  value={zone.name}
                  onChange={(e) => onUpdateZone({ ...zone, name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 flex-1 font-mono text-sm"
                />
                
                {/* Visibility toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-7 h-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateZone({ ...zone, visible: !zone.visible });
                  }}
                >
                  {zone.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                
                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-7 h-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteZone(zone.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Zone statistics */}
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points:</span>
                  <span>{pointCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mean:</span>
                  <span>{stats.mean.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min:</span>
                  <span>{stats.min.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max:</span>
                  <span>{stats.max.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
