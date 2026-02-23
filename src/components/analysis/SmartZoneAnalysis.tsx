import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { Zone } from '@/types/zones';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { getPointsInZone } from '@/utils/zoneUtils';
import { calculateDescriptiveStats, getPropertyValues, welchTTest, mannWhitneyU, calculateEffectSize, oneWayANOVA, kruskalWallis, tukeyHSD, DescriptiveStats } from '@/utils/advancedStatistics';
import { BoxViolinPlots } from './BoxViolinPlots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Layers, TrendingUp } from 'lucide-react';

interface SmartZoneAnalysisPanelProps {
  fileSessions: FileSession[];
  selectedProperty: string;
}

interface ZoneMatch {
  session: FileSession;
  zone: Zone;
  values: number[];
  stats: DescriptiveStats;
}

interface MatchedZoneGroup {
  zoneName: string;
  matches: ZoneMatch[];
  combinedValues: number[];
  combinedStats: DescriptiveStats;
}

export const SmartZoneAnalysis: React.FC<SmartZoneAnalysisPanelProps> = ({
  fileSessions,
  selectedProperty,
}) => {
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);
  const [showScatterDensity, setShowScatterDensity] = useState(false);
  const [showSmallDots, setShowSmallDots] = useState(false);

  const getPropertyLabel = (key: string): string => {
    const config = PROPERTY_CONFIGS.find(c => c.key === key);
    return config?.label || key;
  };

  // Auto-detect zones with matching names across samples
  const matchedZoneGroups = useMemo(() => {
    const zoneNameMap = new Map<string, ZoneMatch[]>();

    fileSessions.forEach(session => {
      session.zones.forEach(zone => {
        const normalizedName = zone.name.trim().toLowerCase();
        const points = getPointsInZone(session.data.points, zone);
        const values = getPropertyValues(points, selectedProperty);
        
        if (values.length === 0) return;
        
        const match: ZoneMatch = {
          session,
          zone,
          values,
          stats: calculateDescriptiveStats(values),
        };

        if (!zoneNameMap.has(normalizedName)) {
          zoneNameMap.set(normalizedName, []);
        }
        zoneNameMap.get(normalizedName)!.push(match);
      });
    });

    // Convert to array and filter for zones that appear in multiple samples
    const groups: MatchedZoneGroup[] = [];
    zoneNameMap.forEach((matches, normalizedName) => {
      // Only include if zone name appears in at least 2 different samples
      const uniqueSessions = new Set(matches.map(m => m.session.id));
      if (uniqueSessions.size >= 2) {
        const combinedValues = matches.flatMap(m => m.values);
        groups.push({
          zoneName: matches[0].zone.name, // Use original casing from first match
          matches,
          combinedValues,
          combinedStats: calculateDescriptiveStats(combinedValues),
        });
      }
    });

    // Sort by zone name
    return groups.sort((a, b) => a.zoneName.localeCompare(b.zoneName));
  }, [fileSessions, selectedProperty]);

  // Prepare box plot data for individual zone comparison (same zone across samples)
  const getPerZoneBoxPlotData = (group: MatchedZoneGroup) => {
    return group.matches.map((match, idx) => ({
      name: match.session.fileName.replace(/\.[^/.]+$/, ''),
      values: match.values,
      stats: match.stats,
      color: match.zone.color || `hsl(${(idx * 137) % 360}, 70%, 50%)`,
    }));
  };

  // Prepare box plot data for cross-zone comparison (all zone names compared)
  const crossZoneBoxPlotData = useMemo(() => {
    return matchedZoneGroups.map((group, idx) => ({
      name: group.zoneName,
      values: group.combinedValues,
      stats: group.combinedStats,
      color: group.matches[0]?.zone.color || `hsl(${(idx * 137) % 360}, 70%, 50%)`,
    }));
  }, [matchedZoneGroups]);

  // Statistical tests for cross-zone comparison
  const crossZoneTests = useMemo(() => {
    if (matchedZoneGroups.length < 2) return null;

    const allGroups = matchedZoneGroups.map(g => g.combinedValues);
    
    if (matchedZoneGroups.length === 2) {
      const [g1, g2] = allGroups;
      return {
        type: 'two-zone' as const,
        tTest: welchTTest(g1, g2),
        mannWhitney: mannWhitneyU(g1, g2),
        effectSize: calculateEffectSize(g1, g2),
      };
    }

    return {
      type: 'multi-zone' as const,
      anova: oneWayANOVA(allGroups),
      kruskalWallis: kruskalWallis(allGroups),
      tukey: tukeyHSD(matchedZoneGroups.map(g => ({ name: g.zoneName, values: g.combinedValues }))),
    };
  }, [matchedZoneGroups]);

  // Per-zone statistical tests (comparing same zone across samples)
  const perZoneTests = useMemo(() => {
    return matchedZoneGroups.map(group => {
      if (group.matches.length < 2) return { group, tests: null };

      const allValues = group.matches.map(m => m.values);
      const labels = group.matches.map(m => m.session.fileName.replace(/\.[^/.]+$/, ''));

      if (group.matches.length === 2) {
        const [g1, g2] = allValues;
        return {
          group,
          tests: {
            type: 'two-sample' as const,
            tTest: welchTTest(g1, g2),
            mannWhitney: mannWhitneyU(g1, g2),
            effectSize: calculateEffectSize(g1, g2),
          },
        };
      }

      return {
        group,
        tests: {
          type: 'multi-sample' as const,
          anova: oneWayANOVA(allValues),
          kruskalWallis: kruskalWallis(allValues),
          tukey: tukeyHSD(group.matches.map((m, idx) => ({ name: labels[idx], values: m.values }))),
        },
      };
    });
  }, [matchedZoneGroups]);

  const formatP = (p: number) => p < 0.001 ? '< 0.001' : p.toFixed(3);
  const formatValue = (v: number) => v.toFixed(2);

  if (matchedZoneGroups.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground font-mono text-sm text-center">
            No matching zone names found across samples
          </p>
          <p className="text-muted-foreground/70 font-mono text-xs text-center mt-1">
            Create zones with the same name in different samples to enable smart analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const boxPlotKey = `smart-${matchedZoneGroups.map(g => `${g.zoneName}-${g.matches.length}`).join('-')}-${selectedProperty}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Sparkles className="w-4 h-4" />
            Smart Zone Analysis
            <Badge variant="secondary" className="ml-2">
              {matchedZoneGroups.length} matching zone{matchedZoneGroups.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 mb-4">
            {matchedZoneGroups.map(group => (
              <Badge 
                key={group.zoneName} 
                variant="outline"
                style={{ borderColor: group.matches[0]?.zone.color }}
              >
                {group.zoneName} ({group.matches.length} samples)
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={showViolin} onCheckedChange={setShowViolin} />
              <Label className="font-mono text-xs">Violin</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showJitter} onCheckedChange={setShowJitter} />
              <Label className="font-mono text-xs">Points</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showScatterDensity} onCheckedChange={setShowScatterDensity} />
              <Label className="font-mono text-xs">Scatter Density</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showSmallDots} onCheckedChange={setShowSmallDots} />
              <Label className="font-mono text-xs">Small Dots</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cross-zone" className="w-full">
        <TabsList className="bg-secondary w-full justify-start">
          <TabsTrigger value="cross-zone" className="font-mono text-xs gap-1">
            <Layers className="w-3 h-3" />
            Cross-Zone Comparison
          </TabsTrigger>
          <TabsTrigger value="per-zone" className="font-mono text-xs gap-1">
            <TrendingUp className="w-3 h-3" />
            Per-Zone Analysis
          </TabsTrigger>
        </TabsList>

        {/* Cross-Zone Comparison Tab */}
        <TabsContent value="cross-zone" className="mt-4 space-y-4">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm">
                Compare All Zone Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground font-mono text-xs mb-4">
                Each box represents combined data from all samples for that zone name
              </p>
              <BoxViolinPlots
                key={`cross-${boxPlotKey}`}
                data={crossZoneBoxPlotData}
                selectedProperty={selectedProperty}
                showViolin={showViolin}
                showJitter={showJitter}
                blendOverlap={showScatterDensity}
                smallDots={showSmallDots}
              />
            </CardContent>
          </Card>

          {/* Cross-Zone Statistics Table */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm">Combined Statistics by Zone Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">Zone</TableHead>
                    <TableHead className="font-mono text-xs text-right">Samples</TableHead>
                    <TableHead className="font-mono text-xs text-right">N</TableHead>
                    <TableHead className="font-mono text-xs text-right">Mean</TableHead>
                    <TableHead className="font-mono text-xs text-right">SD</TableHead>
                    <TableHead className="font-mono text-xs text-right">Median</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedZoneGroups.map(group => (
                    <TableRow key={group.zoneName}>
                      <TableCell className="font-mono text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: group.matches[0]?.zone.color }}
                          />
                          {group.zoneName}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right">{group.matches.length}</TableCell>
                      <TableCell className="font-mono text-xs text-right">{group.combinedStats.n}</TableCell>
                      <TableCell className="font-mono text-xs text-right">{formatValue(group.combinedStats.mean)}</TableCell>
                      <TableCell className="font-mono text-xs text-right">{formatValue(group.combinedStats.sd)}</TableCell>
                      <TableCell className="font-mono text-xs text-right">{formatValue(group.combinedStats.median)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Cross-Zone Statistical Tests */}
          {crossZoneTests && (
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-sm">Statistical Tests (Zone vs Zone)</CardTitle>
              </CardHeader>
              <CardContent>
                {crossZoneTests.type === 'two-zone' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-mono text-xs text-muted-foreground mb-1">Welch's t-test</p>
                        <p className="font-mono text-sm">t = {formatValue(crossZoneTests.tTest.statistic)}</p>
                        <p className="font-mono text-xs text-muted-foreground">p = {formatP(crossZoneTests.tTest.pValue)}</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-mono text-xs text-muted-foreground mb-1">Mann-Whitney U</p>
                        <p className="font-mono text-sm">U = {formatValue(crossZoneTests.mannWhitney.uStatistic)}</p>
                        <p className="font-mono text-xs text-muted-foreground">p = {formatP(crossZoneTests.mannWhitney.pValue)}</p>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="font-mono text-xs text-muted-foreground mb-1">Effect Size (Cohen's d)</p>
                      <p className="font-mono text-sm">d = {formatValue(crossZoneTests.effectSize.cohensD)} ({crossZoneTests.effectSize.interpretation})</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-mono text-xs text-muted-foreground mb-1">One-way ANOVA</p>
                        <p className="font-mono text-sm">F = {formatValue(crossZoneTests.anova.fStatistic)}</p>
                        <p className="font-mono text-xs text-muted-foreground">p = {formatP(crossZoneTests.anova.pValue)}</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-mono text-xs text-muted-foreground mb-1">Kruskal-Wallis</p>
                        <p className="font-mono text-sm">H = {formatValue(crossZoneTests.kruskalWallis.hStatistic)}</p>
                        <p className="font-mono text-xs text-muted-foreground">p = {formatP(crossZoneTests.kruskalWallis.pValue)}</p>
                      </div>
                    </div>
                    {crossZoneTests.tukey.length > 0 && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-mono text-xs text-muted-foreground mb-2">Tukey's HSD Post-hoc</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {crossZoneTests.tukey.map((result, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs font-mono">
                              <span>{result.group1} vs {result.group2}</span>
                              <span className={result.isSignificant ? 'text-destructive' : 'text-muted-foreground'}>
                                p = {formatP(result.pValue)} {result.isSignificant ? '*' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Per-Zone Analysis Tab */}
        <TabsContent value="per-zone" className="mt-4 space-y-6">
          {matchedZoneGroups.map((group, groupIdx) => {
            const zoneTests = perZoneTests.find(pt => pt.group.zoneName === group.zoneName);
            return (
              <Card key={group.zoneName} className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: group.matches[0]?.zone.color }}
                    />
                    {group.zoneName}
                    <Badge variant="outline" className="ml-2">
                      {group.matches.length} samples
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground font-mono text-xs">
                    Comparing "{group.zoneName}" across: {group.matches.map(m => m.session.fileName.replace(/\.[^/.]+$/, '')).join(', ')}
                  </p>
                  
                  <BoxViolinPlots
                    key={`perzone-${groupIdx}-${boxPlotKey}`}
                    data={getPerZoneBoxPlotData(group)}
                    selectedProperty={selectedProperty}
                    showViolin={showViolin}
                    showJitter={showJitter}
                    blendOverlap={showScatterDensity}
                    smallDots={showSmallDots}
                  />

                  {/* Per-sample statistics */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-mono text-xs">Sample</TableHead>
                        <TableHead className="font-mono text-xs text-right">N</TableHead>
                        <TableHead className="font-mono text-xs text-right">Mean</TableHead>
                        <TableHead className="font-mono text-xs text-right">SD</TableHead>
                        <TableHead className="font-mono text-xs text-right">Median</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.matches.map(match => (
                        <TableRow key={`${match.session.id}-${match.zone.id}`}>
                          <TableCell className="font-mono text-xs">
                            {match.session.fileName.replace(/\.[^/.]+$/, '')}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-right">{match.stats.n}</TableCell>
                          <TableCell className="font-mono text-xs text-right">{formatValue(match.stats.mean)}</TableCell>
                          <TableCell className="font-mono text-xs text-right">{formatValue(match.stats.sd)}</TableCell>
                          <TableCell className="font-mono text-xs text-right">{formatValue(match.stats.median)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Statistical tests for this zone */}
                  {zoneTests?.tests && (
                    <div className="pt-3 border-t border-border">
                      <p className="font-mono text-xs font-medium mb-2">Statistical Tests</p>
                      {zoneTests.tests.type === 'two-sample' ? (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="font-mono text-xs text-muted-foreground">t-test</p>
                            <p className="font-mono text-xs">p = {formatP(zoneTests.tests.tTest.pValue)}</p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="font-mono text-xs text-muted-foreground">Mann-Whitney</p>
                            <p className="font-mono text-xs">p = {formatP(zoneTests.tests.mannWhitney.pValue)}</p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="font-mono text-xs text-muted-foreground">Cohen's d</p>
                            <p className="font-mono text-xs">{formatValue(zoneTests.tests.effectSize.cohensD)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-2 bg-muted/30 rounded">
                              <p className="font-mono text-xs text-muted-foreground">ANOVA</p>
                              <p className="font-mono text-xs">F = {formatValue(zoneTests.tests.anova.fStatistic)}, p = {formatP(zoneTests.tests.anova.pValue)}</p>
                            </div>
                            <div className="p-2 bg-muted/30 rounded">
                              <p className="font-mono text-xs text-muted-foreground">Kruskal-Wallis</p>
                              <p className="font-mono text-xs">H = {formatValue(zoneTests.tests.kruskalWallis.hStatistic)}, p = {formatP(zoneTests.tests.kruskalWallis.pValue)}</p>
                            </div>
                          </div>
                          {zoneTests.tests.tukey.length > 0 && (
                            <div className="p-2 bg-muted/30 rounded">
                              <p className="font-mono text-xs text-muted-foreground mb-1">Tukey HSD</p>
                              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                                {zoneTests.tests.tukey.map((result, idx) => (
                                  <div key={idx} className="flex justify-between text-xs font-mono">
                                    <span className="truncate">{result.group1} vs {result.group2}</span>
                                    <span className={result.isSignificant ? 'text-destructive' : ''}>
                                      {formatP(result.pValue)}{result.isSignificant ? '*' : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};
