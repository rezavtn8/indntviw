import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Layers, Grid3X3, Circle, PaintBucket, Blend } from 'lucide-react';

export type HeatmapMode = 'dots' | 'filled';

interface VisualizationOptionsProps {
  showContours: boolean;
  showInterpolation: boolean;
  heatmapMode: HeatmapMode;
  blurIntensity: number;
  onShowContoursChange: (value: boolean) => void;
  onShowInterpolationChange: (value: boolean) => void;
  onHeatmapModeChange: (value: HeatmapMode) => void;
  onBlurIntensityChange: (value: number) => void;
}

export const VisualizationOptions: React.FC<VisualizationOptionsProps> = ({
  showContours,
  showInterpolation,
  heatmapMode,
  blurIntensity,
  onShowContoursChange,
  onShowInterpolationChange,
  onHeatmapModeChange,
  onBlurIntensityChange,
}) => {
  return (
    <div className="border-2 border-border bg-card p-3 space-y-3">
      <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Visualization Options
      </h4>

      <div className="space-y-3">
        {/* Heatmap Mode Selection */}
        <div className="space-y-2">
          <Label className="font-mono text-xs font-bold">Display Mode</Label>
          <RadioGroup
            value={heatmapMode}
            onValueChange={(v) => onHeatmapModeChange(v as HeatmapMode)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="dots" id="dots" />
              <Label htmlFor="dots" className="font-mono text-xs cursor-pointer flex items-center gap-1">
                <Circle className="w-3 h-3" />
                Dots
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="filled" id="filled" />
              <Label htmlFor="filled" className="font-mono text-xs cursor-pointer flex items-center gap-1">
                <PaintBucket className="w-3 h-3" />
                Filled
              </Label>
            </div>
          </RadioGroup>
        </div>

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

        {heatmapMode === 'dots' && (
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
        )}

        {/* Blur Intensity Slider - only show in filled mode */}
        {heatmapMode === 'filled' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Blend className="w-4 h-4 text-muted-foreground" />
              <Label className="font-mono text-xs">
                Blur Intensity: {blurIntensity}
              </Label>
            </div>
            <Slider
              value={[blurIntensity]}
              onValueChange={(v) => onBlurIntensityChange(v[0])}
              min={0}
              max={15}
              step={1}
              className="w-full"
            />
            <p className="font-mono text-xs text-muted-foreground">
              {blurIntensity === 0 ? 'Sharp cells' : blurIntensity < 5 ? 'Fine detail' : blurIntensity < 10 ? 'Smooth' : 'Very smooth'}
            </p>
          </div>
        )}
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        {heatmapMode === 'filled' ? 'Continuous IDW interpolation' : 'Point-based visualization'}
      </p>
    </div>
  );
};
