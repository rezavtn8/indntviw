import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Circle, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PointShape = 'circle' | 'square';

interface RenderStyleControlsProps {
  pointShape: PointShape;
  onPointShapeChange: (shape: PointShape) => void;
  pointSizeMultiplier: number;
  onPointSizeMultiplierChange: (value: number) => void;
}

export const RenderStyleControls: React.FC<RenderStyleControlsProps> = ({
  pointShape,
  onPointShapeChange,
  pointSizeMultiplier,
  onPointSizeMultiplierChange,
}) => {
  return (
    <div className="border-2 border-border bg-card p-3 space-y-3">
      <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Render Style
      </h4>

      <div className="space-y-2">
        <Label className="font-mono text-xs">Point Shape</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={pointShape === 'circle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPointShapeChange('circle')}
            className="font-mono text-xs gap-1.5 h-8"
          >
            <Circle className="w-3.5 h-3.5" />
            Circle
          </Button>
          <Button
            type="button"
            variant={pointShape === 'square' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPointShapeChange('square')}
            className="font-mono text-xs gap-1.5 h-8"
          >
            <Square className="w-3.5 h-3.5" />
            Square
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs">Size</Label>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {pointSizeMultiplier.toFixed(1)}x
          </span>
        </div>
        <Slider
          min={0.5}
          max={3}
          step={0.1}
          value={[pointSizeMultiplier]}
          onValueChange={(v) => onPointSizeMultiplierChange(v[0])}
        />
      </div>

      <p className="font-mono text-[11px] text-muted-foreground leading-snug">
        Squares tile into a filled-field heatmap when sized to the grid spacing.
      </p>
    </div>
  );
};
