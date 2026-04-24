import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { SampleGroup } from './SampleGrouping';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import {
  calculateDescriptiveStats,
  getPropertyValues,
  shapiroWilkTest,
  welchTTest,
  mannWhitneyU,
  calculateEffectSize,
  oneWayANOVA,
  kruskalWallis,
  tukeyHSD,
  DescriptiveStats,
} from '@/utils/advancedStatistics';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BoxViolinPlots, SampleColoredGroup } from './BoxViolinPlots';
import { StatsTable } from './StatsTable';
import { Info, AlertTriangle, ChevronDown, Users } from 'lucide-react';

// Same palette as GroupComparison so colors stay consistent across tabs
const SAMPLE_COLORS = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45',
  '#fabed4', '#469990', '#dcbeff', '#9A6324',
];

type SummaryMode = 'auto' | 'mean' | 'median';

interface SampleSummary {
  sessionId: string;
  sampleName: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  nPoints: number;
  shapiroP: number;
  isNormal: boolean;
  statUsed: 'Mean' | 'Median';
  value: number;
  sampleColor: string;
}

interface GroupSummary {
  group: SampleGroup;
  values: number[]; // per-sample summaries
  stats: DescriptiveStats;
  sampleCount: number;
}

interface Props {
  fileSessions: FileSession[];
  groups: SampleGroup[];
  selectedProperty: string;
}

const cleanName = (name: string) =>
  name.replace(/\.[^/.]+$/, '').replace(/_(JG|RV|[A-Z]{2,3})$/i, '').trim();

const formatP = (p: number): string => {
  if (!isFinite(p)) return '—';
  if (p < 0.001) return '<0.001';
  return p.toFixed(3);
};

const formatVal = (v: number): string => {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a < 0.01) return v.toExponential(2);
  if (a < 100) return v.toFixed(3);
  return v.toFixed(2);
};

export const SampleLevelGroupComparison: React.FC<Props> = ({
  fileSessions, groups, selectedProperty,
}) => {
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);
  const [showSampleColors, setShowSampleColors] = useState(true);
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('auto');
  const [explainerOpen, setExplainerOpen] = useState(true);

  const sessionById = useMemo(
    () => new Map(fileSessions.map(s => [s.id, s])),
    [fileSessions],
  );

  // Global sample-color index across all sessions for cross-tab consistency
  const sampleColorByIdx = useMemo(() => {
    const map = new Map<string, string>();
    fileSessions.forEach((s, i) => {
      map.set(s.id, SAMPLE_COLORS[i % SAMPLE_COLORS.length]);
    });
    return map;
  }, [fileSessions]);

  // Per-sample summaries
  const sampleSummaries: SampleSummary[] = useMemo(() => {
    const out: SampleSummary[] = [];
    groups.forEach(group => {
      group.sessionIds.forEach(sessionId => {
        const session = sessionById.get(sessionId);
        if (!session) return;
        const values = getPropertyValues(session.data.points, selectedProperty);
        if (values.length === 0) return;
        const stats = calculateDescriptiveStats(values);
        const norm = shapiroWilkTest(values);
        let statUsed: 'Mean' | 'Median';
        if (summaryMode === 'mean') statUsed = 'Mean';
        else if (summaryMode === 'median') statUsed = 'Median';
        else statUsed = norm.isNormal ? 'Mean' : 'Median';
        const value = statUsed === 'Mean' ? stats.mean : stats.median;
        out.push({
          sessionId,
          sampleName: cleanName(session.fileName),
          groupId: group.id,
          groupName: group.name,
          groupColor: group.color,
          nPoints: values.length,
          shapiroP: norm.shapiroWilk.pValue,
          isNormal: norm.isNormal,
          statUsed,
          value,
          sampleColor: sampleColorByIdx.get(sessionId) ?? '#888',
        });
      });
    });
    return out;
  }, [groups, sessionById, selectedProperty, summaryMode, sampleColorByIdx]);

  // Per-group summaries (n = #samples in group)
  const groupSummaries: GroupSummary[] = useMemo(() => {
    return groups
      .map(group => {
        const vals = sampleSummaries
          .filter(s => s.groupId === group.id)
          .map(s => s.value);
        return {
          group,
          values: vals,
          stats: calculateDescriptiveStats(vals),
          sampleCount: vals.length,
        };
      })
      .filter(g => g.sampleCount > 0);
  }, [groups, sampleSummaries]);

  const boxPlotData = useMemo(
    () => groupSummaries.map(g => ({
      name: g.group.name,
      color: g.group.color,
      values: g.values,
      stats: g.stats,
    })),
    [groupSummaries],
  );

  const sampleColoredData: SampleColoredGroup[] | undefined = useMemo(() => {
    if (!showSampleColors) return undefined;
    return groupSummaries.map((g, idx) => ({
      groupIdx: idx,
      samples: sampleSummaries
        .filter(s => s.groupId === g.group.id)
        .map(s => ({
          name: s.sampleName,
          color: s.sampleColor,
          values: [s.value],
        })),
    }));
  }, [showSampleColors, groupSummaries, sampleSummaries]);

  const twoGroupTests = useMemo(() => {
    if (groupSummaries.length !== 2) return null;
    const [a, b] = groupSummaries;
    if (a.values.length < 2 || b.values.length < 2) return null;
    return {
      welch: welchTTest(a.values, b.values),
      mw: mannWhitneyU(a.values, b.values),
      effect: calculateEffectSize(a.values, b.values),
      a, b,
    };
  }, [groupSummaries]);

  const multiGroupTests = useMemo(() => {
    if (groupSummaries.length < 3) return null;
    const valid = groupSummaries.filter(g => g.values.length >= 2);
    if (valid.length < 3) return null;
    const arrays = valid.map(g => g.values);
    return {
      anova: oneWayANOVA(arrays),
      kw: kruskalWallis(arrays),
      tukey: tukeyHSD(valid.map(g => ({ name: g.group.name, values: g.values }))),
    };
  }, [groupSummaries]);

  const propertyLabel = PROPERTY_CONFIGS.find(c => c.key === selectedProperty)?.label || selectedProperty;
  const lowReplicate = groupSummaries.some(g => g.sampleCount < 3);

  if (groups.length === 0) {
    return (
      <div className="p-6 text-center font-mono text-sm text-muted-foreground">
        Define treatment groups in the sidebar to enable sample-level comparison.
      </div>
    );
  }

  if (groupSummaries.length < 2) {
    return (
      <div className="p-6 text-center font-mono text-sm text-muted-foreground">
        At least 2 groups with assigned samples are required for between-group comparison.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Explanation Card */}
      <Collapsible open={explainerOpen} onOpenChange={setExplainerOpen}>
        <Card className="bg-muted/30 border-border">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">
                Why this differs from pooled Group Comparison
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${explainerOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-1 space-y-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <p>
                <span className="text-foreground font-bold">Pooled (other tab):</span>{' '}
                Treats every indentation point as an independent observation.
                n = total points across all samples in the group (often thousands).
                Detects tiny effects but can be statistically misleading — multiple points from
                one sample are not independent (<em>pseudoreplication</em>).
              </p>
              <p>
                <span className="text-foreground font-bold">Sample-Level (this tab):</span>{' '}
                Each sample is collapsed to a single representative value (mean if normally
                distributed, otherwise median). The treatment group is then n = number of samples.
                This matches how most journals expect biological/experimental replicates to be
                analyzed and is more conservative.
              </p>
              <p className="pt-1 border-t border-border/50">
                <span className="text-foreground font-bold">Use pooled</span> for exploratory
                within-group spread.{' '}
                <span className="text-foreground font-bold">Use sample-level</span> for
                between-treatment claims in publications.
              </p>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Controls */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="font-mono text-xs uppercase text-muted-foreground">
              Per-sample stat
            </Label>
            <ToggleGroup
              type="single"
              value={summaryMode}
              onValueChange={(v) => v && setSummaryMode(v as SummaryMode)}
              size="sm"
            >
              <ToggleGroupItem value="auto" className="font-mono text-xs h-7 px-2">Auto</ToggleGroupItem>
              <ToggleGroupItem value="mean" className="font-mono text-xs h-7 px-2">Mean</ToggleGroupItem>
              <ToggleGroupItem value="median" className="font-mono text-xs h-7 px-2">Median</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Label className="font-mono text-xs cursor-pointer">Violin</Label>
            <Switch checked={showViolin} onCheckedChange={setShowViolin} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="font-mono text-xs cursor-pointer">Points</Label>
            <Switch checked={showJitter} onCheckedChange={setShowJitter} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="font-mono text-xs cursor-pointer">Sample Colors</Label>
            <Switch checked={showSampleColors} onCheckedChange={setShowSampleColors} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="font-mono text-xs cursor-pointer">B&W</Label>
            <Switch checked={blackAndWhite} onCheckedChange={setBlackAndWhite} />
          </div>
        </div>
      </Card>

      {/* Low replicate warning */}
      {lowReplicate && (
        <div className="flex items-center gap-2 p-3 rounded-md border border-yellow-500/40 bg-yellow-500/5">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <span className="font-mono text-[11px] text-yellow-800 dark:text-yellow-300">
            Low replicate count (n &lt; 3 in at least one group). Tests on the per-sample summaries
            have very limited power — interpret with caution.
          </span>
        </div>
      )}

      {/* Group n badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground uppercase">Replicates per group:</span>
        {groupSummaries.map(g => (
          <Badge
            key={g.group.id}
            variant={g.sampleCount < 3 ? 'destructive' : 'secondary'}
            className="font-mono text-xs"
            style={{ borderColor: g.group.color }}
          >
            <span
              className="w-2 h-2 rounded-full mr-1.5 inline-block"
              style={{ backgroundColor: g.group.color }}
            />
            {g.group.name}: n = {g.sampleCount}
          </Badge>
        ))}
      </div>

      {/* Plot */}
      <BoxViolinPlots
        data={boxPlotData}
        selectedProperty={selectedProperty}
        showViolin={showViolin}
        showJitter={showJitter}
        showPValueAsterisks
        blackAndWhite={blackAndWhite}
        xAxisLabel="Treatment Groups (n = samples)"
        sampleColoredData={sampleColoredData}
      />

      {/* Descriptive stats on per-sample summaries */}
      <StatsTable
        title={`Per-Group Descriptive Stats (on per-sample ${summaryMode === 'auto' ? 'auto-selected' : summaryMode} summaries)`}
        rows={groupSummaries.map(g => ({
          id: g.group.id,
          name: g.group.name,
          color: g.group.color,
          stats: g.stats,
          sampleCount: g.sampleCount,
        }))}
        showMinMax
        showIQR
        showSampleCount
      />

      {/* Two-group test results */}
      {twoGroupTests && (
        <Card className="p-4 space-y-3">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider">
            Two-Group Comparison ({twoGroupTests.a.group.name} vs {twoGroupTests.b.group.name})
          </h4>
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-2 rounded border border-border bg-muted/20">
              <div className="text-muted-foreground uppercase text-[10px] mb-1">Welch's t-test</div>
              <div>t = {twoGroupTests.welch.tStatistic.toFixed(3)}</div>
              <div>df = {twoGroupTests.welch.df.toFixed(2)}</div>
              <div className="flex items-center gap-2">
                p = {formatP(twoGroupTests.welch.pValue)}
                <Badge variant={twoGroupTests.welch.pValue < 0.05 ? 'default' : 'secondary'} className="text-[10px]">
                  {twoGroupTests.welch.pValue < 0.05 ? 'Significant' : 'n.s.'}
                </Badge>
              </div>
            </div>
            <div className="p-2 rounded border border-border bg-muted/20">
              <div className="text-muted-foreground uppercase text-[10px] mb-1">Mann–Whitney U</div>
              <div>U = {twoGroupTests.mw.uStatistic.toFixed(2)}</div>
              <div>z = {twoGroupTests.mw.zScore.toFixed(3)}</div>
              <div className="flex items-center gap-2">
                p = {formatP(twoGroupTests.mw.pValue)}
                <Badge variant={twoGroupTests.mw.pValue < 0.05 ? 'default' : 'secondary'} className="text-[10px]">
                  {twoGroupTests.mw.pValue < 0.05 ? 'Significant' : 'n.s.'}
                </Badge>
              </div>
            </div>
            <div className="col-span-2 p-2 rounded border border-border bg-muted/20">
              <div className="text-muted-foreground uppercase text-[10px] mb-1">Effect Size</div>
              <div>Cohen's d = {twoGroupTests.effect.cohensD.toFixed(3)} ({twoGroupTests.effect.interpretation})</div>
              <div>Hedges' g = {twoGroupTests.effect.hedgesG.toFixed(3)}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Multi-group test results */}
      {multiGroupTests && (
        <Card className="p-4 space-y-3">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider">
            Multi-Group Comparison
          </h4>
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-2 rounded border border-border bg-muted/20">
              <div className="text-muted-foreground uppercase text-[10px] mb-1">One-way ANOVA</div>
              <div>F = {multiGroupTests.anova.fStatistic.toFixed(3)}</div>
              <div>df = ({multiGroupTests.anova.dfBetween}, {multiGroupTests.anova.dfWithin})</div>
              <div className="flex items-center gap-2">
                p = {formatP(multiGroupTests.anova.pValue)}
                <Badge variant={multiGroupTests.anova.pValue < 0.05 ? 'default' : 'secondary'} className="text-[10px]">
                  {multiGroupTests.anova.pValue < 0.05 ? 'Significant' : 'n.s.'}
                </Badge>
              </div>
            </div>
            <div className="p-2 rounded border border-border bg-muted/20">
              <div className="text-muted-foreground uppercase text-[10px] mb-1">Kruskal–Wallis H</div>
              <div>H = {multiGroupTests.kw.hStatistic.toFixed(3)}</div>
              <div>df = {multiGroupTests.kw.df}</div>
              <div className="flex items-center gap-2">
                p = {formatP(multiGroupTests.kw.pValue)}
                <Badge variant={multiGroupTests.kw.pValue < 0.05 ? 'default' : 'secondary'} className="text-[10px]">
                  {multiGroupTests.kw.pValue < 0.05 ? 'Significant' : 'n.s.'}
                </Badge>
              </div>
            </div>
          </div>
          {multiGroupTests.tukey.length > 0 && (
            <div>
              <div className="text-muted-foreground uppercase text-[10px] font-mono mb-1">
                Tukey HSD post-hoc
              </div>
              <ScrollArea className="h-32 border border-border rounded">
                <div className="p-2 space-y-1">
                  {multiGroupTests.tukey.map((r, i) => (
                    <div key={i} className="flex items-center justify-between font-mono text-[11px]">
                      <span>{r.group1} vs {r.group2}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">p = {formatP(r.pValue)}</span>
                        <Badge variant={r.significant ? 'default' : 'secondary'} className="text-[10px]">
                          {r.significant ? 'Sig' : 'n.s.'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </Card>
      )}

      {/* Per-sample audit table */}
      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider">
            Per-Sample Collapse Audit
          </h4>
          <span className="font-mono text-[10px] text-muted-foreground">
            {propertyLabel} · {sampleSummaries.length} samples
          </span>
        </div>
        <ScrollArea className="h-64 border border-border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[10px] uppercase">Sample</TableHead>
                <TableHead className="font-mono text-[10px] uppercase">Group</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-right">n points</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-right">Shapiro p</TableHead>
                <TableHead className="font-mono text-[10px] uppercase">Stat used</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleSummaries.map(s => (
                <TableRow key={s.sessionId}>
                  <TableCell className="font-mono text-[10px] py-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: s.sampleColor }}
                      />
                      {s.sampleName}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] py-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: s.groupColor }}
                      />
                      {s.groupName}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] py-1 text-right tabular-nums">{s.nPoints}</TableCell>
                  <TableCell className="font-mono text-[10px] py-1 text-right tabular-nums">
                    {formatP(s.shapiroP)}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] py-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {s.statUsed}
                    </Badge>
                    {summaryMode === 'auto' && (
                      <span className="ml-1 text-muted-foreground">
                        ({s.isNormal ? 'normal' : 'non-normal'})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] py-1 text-right tabular-nums">
                    {formatVal(s.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
};
