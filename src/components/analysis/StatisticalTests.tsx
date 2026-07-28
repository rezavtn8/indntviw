import React, { useMemo } from 'react';
import {
  welchTTest,
  mannWhitneyU,
  oneWayANOVA,
  kruskalWallis,
  calculateEffectSize,
  pairwisePostHoc,
  shapiroWilkTest,
  DescriptiveStats,
} from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface StatisticalTestsProps {
  data: { name: string; color: string; values: number[]; stats: DescriptiveStats }[];
  selectedProperty: string;
}

export const StatisticalTests: React.FC<StatisticalTestsProps> = ({ data, selectedProperty }) => {
  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  const formatP = (p: number): string => {
    if (p < 0.001) return '<0.001';
    if (p < 0.01) return p.toFixed(3);
    return p.toFixed(3);
  };

  // Run normality tests
  const normalityTests = useMemo(() => {
    return data.map(d => ({
      name: d.name,
      color: d.color,
      ...shapiroWilkTest(d.values),
    }));
  }, [data]);

  const allNormal = normalityTests.every(t => t.isNormal);

  // Two-group comparison
  const twoGroupTests = useMemo(() => {
    if (data.length !== 2) return null;
    const [g1, g2] = data;
    
    return {
      welch: welchTTest(g1.values, g2.values),
      mannWhitney: mannWhitneyU(g1.values, g2.values),
      effectSize: calculateEffectSize(g1.values, g2.values),
    };
  }, [data]);

  // Multi-group comparison
  const multiGroupTests = useMemo(() => {
    if (data.length < 2) return null;
    const groups = data.map(d => d.values);
    const namedGroups = data.map(d => ({ name: d.name, values: d.values }));
    
    return {
      anova: oneWayANOVA(groups),
      kruskalWallis: kruskalWallis(groups),
      postHoc: data.length > 2 ? pairwisePostHoc(namedGroups) : null,
    };
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="border-2 border-border rounded-lg p-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">Statistical Tests</h4>
        <p className="text-muted-foreground font-mono text-sm">
          Select at least 2 zones to perform statistical comparisons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Normality Tests */}
      <div className="border-2 border-border rounded-lg p-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
          Normality Tests (Shapiro-Wilk)
        </h4>
        <div className="space-y-2">
          {normalityTests.map(t => (
            <div key={t.name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
                <span className="font-mono text-sm">{t.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  W = {t.shapiroWilk.statistic.toFixed(4)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  p = {formatP(t.shapiroWilk.pValue)}
                </span>
                <Badge variant={t.isNormal ? 'secondary' : 'destructive'} className="text-xs">
                  {t.isNormal ? 'Normal' : 'Non-normal'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>
            {allNormal
              ? 'All groups appear normally distributed. Parametric tests are appropriate.'
              : 'Some groups may not be normally distributed. Consider non-parametric tests.'}
          </span>
        </div>
      </div>

      {/* Two-Group Tests */}
      {twoGroupTests && (
        <div className="border-2 border-border rounded-lg p-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
            Two-Sample Tests: {data[0].name} vs {data[1].name}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Welch's t-test */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Welch's t-test</span>
                {twoGroupTests.welch.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">t-statistic:</span>
                <span>{twoGroupTests.welch.statistic.toFixed(3)}</span>
                <span className="text-muted-foreground">df:</span>
                <span>{twoGroupTests.welch.df.toFixed(1)}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={twoGroupTests.welch.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(twoGroupTests.welch.pValue)}
                </span>
                <span className="text-muted-foreground">Mean diff:</span>
                <span>{twoGroupTests.welch.meanDiff.toFixed(4)}</span>
                <span className="text-muted-foreground">95% CI:</span>
                <span>[{twoGroupTests.welch.ci95Lower.toFixed(4)}, {twoGroupTests.welch.ci95Upper.toFixed(4)}]</span>
              </div>
            </div>

            {/* Mann-Whitney U */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Mann-Whitney U</span>
                {twoGroupTests.mannWhitney.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">U-statistic:</span>
                <span>{twoGroupTests.mannWhitney.uStatistic.toFixed(1)}</span>
                <span className="text-muted-foreground">Z-score:</span>
                <span>{twoGroupTests.mannWhitney.zScore.toFixed(3)}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={twoGroupTests.mannWhitney.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(twoGroupTests.mannWhitney.pValue)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic">Non-parametric alternative</p>
            </div>
          </div>

          {/* Effect Size */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <span className="font-mono text-sm font-bold">Effect Size</span>
            <div className="grid grid-cols-3 gap-4 mt-2 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block">Cohen's d:</span>
                <span className="text-lg font-bold">{twoGroupTests.effectSize.cohensD.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Hedges' g:</span>
                <span className="text-lg font-bold">{twoGroupTests.effectSize.hedgesG.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Interpretation:</span>
                <Badge variant="outline" className="text-xs capitalize mt-1">
                  {twoGroupTests.effectSize.interpretation}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Group Tests (ANOVA) */}
      {multiGroupTests && data.length >= 2 && (
        <div className="border-2 border-border rounded-lg p-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
            {data.length === 2 ? 'Group Comparison' : 'Multi-Group Comparison'} ({data.length} groups)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ANOVA */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">One-way ANOVA</span>
                {multiGroupTests.anova.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">F-statistic:</span>
                <span>{multiGroupTests.anova.fStatistic.toFixed(3)}</span>
                <span className="text-muted-foreground">df (between):</span>
                <span>{multiGroupTests.anova.dfBetween}</span>
                <span className="text-muted-foreground">df (within):</span>
                <span>{multiGroupTests.anova.dfWithin}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={multiGroupTests.anova.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(multiGroupTests.anova.pValue)}
                </span>
                <span className="text-muted-foreground">η² (eta-squared):</span>
                <span>{multiGroupTests.anova.etaSquared.toFixed(4)}</span>
              </div>
            </div>

            {/* Kruskal-Wallis */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Kruskal-Wallis H</span>
                {multiGroupTests.kruskalWallis.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">H-statistic:</span>
                <span>{multiGroupTests.kruskalWallis.hStatistic.toFixed(3)}</span>
                <span className="text-muted-foreground">df:</span>
                <span>{multiGroupTests.kruskalWallis.df}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={multiGroupTests.kruskalWallis.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(multiGroupTests.kruskalWallis.pValue)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic">Non-parametric alternative</p>
            </div>
          </div>

          {/* Post-hoc Tests */}
          {multiGroupTests.postHoc && multiGroupTests.postHoc.length > 0 && (
            <div className="mt-4">
              <h5 className="font-mono text-sm font-bold mb-2">Pairwise post-hoc (Holm-corrected)</h5>
              <div className="space-y-1">
                {multiGroupTests.postHoc.map((ph, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs font-mono">
                    <span>{ph.group1} vs {ph.group2}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">Δ = {ph.meanDiff.toFixed(4)}</span>
                      <span className="text-muted-foreground">p = {formatP(ph.pValue)}</span>
                      {ph.isSignificant ? (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
