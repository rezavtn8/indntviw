import React, { useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { Zone } from '@/types/zones';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { 
  calculateDescriptiveStats, 
  getPropertyValues,
  welchTTest,
  mannWhitneyU,
  calculateEffectSize,
  DescriptiveStats,
} from '@/utils/advancedStatistics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, GitCompare } from 'lucide-react';
import { getSampleColor } from './SampleSelector';

interface ZoneSelection {
  sessionId: string;
  zoneId: string;
}

interface ZoneAcrossSamplesPanelProps {
  fileSessions: FileSession[];
  selectedProperty: string;
}

interface ZoneComparisonData {
  session: FileSession;
  zone: Zone;
  values: number[];
  stats: DescriptiveStats;
  colorIndex: number;
}

export const ZoneAcrossSamplesPanel: React.FC<ZoneAcrossSamplesPanelProps> = ({
  fileSessions,
  selectedProperty,
}) => {
  const [selectedZones, setSelectedZones] = useState<ZoneSelection[]>([]);
  
  // Get all sessions that have zones
  const sessionsWithZones = useMemo(() => {
    return fileSessions.filter(s => s.zones.length > 0);
  }, [fileSessions]);

  const addZoneSelection = () => {
    if (sessionsWithZones.length === 0) return;
    const firstSession = sessionsWithZones[0];
    if (firstSession.zones.length === 0) return;
    
    setSelectedZones([
      ...selectedZones,
      { sessionId: firstSession.id, zoneId: firstSession.zones[0].id },
    ]);
  };

  const removeZoneSelection = (index: number) => {
    setSelectedZones(selectedZones.filter((_, i) => i !== index));
  };

  const updateZoneSelection = (index: number, field: 'sessionId' | 'zoneId', value: string) => {
    setSelectedZones(
      selectedZones.map((sel, i) => {
        if (i !== index) return sel;
        
        if (field === 'sessionId') {
          const session = fileSessions.find(s => s.id === value);
          const firstZone = session?.zones[0];
          return {
            sessionId: value,
            zoneId: firstZone?.id || '',
          };
        }
        return { ...sel, [field]: value };
      })
    );
  };

  // Prepare zone data for comparison
  const zoneData = useMemo((): ZoneComparisonData[] => {
    return selectedZones
      .map(sel => {
        const session = fileSessions.find(s => s.id === sel.sessionId);
        if (!session) return null;
        
        const zone = session.zones.find(z => z.id === sel.zoneId);
        if (!zone) return null;

        const zonePoints = session.data.points.filter(p => zone.memberPointIds.includes(p.id));
        const values = getPropertyValues(zonePoints, selectedProperty);
        const colorIndex = fileSessions.findIndex(s => s.id === sel.sessionId);

        return {
          session,
          zone,
          values,
          stats: calculateDescriptiveStats(values),
          colorIndex,
        };
      })
      .filter((d): d is ZoneComparisonData => d !== null && d.values.length > 0);
  }, [fileSessions, selectedZones, selectedProperty]);

  // Statistical comparison between zones
  const comparison = useMemo(() => {
    if (zoneData.length !== 2) return null;
    
    const [z1, z2] = zoneData;
    return {
      welch: welchTTest(z1.values, z2.values),
      mannWhitney: mannWhitneyU(z1.values, z2.values),
      effectSize: calculateEffectSize(z1.values, z2.values),
    };
  }, [zoneData]);

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

  if (sessionsWithZones.length === 0) {
    return (
      <div className="border-2 border-border rounded-lg p-6 text-center">
        <GitCompare className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground font-mono text-sm mb-2">
          No zones available for comparison
        </p>
        <p className="text-muted-foreground/70 font-mono text-xs">
          Create zones in your samples using the Zone tab, then return here to compare them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
            Zone-to-Zone Comparison
          </h4>
          <Button
            size="sm"
            onClick={addZoneSelection}
            disabled={selectedZones.length >= 4}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Zone
          </Button>
        </div>

        {selectedZones.length === 0 ? (
          <p className="text-muted-foreground font-mono text-sm text-center py-4">
            Click "Add Zone" to select zones from different samples for comparison.
          </p>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="space-y-2 pr-2">
              {selectedZones.map((sel, idx) => {
                const session = fileSessions.find(s => s.id === sel.sessionId);
                const zones = session?.zones || [];
                const colorIndex = fileSessions.findIndex(s => s.id === sel.sessionId);

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg"
                  >
                    <div
                      className="w-3 h-3 rounded flex-shrink-0"
                      style={{ backgroundColor: getSampleColor(colorIndex) }}
                    />
                    <Select
                      value={sel.sessionId}
                      onValueChange={v => updateZoneSelection(idx, 'sessionId', v)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionsWithZones.map((s, i) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs font-mono">
                            {s.fileName.replace(/\.[^/.]+$/, '')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">/</span>
                    <Select
                      value={sel.zoneId}
                      onValueChange={v => updateZoneSelection(idx, 'zoneId', v)}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map(z => (
                          <SelectItem key={z.id} value={z.id} className="text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded"
                                style={{ backgroundColor: z.color }}
                              />
                              {z.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeZoneSelection(idx)}
                      className="h-6 w-6 p-0 ml-auto"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Zone Statistics */}
      {zoneData.length > 0 && (
        <div className="border-2 border-border rounded-lg p-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
            Zone Statistics ({getPropertyLabel(selectedProperty)})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-muted-foreground text-xs uppercase">Zone</th>
                  <th className="text-right p-2 text-muted-foreground text-xs uppercase">N</th>
                  <th className="text-right p-2 text-muted-foreground text-xs uppercase">Mean</th>
                  <th className="text-right p-2 text-muted-foreground text-xs uppercase">SD</th>
                  <th className="text-right p-2 text-muted-foreground text-xs uppercase">Median</th>
                  <th className="text-right p-2 text-muted-foreground text-xs uppercase">Min</th>
                  <th className="text-right p-2 text-muted-foreground text-xs uppercase">Max</th>
                </tr>
              </thead>
              <tbody>
                {zoneData.map((d, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: d.zone.color }}
                        />
                        <span className="truncate max-w-[120px]">
                          {d.session.fileName.replace(/\.[^/.]+$/, '')} / {d.zone.name}
                        </span>
                      </div>
                    </td>
                    <td className="text-right p-2">{d.stats.n}</td>
                    <td className="text-right p-2">{formatValue(d.stats.mean)}</td>
                    <td className="text-right p-2">{formatValue(d.stats.sd)}</td>
                    <td className="text-right p-2">{formatValue(d.stats.median)}</td>
                    <td className="text-right p-2">{formatValue(d.stats.min)}</td>
                    <td className="text-right p-2">{formatValue(d.stats.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statistical Comparison (2 zones) */}
      {comparison && zoneData.length === 2 && (
        <div className="border-2 border-border rounded-lg p-4">
          <h4 className="font-mono text-sm font-bold uppercase tracking-wider mb-4">
            Statistical Comparison
          </h4>
          <div className="mb-3 p-2 bg-muted/30 rounded">
            <span className="text-sm font-mono">
              <span className="font-bold">{zoneData[0].session.fileName.replace(/\.[^/.]+$/, '')}/{zoneData[0].zone.name}</span>
              {' vs '}
              <span className="font-bold">{zoneData[1].session.fileName.replace(/\.[^/.]+$/, '')}/{zoneData[1].zone.name}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Welch's t-test */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Welch's t-test</span>
                {comparison.welch.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">t-statistic:</span>
                <span>{comparison.welch.statistic.toFixed(3)}</span>
                <span className="text-muted-foreground">df:</span>
                <span>{comparison.welch.df.toFixed(1)}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={comparison.welch.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(comparison.welch.pValue)}
                </span>
                <span className="text-muted-foreground">Mean diff:</span>
                <span>{comparison.welch.meanDiff.toFixed(4)}</span>
              </div>
            </div>

            {/* Mann-Whitney U */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold">Mann-Whitney U</span>
                {comparison.mannWhitney.isSignificant ? (
                  <Badge className="bg-primary text-primary-foreground text-xs">Significant</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not significant</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-muted-foreground">U-statistic:</span>
                <span>{comparison.mannWhitney.uStatistic.toFixed(1)}</span>
                <span className="text-muted-foreground">Z-score:</span>
                <span>{comparison.mannWhitney.zScore.toFixed(3)}</span>
                <span className="text-muted-foreground">p-value:</span>
                <span className={comparison.mannWhitney.isSignificant ? 'text-primary font-bold' : ''}>
                  {formatP(comparison.mannWhitney.pValue)}
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
                <span className="text-lg font-bold">{comparison.effectSize.cohensD.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Hedges' g:</span>
                <span className="text-lg font-bold">{comparison.effectSize.hedgesG.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Interpretation:</span>
                <Badge variant="outline" className="text-xs capitalize mt-1">
                  {comparison.effectSize.interpretation}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {zoneData.length > 2 && (
        <div className="border-2 border-border rounded-lg p-4 text-center">
          <p className="text-muted-foreground font-mono text-sm">
            Select exactly 2 zones for detailed statistical comparison.
          </p>
        </div>
      )}
    </div>
  );
};
