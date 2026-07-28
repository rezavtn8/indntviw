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
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getSampleColor } from './SampleSelector';

interface SampleData {
  id: string;
  name: string;
  colorIndex: number;
  values: number[];
  stats: DescriptiveStats;
}

interface CrossSampleTestsProps {
  samples: SampleData[];
  selectedProperty: string;
}

export const CrossSampleTests: React.FC<CrossSampleTestsProps> = ({ samples, selectedProperty }) => {
  const formatP = (p: number): string => {
    if (p < 0.001) return '<0.001';
    if (p < 0.01) return p.toFixed(3);
    return p.toFixed(3);
  };

  // Run normality tests
  const normalityTests = useMemo(() => {
    return samples.map(s => ({
      name: s.name,
      colorIndex: s.colorIndex,
      ...shapiroWilkTest(s.values),
    }));
  }, [samples]);

  const allNormal = normalityTests.every(t => t.isNormal);

  // Two-sample comparison
  const twoSampleTests = useMemo(() => {
    if (samples.length !== 2) return null;
    const [s1, s2] = samples;
    
    return {
      welch: welchTTest(s1.values, s2.values),
      mannWhitney: mannWhitneyU(s1.values, s2.values),
      effectSize: calculateEffectSize(s1.values, s2.values),
    };
  }, [samples]);

  // Multi-sample comparison
  const multiSampleTests = useMemo(() => {
    if (samples.length < 2) return null;
    const groups = samples.map(s => s.values);
    const namedGroups = samples.map(s => ({ name: s.name, values: s.values }));
    
    return {
      anova: oneWayANOVA(groups),
      kruskalWallis: kruskalWallis(groups),
      postHoc: samples.length > 2 ? pairwisePostHoc(namedGroups) : null,
    };
  }, [samples]);

  if (samples.length < 2) {
    return (
      <div className="border-2 border-border rounded-lg p-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">Cross-Sample Statistical Tests</h4>
        <p className="text-muted-foreground font-mono text-sm">
          Select at least 2 samples to perform statistical comparisons.
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
                <div className="w-3 h-3 rounded" style={{ backgroundColor: getSampleColor(t.colorIndex) }} />
                <span className="font-mono text-sm truncate max-w-[150px]">{t.name}</span>
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
              ? 'All samples appear normally distributed. Parametric tests are appropriate.'
              : 'Some samples may not be normally distributed. Consider non-parametric tests.'}
          </span>
        </div>
      </div>

      {/* Two-Sample Tests */}
      {twoSampleTests && (
        <div className="border-2 border-border rounded-lg p-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
            Two-Sample Tests: {samples[0].name} vs {samples[1].name}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Welch's t-test */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Welch's t-test</span>
                {twoSampleTests.welch.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">t-statistic:</span>
                <span>{twoSampleTests.welch.statistic.toFixed(3)}</span>
                <span className="text-muted-foreground">df:</span>
                <span>{twoSampleTests.welch.df.toFixed(1)}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={twoSampleTests.welch.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(twoSampleTests.welch.pValue)}
                </span>
                <span className="text-muted-foreground">Mean diff:</span>
                <span>{twoSampleTests.welch.meanDiff.toFixed(4)}</span>
                <span className="text-muted-foreground">95% CI:</span>
                <span>[{twoSampleTests.welch.ci95Lower.toFixed(4)}, {twoSampleTests.welch.ci95Upper.toFixed(4)}]</span>
              </div>
            </div>

            {/* Mann-Whitney U */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Mann-Whitney U</span>
                {twoSampleTests.mannWhitney.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">U-statistic:</span>
                <span>{twoSampleTests.mannWhitney.uStatistic.toFixed(1)}</span>
                <span className="text-muted-foreground">Z-score:</span>
                <span>{twoSampleTests.mannWhitney.zScore.toFixed(3)}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={twoSampleTests.mannWhitney.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(twoSampleTests.mannWhitney.pValue)}
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
                <span className="text-lg font-bold">{twoSampleTests.effectSize.cohensD.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Hedges' g:</span>
                <span className="text-lg font-bold">{twoSampleTests.effectSize.hedgesG.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Interpretation:</span>
                <Badge variant="outline" className="text-xs capitalize mt-1">
                  {twoSampleTests.effectSize.interpretation}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Sample Tests */}
      {multiSampleTests && samples.length >= 2 && (
        <div className="border-2 border-border rounded-lg p-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
            {samples.length === 2 ? 'Sample Comparison' : 'Multi-Sample Comparison'} ({samples.length} samples)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ANOVA */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">One-way ANOVA</span>
                {multiSampleTests.anova.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">F-statistic:</span>
                <span>{multiSampleTests.anova.fStatistic.toFixed(3)}</span>
                <span className="text-muted-foreground">df (between):</span>
                <span>{multiSampleTests.anova.dfBetween}</span>
                <span className="text-muted-foreground">df (within):</span>
                <span>{multiSampleTests.anova.dfWithin}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={multiSampleTests.anova.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(multiSampleTests.anova.pValue)}
                </span>
                <span className="text-muted-foreground">η² (eta-squared):</span>
                <span>{multiSampleTests.anova.etaSquared.toFixed(4)}</span>
              </div>
            </div>

            {/* Kruskal-Wallis */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Kruskal-Wallis H</span>
                {multiSampleTests.kruskalWallis.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">H-statistic:</span>
                <span>{multiSampleTests.kruskalWallis.hStatistic.toFixed(3)}</span>
                <span className="text-muted-foreground">df:</span>
                <span>{multiSampleTests.kruskalWallis.df}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={multiSampleTests.kruskalWallis.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(multiSampleTests.kruskalWallis.pValue)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic">Non-parametric alternative</p>
            </div>
          </div>

          {/* Post-hoc Tests */}
          {multiSampleTests.postHoc && multiSampleTests.postHoc.length > 0 && (
            <div className="mt-4">
              <h5 className="font-mono text-sm font-bold mb-2">Pairwise post-hoc (Holm-corrected)</h5>
              <div className="space-y-1">
                {multiSampleTests.postHoc.map((ph, idx) => (
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
