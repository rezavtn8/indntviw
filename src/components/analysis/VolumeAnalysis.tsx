import React, { useMemo } from 'react';
import { IndentationPoint } from '@/types/indentation';
import { calculateVolumeAnalysis, VolumeAnalysisResult } from '@/utils/spatial3DStatistics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusChip, StatusTone } from '@/components/ui/status-chip';
import { Box, Grid3X3, Droplets, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface VolumeAnalysisProps {
  points: IndentationPoint[];
}

export const VolumeAnalysis: React.FC<VolumeAnalysisProps> = ({ points }) => {
  const analysis = useMemo((): VolumeAnalysisResult => 
    calculateVolumeAnalysis(points),
    [points]
  );

  const coverageClass = useMemo((): { label: string; tone: StatusTone } => {
    if (analysis.pointCoverage > 80) return { label: 'Excellent', tone: 'good' };
    if (analysis.pointCoverage > 50) return { label: 'Good', tone: 'good' };
    if (analysis.pointCoverage > 25) return { label: 'Moderate', tone: 'neutral' };
    return { label: 'Sparse', tone: 'warn' };
  }, [analysis.pointCoverage]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Bounding Volume */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Box className="w-4 h-4" />
              Bounding Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Bounding Box Volume"
                value={analysis.boundingVolume.toFixed(4)}
                unit="unit³"
                tooltip="Volume of the smallest box containing all points"
              />
              <MetricCard
                label="Convex Hull Volume"
                value={analysis.convexHullVolume.toFixed(4)}
                unit="unit³"
                tooltip="Estimated volume of the convex hull (~65% of bounding box)"
              />
              <div className="col-span-2">
                <MetricCard
                  label="Volume Under Surface"
                  value={analysis.volumeUnderSurface.toFixed(4)}
                  unit="unit³"
                  tooltip="Approximate volume between surface and base plane"
                />
              </div>
            </div>

            {/* Volume visualization */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">Volume Breakdown</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary/30 rounded" />
                  <span className="text-xs flex-1">Bounding Box</span>
                  <span className="text-xs font-mono">{analysis.boundingVolume.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary/60 rounded" />
                  <span className="text-xs flex-1">Convex Hull (est.)</span>
                  <span className="text-xs font-mono">{analysis.convexHullVolume.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded" />
                  <span className="text-xs flex-1">Under Surface</span>
                  <span className="text-xs font-mono">{analysis.volumeUnderSurface.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Grid Coverage
              <StatusChip tone={coverageClass.tone}>{coverageClass.label}</StatusChip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Point Coverage"
                value={analysis.pointCoverage.toFixed(1)}
                unit="%"
                tooltip="Percentage of 3D grid cells containing at least one point"
              />
              <MetricCard
                label="Void Percentage"
                value={analysis.voidPercentage.toFixed(1)}
                unit="%"
                tooltip="Percentage of empty grid cells"
              />
            </div>

            {/* Coverage bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Grid Coverage</span>
                <span className="font-mono">{analysis.pointCoverage.toFixed(1)}%</span>
              </div>
              <Progress value={analysis.pointCoverage} className="h-3" />
            </div>

            {/* Void visualization */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">Coverage Distribution</div>
              <div className="flex gap-1 h-8">
                <div 
                  className="bg-primary rounded flex items-center justify-center text-xs text-primary-foreground"
                  style={{ width: `${analysis.pointCoverage}%` }}
                >
                  {analysis.pointCoverage > 20 && 'Data'}
                </div>
                <div 
                  className="bg-muted rounded flex items-center justify-center text-xs text-muted-foreground"
                  style={{ width: `${analysis.voidPercentage}%` }}
                >
                  {analysis.voidPercentage > 20 && 'Void'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filling Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Point Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Filling Ratio"
                value={analysis.fillingRatio.toFixed(3)}
                tooltip="Ratio of actual points to ideal grid points. <1 = sparse, >1 = dense"
              />
              <MetricCard
                label="Mean Spacing"
                value={analysis.meanSpacing.toFixed(4)}
                unit="units"
                tooltip="Average 3D distance between neighboring points"
              />
            </div>

            {/* Filling interpretation */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">
                {analysis.fillingRatio > 1 ? (
                  <p>
                    <strong>Dense Sampling:</strong> Multiple measurements per grid cell on average.
                    Consider if oversampling is intentional.
                  </p>
                ) : analysis.fillingRatio > 0.5 ? (
                  <p>
                    <strong>Good Sampling:</strong> Reasonable coverage of the measurement volume.
                    Most areas are well represented.
                  </p>
                ) : analysis.fillingRatio > 0.1 ? (
                  <p>
                    <strong>Sparse Sampling:</strong> Significant gaps in spatial coverage.
                    Consider adding more measurement points.
                  </p>
                ) : (
                  <p>
                    <strong>Very Sparse:</strong> Large portions of the volume are unmeasured.
                    Results may not be representative of the full sample.
                  </p>
                )}
              </div>
            </div>

            {/* Spacing visualization */}
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-2">Point Spacing Quality</div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 flex-1">
                  {Array(20).fill(0).map((_, i) => (
                    <div 
                      key={i}
                      className={`h-4 flex-1 rounded-sm ${
                        i < Math.min(20, analysis.fillingRatio * 20) 
                          ? 'bg-primary' 
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Sparse</span>
                <span>Dense</span>
              </div>
            </div>
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
