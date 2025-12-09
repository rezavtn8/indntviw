import React from 'react';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PointDetailsProps {
  point: IndentationPoint | null;
  onClose: () => void;
}

export const PointDetails: React.FC<PointDetailsProps> = ({ point, onClose }) => {
  if (!point) return null;

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return value.toFixed(2);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(4);
    } else if (Math.abs(value) >= 0.001) {
      return value.toFixed(6);
    } else {
      return value.toExponential(3);
    }
  };

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  const getPropertyUnit = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.unit || '';
  };

  return (
    <div className="border-2 border-border bg-card shadow-md">
      <div className="flex items-center justify-between border-b-2 border-border p-3">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wide">
          Point #{point.id + 1}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-4 max-h-96 overflow-y-auto">
        {/* Position */}
        <div>
          <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
            Position
          </h4>
          <div className="grid grid-cols-3 gap-2 font-mono text-sm">
            <div className="border border-border p-2 text-center">
              <div className="text-xs text-muted-foreground">X</div>
              <div className="font-bold">{formatValue(point.x)}</div>
              <div className="text-xs text-muted-foreground">mm</div>
            </div>
            <div className="border border-border p-2 text-center">
              <div className="text-xs text-muted-foreground">Y</div>
              <div className="font-bold">{formatValue(point.y)}</div>
              <div className="text-xs text-muted-foreground">mm</div>
            </div>
            <div className="border border-border p-2 text-center">
              <div className="text-xs text-muted-foreground">Z</div>
              <div className="font-bold">{formatValue(point.z)}</div>
              <div className="text-xs text-muted-foreground">mm</div>
            </div>
          </div>
        </div>

        {/* Properties */}
        <div>
          <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
            Properties
          </h4>
          <div className="space-y-1">
            {Object.entries(point.properties).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between border border-border p-2 font-mono text-xs"
              >
                <span className="text-muted-foreground truncate max-w-[120px]" title={getPropertyLabel(key)}>
                  {key}
                </span>
                <span className="font-bold">
                  {formatValue(value)}
                  {getPropertyUnit(key) && (
                    <span className="text-muted-foreground ml-1">
                      {getPropertyUnit(key)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
