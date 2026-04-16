import React, { useMemo } from 'react';
import { IndentationPoint } from '@/types/indentation';
import { calculateGradientAnalysis, GradientAnalysisResult } from '@/utils/spatial3DStatistics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusChip, StatusTone } from '@/components/ui/status-chip';
import { ArrowRight, Compass, GitBranch, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GradientAnalysisProps {
  points: IndentationPoint[];
  property: string;
  propertyUnit: string;
}

export const GradientAnalysis: React.FC<GradientAnalysisProps> = ({
  points,
  property,
  propertyUnit,
}) => {
  const analysis = useMemo((): GradientAnalysisResult => 
    calculateGradientAnalysis(points, property),
    [points, property]
  );

  // Determine primary gradient direction
  const primaryDirection = useMemo(() => {
    const absX = Math.abs(analysis.gradientDirectionX);
    const absY = Math.abs(analysis.gradientDirectionY);
    const absZ = Math.abs(analysis.gradientDirectionZ);
    
    if (absX >= absY && absX >= absZ) {
      return { axis: 'X', value: analysis.gradientDirectionX, sign: analysis.gradientDirectionX > 0 ? '+' : '-' };
    }
    if (absY >= absX && absY >= absZ) {
      return { axis: 'Y', value: analysis.gradientDirectionY, sign: analysis.gradientDirectionY > 0 ? '+' : '-' };
    }
    return { axis: 'Z', value: analysis.gradientDirectionZ, sign: analysis.gradientDirectionZ > 0 ? '+' : '-' };
  }, [analysis]);

  // Anisotropy classification
  const anisotropyClass = useMemo((): { label: string; tone: StatusTone } => {
    if (analysis.anisotropyIndex > 0.7) return { label: 'Strong', tone: 'warn' };
    if (analysis.anisotropyIndex > 0.4) return { label: 'Moderate', tone: 'warn' };
    if (analysis.anisotropyIndex > 0.2) return { label: 'Weak', tone: 'neutral' };
    return { label: 'Isotropic', tone: 'good' };
  }, [analysis.anisotropyIndex]);

  // Calculate angle from gradient components (in XY plane)
  const gradientAngle = useMemo(() => {
    const angle = Math.atan2(analysis.gradientDirectionY, analysis.gradientDirectionX) * (180 / Math.PI);
    return angle < 0 ? angle + 360 : angle;
  }, [analysis.gradientDirectionX, analysis.gradientDirectionY]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Property Gradient */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Property Gradient ({property})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricCard
                label="Gradient Magnitude"
                value={analysis.gradientMagnitude.toFixed(4)}
                unit={`${propertyUnit}/unit`}
                tooltip="Overall rate of property change across the sample"
              />
              <div className="p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Primary Direction</span>
                <div className="font-mono text-sm">
                  {primaryDirection.sign}{primaryDirection.axis} axis
                </div>
              </div>
            </div>

            {/* Gradient components */}
            <div className="grid grid-cols-3 gap-2">
              <GradientComponent 
                label="X" 
                value={analysis.gradientDirectionX} 
                color="#2a4d8f"
              />
              <GradientComponent 
                label="Y" 
                value={analysis.gradientDirectionY} 
                color="#3aa0a0"
              />
              <GradientComponent 
                label="Z" 
                value={analysis.gradientDirectionZ} 
                color="#e8594f"
              />
            </div>

            {/* Gradient direction compass */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">Gradient Direction (XY Plane)</div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-muted relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="w-1 h-6 bg-primary rounded-full origin-bottom"
                      style={{ transform: `rotate(${gradientAngle - 90}deg)` }}
                    />
                  </div>
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-xs">N</span>
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-xs">S</span>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 text-xs">W</span>
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 text-xs">E</span>
                </div>
                <div className="text-sm">
                  <div className="font-mono">{gradientAngle.toFixed(1)}°</div>
                  <div className="text-xs text-muted-foreground">from +X axis</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anisotropy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Compass className="w-4 h-4" />
              Anisotropy Analysis
              <StatusChip tone={anisotropyClass.tone}>{anisotropyClass.label}</StatusChip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricCard
                label="Anisotropy Index"
                value={analysis.anisotropyIndex.toFixed(3)}
                tooltip="0 = isotropic (same in all directions), 1 = highly directional"
              />
              <div className="p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Principal Axis</span>
                <div className="font-mono text-sm">
                  {analysis.principalAxis.x ? 'X' : analysis.principalAxis.y ? 'Y' : 'Z'}
                </div>
              </div>
            </div>

            {/* Anisotropy bar */}
            <div className="mt-2">
              <div className="text-xs text-muted-foreground mb-1">Anisotropy Scale</div>
              <div className="h-2 rounded-full relative" style={{ background: 'linear-gradient(90deg, #3aa0a0 0%, #888 50%, #e8594f 100%)' }}>
                <div 
                  className="absolute w-3 h-3 bg-foreground rounded-full border-2 border-background -top-0.5 transform -translate-x-1/2"
                  style={{ left: `${analysis.anisotropyIndex * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Isotropic</span>
                <span>Anisotropic</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Directional Variance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Directional Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <VarianceBar 
                label="X Direction" 
                value={analysis.xDirectionVariance}
                max={Math.max(analysis.xDirectionVariance, analysis.yDirectionVariance, analysis.zDirectionVariance)}
                color="#2a4d8f"
              />
              <VarianceBar 
                label="Y Direction" 
                value={analysis.yDirectionVariance}
                max={Math.max(analysis.xDirectionVariance, analysis.yDirectionVariance, analysis.zDirectionVariance)}
                color="#3aa0a0"
              />
              <VarianceBar 
                label="Z Direction" 
                value={analysis.zDirectionVariance}
                max={Math.max(analysis.xDirectionVariance, analysis.yDirectionVariance, analysis.zDirectionVariance)}
                color="#e8594f"
              />
            </div>

            <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              {analysis.anisotropyIndex > 0.4 ? (
                <p>
                  <strong>Directional dependence detected:</strong> Property values vary more strongly 
                  along the {analysis.principalAxis.x ? 'X' : analysis.principalAxis.y ? 'Y' : 'Z'} axis.
                  This may indicate a gradient or structural orientation in the sample.
                </p>
              ) : (
                <p>
                  <strong>Relatively isotropic:</strong> Property values vary similarly in all directions.
                  No strong directional preference detected.
                </p>
              )}
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

interface GradientComponentProps {
  label: string;
  value: number;
  color: string;
}

const GradientComponent: React.FC<GradientComponentProps> = ({ label, value, color }) => (
  <div className="p-2 bg-muted/30 rounded-lg text-center">
    <div className="flex items-center justify-center gap-1 mb-1">
      <div className="w-2 h-2 rounded" style={{ background: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <div className="font-mono text-xs">{value.toFixed(3)}</div>
    <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
      <div 
        className="h-full"
        style={{ width: `${Math.abs(value) * 100}%`, background: color }}
      />
    </div>
  </div>
);

interface VarianceBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

const VarianceBar: React.FC<VarianceBarProps> = ({ label, value, max, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value.toFixed(4)}</span>
    </div>
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div 
        className="h-full transition-all"
        style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%', background: color }}
      />
    </div>
  </div>
);
