import React, { useMemo } from 'react';
import { IndentationPoint } from '@/types/indentation';
import { calculateDepthAnalysis, DepthAnalysisResult } from '@/utils/spatial3DStatistics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Layers, TrendingUp, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceLine
} from 'recharts';

interface DepthAnalysisProps {
  points: IndentationPoint[];
  property: string;
  propertyUnit: string;
}

export const DepthAnalysis: React.FC<DepthAnalysisProps> = ({
  points,
  property,
  propertyUnit,
}) => {
  const [numLayers, setNumLayers] = React.useState(4);
  
  const analysis = useMemo((): DepthAnalysisResult => 
    calculateDepthAnalysis(points, property, numLayers),
    [points, property, numLayers]
  );

  // Prepare depth vs property scatter data
  const scatterData = useMemo(() => 
    points.map(p => ({
      z: p.z,
      value: p.properties[property] ?? 0,
    })),
    [points, property]
  );

  // Layer chart data
  const layerChartData = useMemo(() => 
    analysis.layers.map(layer => ({
      name: layer.layerName.replace(/Layer \d+ \(/, '').replace(')', ''),
      mean: layer.meanProperty,
      min: layer.minProperty,
      max: layer.maxProperty,
      count: layer.pointCount,
    })),
    [analysis.layers]
  );

  // Depth histogram data
  const depthHistogram = useMemo(() => {
    const bins = 20;
    const zMin = analysis.zMin;
    const zMax = analysis.zMax;
    const binWidth = (zMax - zMin) / bins || 1;
    
    const histogram = Array(bins).fill(0).map((_, i) => ({
      z: zMin + (i + 0.5) * binWidth,
      count: 0,
    }));
    
    points.forEach(p => {
      const binIndex = Math.min(Math.floor((p.z - zMin) / binWidth), bins - 1);
      if (binIndex >= 0 && binIndex < bins) {
        histogram[binIndex].count++;
      }
    });
    
    return histogram;
  }, [points, analysis.zMin, analysis.zMax]);

  return (
    <div className="space-y-4">
      {/* Depth Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Depth Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Z Range</dt>
              <dd className="font-mono">{analysis.zMin.toFixed(3)} – {analysis.zMax.toFixed(3)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Z Mean</dt>
              <dd className="font-mono">{analysis.zMean.toFixed(3)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Z Std Dev</dt>
              <dd className="font-mono">{analysis.zStdDev.toFixed(3)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Z Median</dt>
              <dd className="font-mono">{analysis.zMedian.toFixed(3)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Depth Distribution Histogram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Depth Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depthHistogram}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="z" tickFormatter={(v) => v.toFixed(2)} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Count']}
                  labelFormatter={(label) => `Z: ${Number(label).toFixed(3)}`}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Depth vs Property Correlation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Depth vs {property} Correlation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Gradient</dt>
              <dd className="font-mono">{analysis.depthGradient.toFixed(4)} {propertyUnit}/unit</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Correlation (r)</dt>
              <dd className={`font-mono ${Math.abs(analysis.depthCorrelation) > 0.5 ? 'text-primary' : ''}`}>
                {analysis.depthCorrelation.toFixed(3)}
              </dd>
            </div>
          </dl>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" dataKey="z" name="Z" tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="value" name={property} tick={{ fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.6}>
                  {scatterData.map((_, index) => (
                    <Cell key={index} fill="hsl(var(--primary))" />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Layer Analysis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layer Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs whitespace-nowrap">Layers:</Label>
            <Slider
              value={[numLayers]}
              onValueChange={([v]) => setNumLayers(v)}
              min={2}
              max={10}
              step={1}
              className="flex-1"
            />
            <span className="text-xs font-mono w-6">{numLayers}</span>
          </div>
          
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={layerChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={60} />
                <Tooltip 
                  formatter={(value: number, name: string) => [value.toFixed(2), name]}
                />
                <Bar dataKey="mean" fill="hsl(var(--primary))" name={`Mean ${property}`} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Layer statistics table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Layer</th>
                  <th className="text-right py-1">N</th>
                  <th className="text-right py-1">Mean</th>
                  <th className="text-right py-1">Std</th>
                </tr>
              </thead>
              <tbody>
                {analysis.layers.map((layer, i) => (
                  <tr key={i} className="border-b border-muted/50">
                    <td className="py-1 font-mono">{i + 1}</td>
                    <td className="text-right py-1">{layer.pointCount}</td>
                    <td className="text-right py-1 font-mono">{layer.meanProperty.toFixed(2)}</td>
                    <td className="text-right py-1 font-mono">{layer.stdProperty.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
