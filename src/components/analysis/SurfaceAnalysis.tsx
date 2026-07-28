import React, { useMemo } from 'react';
import { IndentationPoint } from '@/types/indentation';
import { calculateSurfaceAnalysis, SurfaceAnalysisResult } from '@/utils/spatial3DStatistics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusChip, StatusTone } from '@/components/ui/status-chip';
import { Waves, Mountain, Square, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SurfaceAnalysisProps {
  points: IndentationPoint[];
}

export const SurfaceAnalysis: React.FC<SurfaceAnalysisProps> = ({ points }) => {
  const analysis = useMemo((): SurfaceAnalysisResult => 
    calculateSurfaceAnalysis(points),
    [points]
  );

  const roughnessClass = useMemo((): { label: string; tone: StatusTone } => {
    const rq = analysis.Rq;
    if (rq < 0.1) return { label: 'Ultra Smooth', tone: 'good' };
    if (rq < 0.5) return { label: 'Smooth', tone: 'good' };
    if (rq < 1.0) return { label: 'Moderate', tone: 'neutral' };
    if (rq < 2.0) return { label: 'Rough', tone: 'warn' };
    return { label: 'Very Rough', tone: 'warn' };
  }, [analysis.Rq]);

  const skewnessInterpretation = useMemo(() => {
    if (analysis.Rsk < -0.5) return 'Valley-dominated (worn surface)';
    if (analysis.Rsk > 0.5) return 'Peak-dominated (unused surface)';
    return 'Symmetric distribution';
  }, [analysis.Rsk]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Roughness Parameters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Waves className="w-4 h-4" />
              Z-Height Scatter
              <StatusChip tone={roughnessClass.tone}>{roughnessClass.label}</StatusChip>
            </CardTitle>
            <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Scatter of the recorded indent Z positions about the mean plane. Useful for
              comparing samples measured the same way, and for spotting stage tilt — but
              not ISO 4287 roughness, which requires a filtered, densely sampled profile.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Ra (mean |ΔZ|)"
                value={analysis.Ra.toFixed(4)}
                tooltip="Arithmetic average of absolute deviations from mean height"
              />
              <MetricCard
                label="Rq (RMS ΔZ)"
                value={analysis.Rq.toFixed(4)}
                tooltip="Root mean square of height deviations"
              />
              <MetricCard
                label="Rz (Peak-to-Valley)"
                value={analysis.Rz.toFixed(4)}
                tooltip="Maximum height difference between highest peak and lowest valley"
              />
              <MetricCard
                label="Rsk (Skewness)"
                value={analysis.Rsk.toFixed(3)}
                tooltip={`${skewnessInterpretation}. Negative = valleys, Positive = peaks`}
              />
              <MetricCard
                label="Rku (Kurtosis)"
                value={analysis.Rku.toFixed(3)}
                tooltip="Sharpness of height distribution. >3 = sharp peaks, <3 = rounded"
              />
              <MetricCard
                label="Peak Density"
                value={analysis.peakDensity.toFixed(4)}
                unit="/unit²"
                tooltip="Number of peaks above mean + Rq per unit area"
              />
            </div>
          </CardContent>
        </Card>

        {/* Surface Topography */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mountain className="w-4 h-4" />
              Surface Topography
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Mean Height"
                value={analysis.meanHeight.toFixed(4)}
                tooltip="Average Z coordinate of all points"
              />
              <MetricCard
                label="Height Variance"
                value={analysis.heightVariance.toFixed(4)}
                tooltip="Variance in Z coordinates"
              />
            </div>
            
            {/* Visual roughness indicator */}
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-1">Z-Scatter Scale</div>
              <div className="h-2 rounded-full relative" style={{ background: 'linear-gradient(90deg, #3aa0a0 0%, #888 50%, #e8594f 100%)' }}>
                <div 
                  className="absolute w-3 h-3 bg-foreground rounded-full border-2 border-background -top-0.5 transform -translate-x-1/2"
                  style={{ left: `${Math.min(100, (analysis.Rq / 3) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Smooth</span>
                <span>Rough</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Surface Area */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Square className="w-4 h-4" />
              Surface Area Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Projected Area"
                value={analysis.projectedArea.toFixed(2)}
                unit="unit²"
                tooltip="Area of XY projection (flat area)"
              />
              <MetricCard
                label="Surface Area"
                value={analysis.surfaceArea.toFixed(2)}
                unit="unit²"
                tooltip="Estimated 3D surface area accounting for height variations"
              />
              <div className="col-span-2">
                <MetricCard
                  label="Surface Ratio"
                  value={analysis.surfaceRatio.toFixed(3)}
                  tooltip="Ratio of 3D surface area to projected area. >1 means textured surface"
                />
              </div>
            </div>

            {/* Surface ratio visualization */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Surface Development</span>
                <span className="font-mono">{((analysis.surfaceRatio - 1) * 100).toFixed(1)}% more area</span>
              </div>
              <div className="mt-2 flex gap-2">
                <div className="flex-1 h-8 bg-muted rounded flex items-center justify-center text-xs">
                  Flat: {analysis.projectedArea.toFixed(1)}
                </div>
                <div 
                  className="flex-1 h-8 bg-primary/20 rounded flex items-center justify-center text-xs border border-primary/30"
                  style={{ flex: analysis.surfaceRatio }}
                >
                  3D: {analysis.surfaceArea.toFixed(1)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interpretation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Surface Interpretation</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p><strong>Skewness:</strong> {skewnessInterpretation}</p>
            <p>
              <strong>Kurtosis:</strong> {
                analysis.Rku > 3 
                  ? 'Sharp/spiky surface texture' 
                  : analysis.Rku < 3 
                    ? 'Rounded/bumpy surface texture' 
                    : 'Normal Gaussian-like distribution'
              }
            </p>
            <p>
              <strong>Overall:</strong> {
                analysis.surfaceRatio > 1.2 
                  ? 'Highly textured surface with significant height variations' 
                  : analysis.surfaceRatio > 1.05 
                    ? 'Moderately textured surface' 
                    : 'Relatively flat surface'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  tooltip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, tooltip }) => (
  <div className="p-2 bg-muted/30 rounded-lg">
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
    <div className="font-mono text-sm">
      {value}
      {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
    </div>
  </div>
);
