import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Layers, Grid3X3 } from 'lucide-react';

interface VisualizationOptionsProps {
  showContours: boolean;
  showInterpolation: boolean;
  onShowContoursChange: (value: boolean) => void;
  onShowInterpolationChange: (value: boolean) => void;
}

export const VisualizationOptions: React.FC<VisualizationOptionsProps> = ({
  showContours,
  showInterpolation,
  onShowContoursChange,
  onShowInterpolationChange,
}) => {
  return (
    <div className="border-2 border-border bg-card p-3 space-y-3">
      <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Visualization Options
      </h4>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="contours" className="font-mono text-xs cursor-pointer">
              Show Boundary
            </Label>
          </div>
          <Switch
            id="contours"
            checked={showContours}
            onCheckedChange={onShowContoursChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="interpolation" className="font-mono text-xs cursor-pointer">
              Background Fill
            </Label>
          </div>
          <Switch
            id="interpolation"
            checked={showInterpolation}
            onCheckedChange={onShowInterpolationChange}
          />
        </div>
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        Point-based visualization with optional interpolation
      </p>
    </div>
  );
};
