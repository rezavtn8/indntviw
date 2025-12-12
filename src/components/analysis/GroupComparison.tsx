import React, { useMemo } from 'react';
import { FileSession } from '@/types/fileSession';
import { SampleGroup, getGroupColor } from './SampleGrouping';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import {
  calculateDescriptiveStats,
  getPropertyValues,
  welchTTest,
  mannWhitneyU,
  calculateEffectSize,
  oneWayANOVA,
  kruskalWallis,
  tukeyHSD,
  DescriptiveStats,
} from '@/utils/advancedStatistics';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Users } from 'lucide-react';

interface GroupData {
  group: SampleGroup;
  values: number[];
  stats: DescriptiveStats;
  sampleCount: number;
}

interface GroupComparisonProps {
  fileSessions: FileSession[];
  groups: SampleGroup[];
  selectedProperty: string;
}

export const GroupComparison: React.FC<GroupComparisonProps> = ({
  fileSessions,
  groups,
  selectedProperty,
}) => {
  const formatP = (p: number): string => {
    if (p < 0.001) return '<0.001';
    return p.toFixed(3);
  };

  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(1);
    if (Math.abs(val) < 0.01) return val.toExponential(2);
    return val.toFixed(3);
  };

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  // Aggregate data by group
  const groupData = useMemo((): GroupData[] => {
    return groups
      .filter(g => g.sessionIds.length > 0)
      .map(group => {
        const groupSessions = fileSessions.filter(s => group.sessionIds.includes(s.id));
        const allValues: number[] = [];
        
        groupSessions.forEach(session => {
          const values = getPropertyValues(session.data.points, selectedProperty);
          allValues.push(...values);
        });

        return {
          group,
          values: allValues,
          stats: calculateDescriptiveStats(allValues),
          sampleCount: groupSessions.length,
        };
      })
      .filter(g => g.values.length > 0);
  }, [fileSessions, groups, selectedProperty]);

  // Two-group comparison
  const twoGroupTests = useMemo(() => {
    if (groupData.length !== 2) return null;
    const [g1, g2] = groupData;

    return {
      welch: welchTTest(g1.values, g2.values),
      mannWhitney: mannWhitneyU(g1.values, g2.values),
      effectSize: calculateEffectSize(g1.values, g2.values),
    };
  }, [groupData]);

  // Multi-group comparison
  const multiGroupTests = useMemo(() => {
    if (groupData.length < 2) return null;
    const valueArrays = groupData.map(g => g.values);
    const namedGroups = groupData.map(g => ({ name: g.group.name, values: g.values }));

    return {
      anova: oneWayANOVA(valueArrays),
      kruskalWallis: kruskalWallis(valueArrays),
      postHoc: groupData.length > 2 ? tukeyHSD(namedGroups) : null,
    };
  }, [groupData]);

  if (groups.length === 0) {
    return (
      <div className="border-2 border-border rounded-lg p-6 text-center">
        <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground font-mono text-sm mb-2">
          No treatment groups defined
        </p>
        <p className="text-muted-foreground/70 font-mono text-xs">
          Create groups in the sidebar to compare samples by treatment category.
        </p>
      </div>
    );
  }

  if (groupData.length < 2) {
    return (
      <div className="border-2 border-border rounded-lg p-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
          Group Comparison
        </h4>
        <p className="text-muted-foreground font-mono text-sm">
          Add samples to at least 2 groups to perform group comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group Statistics */}
      <div className="border-2 border-border rounded-lg p-4">
        <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
          Group Statistics ({getPropertyLabel(selectedProperty)})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-muted-foreground text-xs uppercase">Group</th>
                <th className="text-right p-2 text-muted-foreground text-xs uppercase">Samples</th>
                <th className="text-right p-2 text-muted-foreground text-xs uppercase">N</th>
                <th className="text-right p-2 text-muted-foreground text-xs uppercase">Mean</th>
                <th className="text-right p-2 text-muted-foreground text-xs uppercase">SD</th>
                <th className="text-right p-2 text-muted-foreground text-xs uppercase">Median</th>
                <th className="text-right p-2 text-muted-foreground text-xs uppercase">IQR</th>
              </tr>
            </thead>
            <tbody>
              {groupData.map((g, idx) => (
                <tr key={g.group.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: g.group.color }}
                      />
                      <span className="font-bold">{g.group.name}</span>
                    </div>
                  </td>
                  <td className="text-right p-2">{g.sampleCount}</td>
                  <td className="text-right p-2">{g.stats.n}</td>
                  <td className="text-right p-2">{formatValue(g.stats.mean)}</td>
                  <td className="text-right p-2">{formatValue(g.stats.sd)}</td>
                  <td className="text-right p-2">{formatValue(g.stats.median)}</td>
                  <td className="text-right p-2">{formatValue(g.stats.iqr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Group Tests */}
      {twoGroupTests && (
        <div className="border-2 border-border rounded-lg p-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
            Two-Group Tests: {groupData[0].group.name} vs {groupData[1].group.name}
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

      {/* Multi-Group Tests */}
      {multiGroupTests && groupData.length >= 2 && (
        <div className="border-2 border-border rounded-lg p-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
            {groupData.length === 2 ? 'Group Comparison' : 'Multi-Group Comparison'} ({groupData.length} groups)
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
              <h5 className="font-mono text-sm font-bold mb-2">Post-hoc Pairwise Comparisons (Tukey HSD)</h5>
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
