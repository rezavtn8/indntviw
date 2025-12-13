import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Layers, Grid3X3, FlipHorizontal } from 'lucide-react';

interface View3DControlsProps {
  showSurfaceMesh: boolean;
  surfaceOpacity: number;
  showWireframe: boolean;
  showPoints: boolean;
  surfaceType: 'full' | 'boundary';
  flipX: boolean;
  flipY: boolean;
  flipZ: boolean;
  onShowSurfaceMeshChange: (value: boolean) => void;
  onSurfaceOpacityChange: (value: number) => void;
  onShowWireframeChange: (value: boolean) => void;
  onShowPointsChange: (value: boolean) => void;
  onSurfaceTypeChange: (value: 'full' | 'boundary') => void;
  onFlipXChange: (value: boolean) => void;
  onFlipYChange: (value: boolean) => void;
  onFlipZChange: (value: boolean) => void;
}

export const View3DControls: React.FC<View3DControlsProps> = ({
  showSurfaceMesh,
  surfaceOpacity,
  showWireframe,
  showPoints,
  surfaceType,
  flipX,
  flipY,
  flipZ,
  onShowSurfaceMeshChange,
  onSurfaceOpacityChange,
  onShowWireframeChange,
  onShowPointsChange,
  onSurfaceTypeChange,
  onFlipXChange,
  onFlipYChange,
  onFlipZChange,
}) => {
  return (
    <div className="border-2 border-border bg-card p-2 space-y-3">
      <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
        3D View Options
      </h4>

      {/* Surface Mesh Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3 h-3 text-muted-foreground" />
            <Label htmlFor="surfaceMesh" className="font-mono text-xs cursor-pointer">
              Surface Mesh
            </Label>
          </div>
          <Switch
            id="surfaceMesh"
            checked={showSurfaceMesh}
            onCheckedChange={onShowSurfaceMeshChange}
          />
        </div>

        {showSurfaceMesh && (
          <div className="pl-5 space-y-2">
            {/* Surface Type */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={surfaceType === 'full' ? 'default' : 'outline'}
                onClick={() => onSurfaceTypeChange('full')}
                className="h-6 px-2 text-[10px] flex-1"
              >
                Full
              </Button>
              <Button
                size="sm"
                variant={surfaceType === 'boundary' ? 'default' : 'outline'}
                onClick={() => onSurfaceTypeChange('boundary')}
                className="h-6 px-2 text-[10px] flex-1"
              >
                Boundary
              </Button>
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="font-mono text-[10px] text-muted-foreground">Opacity</Label>
                <span className="font-mono text-[10px] text-muted-foreground">{Math.round(surfaceOpacity * 100)}%</span>
              </div>
              <Slider
                value={[surfaceOpacity]}
                onValueChange={([v]) => onSurfaceOpacityChange(v)}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Wireframe */}
            <div className="flex items-center justify-between">
              <Label htmlFor="wireframe" className="font-mono text-[10px] cursor-pointer">
                Wireframe
              </Label>
              <Switch
                id="wireframe"
                checked={showWireframe}
                onCheckedChange={onShowWireframeChange}
              />
            </div>

            {/* Show Points */}
            <div className="flex items-center justify-between">
              <Label htmlFor="showPoints3d" className="font-mono text-[10px] cursor-pointer">
                Show Points
              </Label>
              <Switch
                id="showPoints3d"
                checked={showPoints}
                onCheckedChange={onShowPointsChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* Axis Flip */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <FlipHorizontal className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono text-xs font-bold uppercase text-muted-foreground">
            Flip Axes
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={flipX ? 'default' : 'outline'}
            onClick={() => onFlipXChange(!flipX)}
            className="h-6 px-3 text-xs flex-1"
          >
            X
          </Button>
          <Button
            size="sm"
            variant={flipY ? 'default' : 'outline'}
            onClick={() => onFlipYChange(!flipY)}
            className="h-6 px-3 text-xs flex-1"
          >
            Y
          </Button>
          <Button
            size="sm"
            variant={flipZ ? 'default' : 'outline'}
            onClick={() => onFlipZChange(!flipZ)}
            className="h-6 px-3 text-xs flex-1"
          >
            Z
          </Button>
        </div>
      </div>
    </div>
  );
};
