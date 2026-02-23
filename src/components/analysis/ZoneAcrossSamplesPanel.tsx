import React, { useEffect, useMemo, useState } from 'react';
import { FileSession } from '@/types/fileSession';
import { Zone } from '@/types/zones';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BoxViolinPlots } from './BoxViolinPlots';
import { Plus, X, GitCompare, AlertCircle, CheckCircle, XCircle, ListPlus } from 'lucide-react';
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
  label: string;
}

export const ZoneAcrossSamplesPanel: React.FC<ZoneAcrossSamplesPanelProps> = ({
  fileSessions,
  selectedProperty,
}) => {
  const [selectedZones, setSelectedZones] = useState<ZoneSelection[]>([]);
  const [showViolin, setShowViolin] = useState(false);
  const [showJitter, setShowJitter] = useState(true);
  const [showScatterDensity, setShowScatterDensity] = useState(false);
  const [showSmallDots, setShowSmallDots] = useState(false);
  
  const sessionsWithZones = useMemo(() => {
    return fileSessions.filter(s => s.zones.length > 0);
  }, [fileSessions]);

  // Clean up invalid zone selections when fileSessions change
  useEffect(() => {
    setSelectedZones(prev => 
      prev.filter(sel => {
        const session = fileSessions.find(s => s.id === sel.sessionId);
        return session?.zones.some(z => z.id === sel.zoneId);
      })
    );
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

  const addAllZones = () => {
    const allZoneSelections: ZoneSelection[] = [];
    sessionsWithZones.forEach(session => {
      session.zones.forEach(zone => {
        const exists = selectedZones.some(
          sel => sel.sessionId === session.id && sel.zoneId === zone.id
        );
        if (!exists) {
          allZoneSelections.push({ sessionId: session.id, zoneId: zone.id });
        }
      });
    });
    setSelectedZones([...selectedZones, ...allZoneSelections]);
  };

  // Key for forcing BoxViolinPlots re-render when selections change
  const boxPlotKey = useMemo(() => {
    return selectedZones.map(s => `${s.sessionId}-${s.zoneId}`).join('|');
  }, [selectedZones]);

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
          return { sessionId: value, zoneId: firstZone?.id || '' };
        }
        return { ...sel, [field]: value };
      })
    );
  };

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
        const label = `${session.fileName.replace(/\.[^/.]+$/, '')}/${zone.name}`;
        return { session, zone, values, stats: calculateDescriptiveStats(values), colorIndex, label };
      })
      .filter((d): d is ZoneComparisonData => d !== null && d.values.length > 0);
  }, [fileSessions, selectedZones, selectedProperty]);

  // Prepare data for BoxViolinPlots
  const boxPlotData = useMemo(() => {
    return zoneData.map(d => ({
      name: d.label.length > 15 ? d.label.slice(0, 12) + '...' : d.label,
      color: d.zone.color,
      values: d.values,
      stats: d.stats,
    }));
  }, [zoneData]);

  const twoZoneTests = useMemo(() => {
    if (zoneData.length !== 2) return null;
    const [z1, z2] = zoneData;
    return {
      welch: welchTTest(z1.values, z2.values),
      mannWhitney: mannWhitneyU(z1.values, z2.values),
      effectSize: calculateEffectSize(z1.values, z2.values),
    };
  }, [zoneData]);

  const multiZoneTests = useMemo(() => {
    if (zoneData.length < 2) return null;
    const valueArrays = zoneData.map(z => z.values);
    const namedGroups = zoneData.map(z => ({ name: z.label, values: z.values }));
    return {
      anova: oneWayANOVA(valueArrays),
      kruskalWallis: kruskalWallis(valueArrays),
      postHoc: zoneData.length > 2 ? tukeyHSD(namedGroups) : null,
    };
  }, [zoneData]);

  const formatP = (p: number): string => (p < 0.001 ? '<0.001' : p.toFixed(3));
  const formatValue = (val: number): string => {
    if (Math.abs(val) >= 1000) return val.toFixed(1);
    if (Math.abs(val) < 0.01) return val.toExponential(2);
    return val.toFixed(3);
  };
  const getPropertyLabel = (key: string): string => PROPERTY_CONFIGS.find(c => c.key === key)?.label || key;

  if (sessionsWithZones.length === 0) {
    return (
      <div className="border border-border rounded p-4 text-center">
        <GitCompare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground font-mono text-xs">No zones available</p>
        <p className="text-muted-foreground/70 font-mono text-[10px]">Create zones in your samples first</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Zone Selection */}
      <div className="border border-border rounded p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs font-bold uppercase">Select Zones</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={addAllZones} className="h-6 px-2 text-xs gap-1">
              <ListPlus className="w-3 h-3" /> Add All
            </Button>
            <Button size="sm" variant="outline" onClick={addZoneSelection} className="h-6 px-2 text-xs gap-1">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        </div>

        {selectedZones.length === 0 ? (
          <p className="text-muted-foreground font-mono text-[10px] text-center py-2">
            Click "Add" to select zones for comparison
          </p>
        ) : (
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {selectedZones.map((sel, idx) => {
                const session = fileSessions.find(s => s.id === sel.sessionId);
                const zones = session?.zones || [];
                const colorIndex = fileSessions.findIndex(s => s.id === sel.sessionId);
                const isValid = zones.some(z => z.id === sel.zoneId);

                return (
                  <div key={idx} className={`flex items-center gap-1 p-1 rounded text-xs ${!isValid ? 'bg-destructive/10' : 'bg-muted/30'}`}>
                    <div className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: getSampleColor(colorIndex) }} />
                    <Select value={sel.sessionId} onValueChange={v => updateZoneSelection(idx, 'sessionId', v)}>
                      <SelectTrigger className="h-6 w-24 text-[10px] font-mono px-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionsWithZones.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-[10px] font-mono">
                            {s.fileName.replace(/\.[^/.]+$/, '')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">/</span>
                    <Select value={sel.zoneId} onValueChange={v => updateZoneSelection(idx, 'zoneId', v)}>
                      <SelectTrigger className="h-6 w-20 text-[10px] font-mono px-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map(z => (
                          <SelectItem key={z.id} value={z.id} className="text-[10px] font-mono">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded" style={{ backgroundColor: z.color }} />
                              {z.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isValid && <AlertCircle className="w-3 h-3 text-destructive" />}
                    <Button variant="ghost" size="sm" onClick={() => removeZoneSelection(idx)} className="h-5 w-5 p-0 ml-auto">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Plot Options & BoxPlot */}
      {zoneData.length > 0 && (
        <>
          <div className="flex items-center gap-4 p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2">
              <Label className="font-mono text-[10px]">Violin</Label>
              <Switch checked={showViolin} onCheckedChange={setShowViolin} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="font-mono text-[10px]">Points</Label>
              <Switch checked={showJitter} onCheckedChange={setShowJitter} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="font-mono text-[10px]">Scatter Density</Label>
              <Switch checked={showScatterDensity} onCheckedChange={setShowScatterDensity} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="font-mono text-[10px]">Small Dots</Label>
              <Switch checked={showSmallDots} onCheckedChange={setShowSmallDots} />
            </div>
          </div>

          <BoxViolinPlots
            key={boxPlotKey}
            data={boxPlotData}
            selectedProperty={selectedProperty}
            showViolin={showViolin}
            showJitter={showJitter}
            blendOverlap={showScatterDensity}
            smallDots={showSmallDots}
            xAxisLabel="Zones (across Samples)"
          />
        </>
      )}

      {/* Zone Statistics Table */}
      {zoneData.length > 0 && (
        <div className="border border-border rounded p-2">
          <h4 className="font-mono text-xs font-bold uppercase mb-2">
            Statistics ({getPropertyLabel(selectedProperty)})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-1">Zone</th>
                  <th className="text-right p-1">N</th>
                  <th className="text-right p-1">Mean</th>
                  <th className="text-right p-1">SD</th>
                  <th className="text-right p-1">Med</th>
                </tr>
              </thead>
              <tbody>
                {zoneData.map((d, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="p-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: d.zone.color }} />
                        <span className="truncate max-w-[100px]">{d.label}</span>
                      </div>
                    </td>
                    <td className="text-right p-1">{d.stats.n}</td>
                    <td className="text-right p-1">{formatValue(d.stats.mean)}</td>
                    <td className="text-right p-1">{formatValue(d.stats.sd)}</td>
                    <td className="text-right p-1">{formatValue(d.stats.median)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two-Zone Tests */}
      {twoZoneTests && (
        <div className="border border-border rounded p-2 space-y-2">
          <h4 className="font-mono text-xs font-bold uppercase">Two-Zone Comparison</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">Welch's t</span>
                <Badge variant={twoZoneTests.welch.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {twoZoneTests.welch.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                p = {formatP(twoZoneTests.welch.pValue)}
              </div>
            </div>
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">Mann-Whitney</span>
                <Badge variant={twoZoneTests.mannWhitney.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {twoZoneTests.mannWhitney.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                p = {formatP(twoZoneTests.mannWhitney.pValue)}
              </div>
            </div>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <span className="font-mono text-[10px] font-bold">Effect: </span>
            <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize ml-1">
              {twoZoneTests.effectSize.interpretation}
            </Badge>
            <span className="text-[10px] font-mono text-muted-foreground ml-2">
              d={twoZoneTests.effectSize.cohensD.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Multi-Zone Tests */}
      {multiZoneTests && zoneData.length > 2 && (
        <div className="border border-border rounded p-2 space-y-2">
          <h4 className="font-mono text-xs font-bold uppercase">Multi-Zone ({zoneData.length})</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">ANOVA</span>
                <Badge variant={multiZoneTests.anova.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {multiZoneTests.anova.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                F={multiZoneTests.anova.fStatistic.toFixed(2)}, p={formatP(multiZoneTests.anova.pValue)}
              </div>
            </div>
            <div className="p-2 bg-muted/30 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold">Kruskal-W</span>
                <Badge variant={multiZoneTests.kruskalWallis.isSignificant ? "default" : "secondary"} className="text-[9px] h-4 px-1">
                  {multiZoneTests.kruskalWallis.isSignificant ? 'Sig' : 'NS'}
                </Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                H={multiZoneTests.kruskalWallis.hStatistic.toFixed(2)}, p={formatP(multiZoneTests.kruskalWallis.pValue)}
              </div>
            </div>
          </div>
          {multiZoneTests.postHoc && multiZoneTests.postHoc.length > 0 && (
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold">Post-hoc (Tukey)</span>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {multiZoneTests.postHoc.map((ph, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1 bg-muted/20 rounded text-[10px] font-mono">
                      <span className="truncate max-w-[120px]">{ph.group1} vs {ph.group2}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">p={formatP(ph.pValue)}</span>
                        {ph.isSignificant ? <CheckCircle className="w-3 h-3 text-primary" /> : <XCircle className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
