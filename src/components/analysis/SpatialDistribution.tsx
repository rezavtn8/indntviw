import React, { useMemo } from 'react';
import { IndentationPoint } from '@/types/indentation';
import { calculateSpatialDistribution, SpatialDistributionResult } from '@/utils/spatial3DStatistics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusChip, StatusTone } from '@/components/ui/status-chip';
import { Badge } from '@/components/ui/badge';
import { MapPin, Crosshair, Activity, Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface SpatialDistributionProps {
  points: IndentationPoint[];
  property: string;
  propertyUnit: string;
}

export const SpatialDistribution: React.FC<SpatialDistributionProps> = ({
  points,
  property,
  propertyUnit,
}) => {
  const analysis = useMemo((): SpatialDistributionResult => 
    calculateSpatialDistribution(points, property),
    [points, property]
  );

  // Interpret NN ratio
  const patternType = useMemo((): { label: string; tone: StatusTone; icon: string } => {
    if (analysis.nnRatio < 0.8) return { label: 'Clustered', tone: 'warn', icon: '◆' };
    if (analysis.nnRatio > 1.2) return { label: 'Dispersed', tone: 'info', icon: '◇' };
    return { label: 'Random', tone: 'neutral', icon: '○' };
  }, [analysis.nnRatio]);

  // Interpret Moran's I — navy = positive, coral = negative (matches diverging colormap convention)
  const autocorrelationType = useMemo(() => {
    if (analysis.moransI > 0.3) return { label: 'Strong Positive', color: '#2a4d8f', desc: 'Similar values cluster together' };
    if (analysis.moransI > 0.1) return { label: 'Weak Positive', color: '#3aa0a0', desc: 'Some clustering of similar values' };
    if (analysis.moransI < -0.3) return { label: 'Strong Negative', color: '#e8594f', desc: 'Dissimilar values cluster (checkerboard)' };
    if (analysis.moransI < -0.1) return { label: 'Weak Negative', color: '#e8594f', desc: 'Some dispersal of similar values' };
    return { label: 'Random', color: 'hsl(var(--muted-foreground))', desc: 'No spatial pattern detected' };
  }, [analysis.moransI]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Point Density */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Point Density
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Point Density"
                value={analysis.pointDensity.toFixed(4)}
                unit="pts/unit²"
                tooltip="Number of measurement points per unit area"
              />
              <MetricCard
                label="Density Variance"
                value={analysis.densityVariance.toFixed(4)}
                tooltip="Variation in local point density. High = uneven sampling"
              />
            </div>
          </CardContent>
        </Card>

        {/* Nearest Neighbor Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crosshair className="w-4 h-4" />
              Nearest Neighbor Analysis
              <StatusChip tone={patternType.tone}>{patternType.icon} {patternType.label}</StatusChip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricCard
                label="Mean NN Distance"
                value={analysis.meanNearestNeighborDist.toFixed(4)}
                unit="units"
                tooltip="Average distance to nearest neighboring point"
              />
              <MetricCard
                label="NN Ratio (R)"
                value={analysis.nnRatio.toFixed(3)}
                tooltip="Ratio of observed to expected NN distance. <1 = clustered, >1 = dispersed"
              />
            </div>

            {/* NN Ratio visualization */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">Spatial Pattern</div>
              <div className="relative h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #e8594f 0%, #888 50%, #2a4d8f 100%)' }}>
                <div 
                  className="absolute w-3 h-3 bg-foreground rounded-full border-2 border-background -top-0.5 transform -translate-x-1/2"
                  style={{ left: `${Math.min(100, Math.max(0, analysis.nnRatio * 50))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Clustered</span>
                <span>Random</span>
                <span>Dispersed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spatial Autocorrelation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Spatial Autocorrelation (Moran's I)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricCard
                label="Moran's I"
                value={analysis.moransI.toFixed(4)}
                tooltip="Measure of spatial autocorrelation. +1 = perfect clustering, -1 = perfect dispersion, 0 = random"
              />
              <MetricCard
                label="Z-Score"
                value={analysis.moransIZScore.toFixed(2)}
                tooltip="Standardised deviation from the expected value under spatial randomness, using the randomisation-assumption variance (Cliff & Ord)."
              />
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: autocorrelationType.color }}>
                  {autocorrelationType.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {autocorrelationType.desc}
              </p>
              <Badge variant="outline" className="mt-2 text-xs">
                p = {analysis.moransIPValue < 0.001 ? '<0.001' : analysis.moransIPValue.toFixed(3)}
                {analysis.moransIPValue < 0.05 ? ' — significant' : ' — not significant'}
              </Badge>
            </div>

            {/* Moran's I visualization */}
            <div className="mt-4 relative h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #e8594f 0%, #888 50%, #2a4d8f 100%)' }}>
              <div 
                className="absolute w-3 h-3 bg-foreground rounded-full border-2 border-background -top-0.5 transform -translate-x-1/2"
                style={{ left: `${(analysis.moransI + 1) * 50}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Negative (-1)</span>
              <span>Random (0)</span>
              <span>Positive (+1)</span>
            </div>
          </CardContent>
        </Card>

        {/* Hotspots & Coldspots */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Hotspots & Coldspots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg text-center" style={{ background: '#e8594f1a' }}>
                <div className="text-2xl font-bold" style={{ color: '#e8594f' }}>{analysis.hotspotCount}</div>
                <div className="text-xs text-muted-foreground">Hotspots</div>
                <div className="text-xs text-muted-foreground">(High {property})</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: '#2a4d8f1a' }}>
                <div className="text-2xl font-bold" style={{ color: '#2a4d8f' }}>{analysis.coldspotCount}</div>
                <div className="text-xs text-muted-foreground">Coldspots</div>
                <div className="text-xs text-muted-foreground">(Low {property})</div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              <p>
                <strong>Hotspots:</strong> Points with {property} values &gt; mean + 2σ
              </p>
              <p>
                <strong>Coldspots:</strong> Points with {property} values &lt; mean - 2σ
              </p>
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
