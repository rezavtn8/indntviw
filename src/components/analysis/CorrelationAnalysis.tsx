import React, { useMemo } from 'react';
import { calculateCorrelation } from '@/utils/advancedStatistics';
import { IndentationPoint, PROPERTY_CONFIGS } from '@/types/indentation';

interface CorrelationAnalysisProps {
  points: IndentationPoint[];
  properties: string[];
}

export const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({ points, properties }) => {
  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label?.split('(')[0].trim() || key;
  };

  const correlationMatrix = useMemo(() => {
    const matrix: {
      prop1: string;
      prop2: string;
      pearsonR: number;
      pearsonP: number;
      spearmanRho: number;
      spearmanP: number;
    }[] = [];

    for (let i = 0; i < properties.length; i++) {
      for (let j = i + 1; j < properties.length; j++) {
        const prop1 = properties[i];
        const prop2 = properties[j];
        
        const values1 = points.map(p => p.properties[prop1]).filter(v => v !== undefined && !isNaN(v));
        const values2 = points.map(p => p.properties[prop2]).filter(v => v !== undefined && !isNaN(v));
        
        // Align values (only use points that have both properties)
        const aligned1: number[] = [];
        const aligned2: number[] = [];
        points.forEach(p => {
          const v1 = p.properties[prop1];
          const v2 = p.properties[prop2];
          if (v1 !== undefined && !isNaN(v1) && v2 !== undefined && !isNaN(v2)) {
            aligned1.push(v1);
            aligned2.push(v2);
          }
        });

        if (aligned1.length > 2) {
          const result = calculateCorrelation(aligned1, aligned2);
          matrix.push({
            prop1,
            prop2,
            ...result,
          });
        }
      }
    }

    return matrix.sort((a, b) => Math.abs(b.pearsonR) - Math.abs(a.pearsonR));
  }, [points, properties]);

  const getCorrelationColor = (r: number): string => {
    const absR = Math.abs(r);
    if (absR > 0.7) return r > 0 ? 'text-green-600' : 'text-red-600';
    if (absR > 0.4) return r > 0 ? 'text-green-500' : 'text-red-500';
    return 'text-muted-foreground';
  };

  const getCorrelationBg = (r: number): string => {
    const absR = Math.abs(r);
    if (absR > 0.7) return r > 0 ? 'bg-green-500/20' : 'bg-red-500/20';
    if (absR > 0.4) return r > 0 ? 'bg-green-500/10' : 'bg-red-500/10';
    return 'bg-muted/30';
  };

  const formatR = (r: number): string => {
    const sign = r >= 0 ? '+' : '';
    return sign + r.toFixed(3);
  };

  const formatP = (p: number): string => {
    if (p < 0.001) return '<0.001';
    return p.toFixed(3);
  };

  if (properties.length < 2) {
    return (
      <div className="border-2 border-border rounded-lg p-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">Correlation Analysis</h4>
        <p className="text-muted-foreground font-mono text-sm">
          Need at least 2 properties to calculate correlations.
        </p>
      </div>
    );
  }

  // Create heatmap matrix
  const matrixSize = Math.min(properties.length, 6);
  const displayProps = properties.slice(0, matrixSize);
  const cellSize = 50;

  return (
    <div className="border-2 border-border rounded-lg p-4">
      <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">Correlation Analysis</h4>

      {/* Correlation Heatmap */}
      <div className="mb-6 overflow-x-auto">
        <div className="inline-block">
          <div className="flex">
            <div style={{ width: 80 }} />
            {displayProps.map(prop => (
              <div
                key={prop}
                style={{ width: cellSize }}
                className="text-center font-mono text-xs truncate px-1"
                title={getPropertyLabel(prop)}
              >
                {prop}
              </div>
            ))}
          </div>
          {displayProps.map((prop1, i) => (
            <div key={prop1} className="flex items-center">
              <div style={{ width: 80 }} className="font-mono text-xs truncate pr-2 text-right" title={getPropertyLabel(prop1)}>
                {prop1}
              </div>
              {displayProps.map((prop2, j) => {
                if (i === j) {
                  return (
                    <div
                      key={prop2}
                      style={{ width: cellSize, height: cellSize }}
                      className="flex items-center justify-center bg-muted border border-border"
                    >
                      <span className="font-mono text-xs">1.00</span>
                    </div>
                  );
                }
                const correlation = correlationMatrix.find(
                  c => (c.prop1 === prop1 && c.prop2 === prop2) || (c.prop1 === prop2 && c.prop2 === prop1)
                );
                if (!correlation) {
                  return (
                    <div
                      key={prop2}
                      style={{ width: cellSize, height: cellSize }}
                      className="flex items-center justify-center bg-muted/50 border border-border"
                    >
                      <span className="font-mono text-xs text-muted-foreground">-</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={prop2}
                    style={{ width: cellSize, height: cellSize }}
                    className={`flex items-center justify-center border border-border ${getCorrelationBg(correlation.pearsonR)}`}
                    title={`r = ${correlation.pearsonR.toFixed(3)}, p = ${formatP(correlation.pearsonP)}`}
                  >
                    <span className={`font-mono text-xs font-bold ${getCorrelationColor(correlation.pearsonR)}`}>
                      {correlation.pearsonR.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Top Correlations List */}
      <h5 className="font-mono text-sm font-bold mb-2">Top Correlations</h5>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {correlationMatrix.slice(0, 10).map((corr, idx) => (
          <div key={idx} className={`p-2 rounded ${getCorrelationBg(corr.pearsonR)}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">
                {getPropertyLabel(corr.prop1)} ↔ {getPropertyLabel(corr.prop2)}
              </span>
              <span className={`font-mono text-sm font-bold ${getCorrelationColor(corr.pearsonR)}`}>
                r = {formatR(corr.pearsonR)}
              </span>
            </div>
            <div className="flex gap-4 text-xs font-mono text-muted-foreground mt-1">
              <span>Pearson: r={corr.pearsonR.toFixed(3)}, p={formatP(corr.pearsonP)}</span>
              <span>Spearman: ρ={corr.spearmanRho.toFixed(3)}, p={formatP(corr.spearmanP)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500/20 border border-red-500/30 rounded" />
          <span>Strong negative</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-muted/30 border border-border rounded" />
          <span>Weak</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500/20 border border-green-500/30 rounded" />
          <span>Strong positive</span>
        </div>
      </div>
    </div>
  );
};
