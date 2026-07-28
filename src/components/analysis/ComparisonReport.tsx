import React, { useMemo } from 'react';
import {
  shapiroWilkTest,
  welchTTest,
  mannWhitneyU,
  calculateEffectSize,
  oneWayANOVA,
  kruskalWallis,
  pairwisePostHoc,
} from '@/utils/advancedStatistics';
import { formatP, formatValue, formatCI } from '@/utils/formatStats';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export interface ComparisonGroup {
  name: string;
  values: number[];
  color?: string;
}

export interface ComparisonReportProps {
  groups: ComparisonGroup[];
  /** Heading for the report block. */
  title?: string;
  /**
   * What one observation represents — "indents", "samples", "zones". Rendered
   * next to each n so the reader always knows the unit of analysis, which is
   * what separates a legitimate group comparison from pseudoreplication.
   */
  unit?: string;
  /** Shown when there are fewer than `minGroups` usable groups. */
  emptyHint?: string;
  minGroups?: number;
  showNormality?: boolean;
  /** Tighter spacing for use inside side panels. */
  compact?: boolean;
}

/**
 * The single statistical comparison report.
 *
 * Eleven components previously each carried their own copy of this pipeline —
 * normality -> two-group (Welch / Mann-Whitney / effect size) -> multi-group
 * (ANOVA / Kruskal-Wallis / post-hoc) -> render — differing mainly in headings
 * and the word used for "group". That was roughly 4,200 lines of duplication,
 * and it meant a statistical fix had to be applied eleven times to take effect.
 *
 * Callers now keep only the part that is genuinely theirs: deciding what the
 * groups are. Everything downstream of that is here.
 */
export const ComparisonReport: React.FC<ComparisonReportProps> = ({
  groups,
  title = 'Statistical Tests',
  unit = 'observations',
  emptyHint,
  minGroups = 2,
  showNormality = true,
  compact = false,
}) => {
  // Groups with too few points cannot be tested; drop them rather than
  // producing NaNs downstream.
  const usable = useMemo(
    () => groups.filter(g => g.values.length >= 2),
    [groups],
  );

  const normality = useMemo(
    () => (showNormality ? usable.map(g => ({ ...g, ...shapiroWilkTest(g.values) })) : []),
    [usable, showNormality],
  );

  const allNormal = normality.length > 0 && normality.every(t => t.isNormal);

  const twoGroup = useMemo(() => {
    if (usable.length !== 2) return null;
    const [a, b] = usable;
    return {
      welch: welchTTest(a.values, b.values),
      mannWhitney: mannWhitneyU(a.values, b.values),
      effectSize: calculateEffectSize(a.values, b.values),
    };
  }, [usable]);

  const multiGroup = useMemo(() => {
    if (usable.length < 2) return null;
    const arrays = usable.map(g => g.values);
    return {
      anova: oneWayANOVA(arrays),
      kruskalWallis: kruskalWallis(arrays),
      postHoc: usable.length > 2
        ? pairwisePostHoc(usable.map(g => ({ name: g.name, values: g.values })))
        : null,
    };
  }, [usable]);

  if (usable.length < minGroups) {
    return (
      <div className="border-2 border-border rounded-lg p-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-2">{title}</h4>
        <p className="text-muted-foreground font-mono text-sm">
          {emptyHint ?? `Select at least ${minGroups} groups with data to run comparisons.`}
        </p>
      </div>
    );
  }

  const pad = compact ? 'p-3' : 'p-4';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Group roster — states n and its unit up front */}
      <div className={`border-2 border-border rounded-lg ${pad}`}>
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider">{title}</h4>
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            {usable.length} groups · n in {unit}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {usable.map(g => (
            <span
              key={g.name}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 font-mono text-xs"
            >
              {g.color && (
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: g.color }} />
              )}
              {g.name}
              <span className="text-muted-foreground">n={g.values.length}</span>
            </span>
          ))}
        </div>
      </div>

      {showNormality && normality.length > 0 && (
        <div className={`border-2 border-border rounded-lg ${pad}`}>
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-3">
            Normality (Shapiro–Wilk)
          </h4>
          <div className="space-y-2">
            {normality.map(t => (
              <div key={t.name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-2">
                  {t.color && <div className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />}
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
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {allNormal
                ? 'All groups are consistent with normality. Parametric tests are appropriate.'
                : 'At least one group deviates from normality. Prefer the non-parametric result below.'}
            </span>
          </div>
        </div>
      )}

      {twoGroup && (
        <div className={`border-2 border-border rounded-lg ${pad}`}>
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-3">
            Two-group: {usable[0].name} vs {usable[1].name}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Welch's t-test</span>
                <Badge
                  variant={twoGroup.welch.isSignificant ? undefined : 'secondary'}
                  className={twoGroup.welch.isSignificant ? 'bg-primary text-primary-foreground text-xs' : 'text-xs'}
                >
                  {twoGroup.welch.isSignificant ? 'Significant' : 'Not significant'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">t:</span>
                <span>{formatValue(twoGroup.welch.statistic)}</span>
                <span className="text-muted-foreground">df:</span>
                <span>{twoGroup.welch.df.toFixed(1)}</span>
                <span className="text-muted-foreground">p:</span>
                <span className={twoGroup.welch.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(twoGroup.welch.pValue)}
                </span>
                <span className="text-muted-foreground">Mean diff:</span>
                <span>{formatValue(twoGroup.welch.meanDiff, 4)}</span>
                <span className="text-muted-foreground">95% CI:</span>
                <span>{formatCI(twoGroup.welch.ci95Lower, twoGroup.welch.ci95Upper, 4)}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Mann–Whitney U</span>
                <Badge
                  variant={twoGroup.mannWhitney.isSignificant ? undefined : 'secondary'}
                  className={twoGroup.mannWhitney.isSignificant ? 'bg-primary text-primary-foreground text-xs' : 'text-xs'}
                >
                  {twoGroup.mannWhitney.isSignificant ? 'Significant' : 'Not significant'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">U:</span>
                <span>{twoGroup.mannWhitney.uStatistic.toFixed(1)}</span>
                <span className="text-muted-foreground">Z:</span>
                <span>{formatValue(twoGroup.mannWhitney.zScore)}</span>
                <span className="text-muted-foreground">p:</span>
                <span className={twoGroup.mannWhitney.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(twoGroup.mannWhitney.pValue)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic">Non-parametric alternative</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <span className="font-mono text-sm font-bold">Effect size</span>
            <div className="grid grid-cols-3 gap-4 mt-2 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block">Cohen's d:</span>
                <span className="text-lg font-bold">{formatValue(twoGroup.effectSize.cohensD)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Hedges' g:</span>
                <span className="text-lg font-bold">{formatValue(twoGroup.effectSize.hedgesG)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Magnitude:</span>
                <Badge variant="outline" className="text-xs capitalize mt-1">
                  {twoGroup.effectSize.interpretation}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {multiGroup && (
        <div className={`border-2 border-border rounded-lg ${pad}`}>
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-3">
            {usable.length === 2 ? 'Group comparison' : `Multi-group comparison (${usable.length} groups)`}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">One-way ANOVA</span>
                <Badge
                  variant={multiGroup.anova.isSignificant ? undefined : 'secondary'}
                  className={multiGroup.anova.isSignificant ? 'bg-primary text-primary-foreground text-xs' : 'text-xs'}
                >
                  {multiGroup.anova.isSignificant ? 'Significant' : 'Not significant'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">F:</span>
                <span>{formatValue(multiGroup.anova.fStatistic)}</span>
                <span className="text-muted-foreground">df between:</span>
                <span>{multiGroup.anova.dfBetween}</span>
                <span className="text-muted-foreground">df within:</span>
                <span>{multiGroup.anova.dfWithin}</span>
                <span className="text-muted-foreground">p:</span>
                <span className={multiGroup.anova.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(multiGroup.anova.pValue)}
                </span>
                <span className="text-muted-foreground">η²:</span>
                <span>{formatValue(multiGroup.anova.etaSquared, 4)}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Kruskal–Wallis H</span>
                <Badge
                  variant={multiGroup.kruskalWallis.isSignificant ? undefined : 'secondary'}
                  className={multiGroup.kruskalWallis.isSignificant ? 'bg-primary text-primary-foreground text-xs' : 'text-xs'}
                >
                  {multiGroup.kruskalWallis.isSignificant ? 'Significant' : 'Not significant'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">H:</span>
                <span>{formatValue(multiGroup.kruskalWallis.hStatistic)}</span>
                <span className="text-muted-foreground">df:</span>
                <span>{multiGroup.kruskalWallis.df}</span>
                <span className="text-muted-foreground">p:</span>
                <span className={multiGroup.kruskalWallis.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(multiGroup.kruskalWallis.pValue)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Non-parametric alternative, tie-corrected
              </p>
            </div>
          </div>

          {multiGroup.postHoc && multiGroup.postHoc.length > 0 && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-2">
                <h5 className="font-mono text-sm font-bold">Pairwise post-hoc</h5>
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                  Holm-corrected · {multiGroup.postHoc.length} comparisons
                </span>
              </div>
              <div className="space-y-1">
                {multiGroup.postHoc.map(ph => (
                  <div
                    key={`${ph.group1}|${ph.group2}`}
                    className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs font-mono"
                  >
                    <span>{ph.group1} vs {ph.group2}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">Δ = {formatValue(ph.meanDiff, 4)}</span>
                      <span className="text-muted-foreground/70">p<sub>raw</sub> = {formatP(ph.pRaw)}</span>
                      <span className={ph.isSignificant ? 'text-primary font-bold' : 'text-muted-foreground'}>
                        p<sub>adj</sub> = {formatP(ph.pValue)}
                      </span>
                      {ph.isSignificant
                        ? <CheckCircle className="w-4 h-4 text-primary" />
                        : <XCircle className="w-4 h-4 text-muted-foreground" />}
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
