import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { FileSession } from '@/types/fileSession';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { BoxViolinPlots } from './BoxViolinPlots';
import { DistributionPlots } from './DistributionPlots';
import { CrossSamplePlots } from './CrossSamplePlots';
import { ChartCapture, captureChartElement, BatchExportOptions } from '@/utils/batchExportUtils';
import { calculateDescriptiveStats, getPropertyValues } from '@/utils/advancedStatistics';
import { getSampleColor } from './SampleSelector';

interface TreatmentGroup {
  id: string;
  name: string;
  color: string;
  sessionIds: string[];
}

interface ComprehensiveBatchRendererProps {
  fileSessions: FileSession[];
  selectedProperty: string;
  groups: TreatmentGroup[];
  options: BatchExportOptions;
}

export interface ComprehensiveBatchRendererRef {
  captureAll: (onProgress: (current: number, total: number, message: string) => void) => Promise<ChartCapture[]>;
}

export const ComprehensiveBatchRenderer = forwardRef<ComprehensiveBatchRendererRef, ComprehensiveBatchRendererProps>(
  ({ fileSessions, selectedProperty, groups, options }, ref) => {
    const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const getPropertyUnit = (key: string): string => {
      const config = PROPERTY_CONFIGS.find(c => c.key === key);
      return config?.unit || '';
    };

    const getPropertyLabel = (key: string): string => {
      const config = PROPERTY_CONFIGS.find(c => c.key === key);
      return config?.label || key;
    };

    const propertyLabel = getPropertyLabel(selectedProperty);
    const propertyUnit = getPropertyUnit(selectedProperty);

    // Calculate sample data for cross-sample plots
    const sampleData = useMemo(() => {
      return fileSessions
        .filter(session => session.data)
        .map((session) => {
          const colorIndex = fileSessions.findIndex(s => s.id === session.id);
          const values = getPropertyValues(session.data.points, selectedProperty);
          const stats = calculateDescriptiveStats(values);
          return {
            id: session.id,
            name: session.fileName.replace(/\.[^/.]+$/, ''),
            colorIndex,
            values,
            stats
          };
        })
        .filter(d => d.values.length > 0);
    }, [fileSessions, selectedProperty]);

    // Calculate per-sample zone data (ALL zones within each sample)
    const perSampleZoneData = useMemo(() => {
      return fileSessions
        .filter(session => session.data && session.zones.length > 0)
        .map((session) => {
          const zoneData = session.zones.map(zone => {
            const values = session.data.points
              .filter(p => zone.memberPointIds.includes(p.id))
              .map(p => {
                const val = p[selectedProperty as keyof typeof p] ?? p.properties[selectedProperty];
                return typeof val === 'number' ? val : NaN;
              })
              .filter(v => !isNaN(v));
            
            const stats = calculateDescriptiveStats(values);
            return {
              name: zone.name,
              color: zone.color,
              values,
              stats
            };
          }).filter(z => z.values.length > 0);

          // Add "All Data" for comparison
          const allValues = getPropertyValues(session.data.points, selectedProperty);
          
          return {
            sessionId: session.id,
            sessionName: session.fileName.replace(/\.[^/.]+$/, ''),
            data: [
              { name: 'All Data', color: '#888888', values: allValues, stats: calculateDescriptiveStats(allValues) },
              ...zoneData
            ]
          };
        })
        .filter(s => s.data.length > 1);
    }, [fileSessions, selectedProperty]);

    // Calculate POOLED zone data (same-named zones combined from all samples)
    const pooledZoneData = useMemo(() => {
      const zoneNameMap = new Map<string, { name: string; color: string; values: number[] }>();
      
      for (const session of fileSessions) {
        if (!session.data) continue;
        
        for (const zone of session.zones) {
          const values = session.data.points
            .filter(p => zone.memberPointIds.includes(p.id))
            .map(p => {
              const val = p[selectedProperty as keyof typeof p] ?? p.properties[selectedProperty];
              return typeof val === 'number' ? val : NaN;
            })
            .filter(v => !isNaN(v));
          
          if (values.length === 0) continue;
          
          const existing = zoneNameMap.get(zone.name);
          if (existing) {
            existing.values.push(...values);
          } else {
            zoneNameMap.set(zone.name, { name: zone.name, color: zone.color, values: [...values] });
          }
        }
      }
      
      // Return all zones that have data (regardless of how many samples they appear in)
      return Array.from(zoneNameMap.values())
        .filter(z => z.values.length > 0)
        .map(z => ({
          ...z,
          stats: calculateDescriptiveStats(z.values)
        }));
    }, [fileSessions, selectedProperty]);

    // Calculate smart zone data (same-named zones across samples - for per-zone-across-samples view)
    const smartZoneData = useMemo(() => {
      const zoneNameMap = new Map<string, { sessionId: string; sessionName: string; zone: typeof fileSessions[0]['zones'][0]; values: number[] }[]>();
      
      for (const session of fileSessions) {
        if (!session.data) continue;
        
        for (const zone of session.zones) {
          const values = session.data.points
            .filter(p => zone.memberPointIds.includes(p.id))
            .map(p => {
              const val = p[selectedProperty as keyof typeof p] ?? p.properties[selectedProperty];
              return typeof val === 'number' ? val : NaN;
            })
            .filter(v => !isNaN(v));
          
          if (values.length === 0) continue;
          
          const existing = zoneNameMap.get(zone.name) || [];
          existing.push({ 
            sessionId: session.id, 
            sessionName: session.fileName.replace(/\.[^/.]+$/, ''), 
            zone, 
            values 
          });
          zoneNameMap.set(zone.name, existing);
        }
      }
      
      // Only keep zones that appear in multiple samples
      const multiSampleZones = new Map<string, typeof zoneNameMap extends Map<string, infer V> ? V : never>();
      for (const [zoneName, entries] of zoneNameMap) {
        if (entries.length >= 2) {
          multiSampleZones.set(zoneName, entries);
        }
      }
      
      return multiSampleZones;
    }, [fileSessions, selectedProperty]);

    // Group data for treatment groups
    const groupData = useMemo(() => {
      if (groups.length < 2) return [];
      
      return groups.map(group => {
        const groupSessions = fileSessions.filter(s => group.sessionIds.includes(s.id));
        const allValues: number[] = [];
        
        for (const session of groupSessions) {
          if (!session.data) continue;
          const values = getPropertyValues(session.data.points, selectedProperty);
          allValues.push(...values);
        }
        
        return {
          name: group.name,
          color: group.color,
          values: allValues,
          stats: calculateDescriptiveStats(allValues)
        };
      }).filter(g => g.values.length > 0);
    }, [fileSessions, groups, selectedProperty]);

    const setChartRef = (id: string, element: HTMLDivElement | null) => {
      if (element) {
        chartRefs.current.set(id, element);
      } else {
        chartRefs.current.delete(id);
      }
    };

    useImperativeHandle(ref, () => ({
      captureAll: async (onProgress) => {
        const captures: ChartCapture[] = [];
        const allRefs = Array.from(chartRefs.current.entries());
        const total = allRefs.length;
        let current = 0;

        for (const [id, element] of allRefs) {
          current++;
          const [category, ...rest] = id.split('__');
          onProgress(current, total, `Capturing ${rest.join(' - ')}...`);

          try {
            const { dataUrl, width, height } = await captureChartElement(element, options.quality);
            
            const capture: ChartCapture = {
              id,
              category: category as ChartCapture['category'],
              subcategory: rest[rest.length - 1] || 'chart',
              dataUrl,
              width,
              height
            };

            // Extract sample/zone names from ID
            if (category === 'per_sample') {
              capture.sampleName = rest[0];
              capture.subcategory = rest[1] || 'chart';
            } else if (category === 'smart_zones' || category === 'pooled_zones') {
              capture.zoneName = rest[0];
              capture.subcategory = rest[1] || 'chart';
            }

            captures.push(capture);
          } catch (error) {
            console.error(`Failed to capture ${id}:`, error);
          }
        }

        return captures;
      }
    }));

    const { includeSections } = options;

    // Dynamic chart wrapper - inline-block ensures proper sizing for html2canvas
    const chartWrapperStyle: React.CSSProperties = {
      fontFamily: 'Arial, Helvetica, sans-serif',
      backgroundColor: '#ffffff',
      padding: '24px',
      display: 'inline-block',
      minWidth: '600px'
    };

    const chartTitleStyle: React.CSSProperties = {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '8px',
      color: '#1a1a1a'
    };

    const chartSubtitleStyle: React.CSSProperties = {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#666666',
      marginBottom: '16px'
    };

    return (
      <div 
        className="fixed left-0 top-0 pointer-events-none" 
        style={{ 
          fontFamily: 'Arial, Helvetica, sans-serif',
          opacity: 0,
          zIndex: -1,
          width: 'max-content',
          overflow: 'visible'
        }}
      >
        {/* ===== SECTION 1: Per-Sample Distribution Charts ===== */}
        {includeSections.perSample && includeSections.perSampleDistribution && 
          sampleData.map(sample => (
            <div
              key={`per_sample__${sample.name}__distribution`}
              ref={el => setChartRef(`per_sample__${sample.name}__distribution`, el)}
              style={chartWrapperStyle}
            >
              <div style={chartTitleStyle}>
                {sample.name}
              </div>
              <div style={chartSubtitleStyle}>
                Distribution of {propertyLabel} {propertyUnit && `(${propertyUnit})`} • n={sample.stats.n}
              </div>
              <DistributionPlots
                data={[{
                  name: sample.name,
                  color: getSampleColor(sample.colorIndex),
                  values: sample.values,
                  stats: sample.stats
                }]}
                selectedProperty={selectedProperty}
                isExport={true}
              />
            </div>
          ))
        }

        {/* ===== SECTION 2: Per-Sample Zone Comparison (ALL zones within each sample) ===== */}
        {includeSections.perSample && includeSections.perSampleZones &&
          perSampleZoneData.map(({ sessionName, data }) => (
            <div
              key={`per_sample__${sessionName}__zones_boxplot`}
              ref={el => setChartRef(`per_sample__${sessionName}__zones_boxplot`, el)}
              style={chartWrapperStyle}
            >
              <div style={chartTitleStyle}>
                {sessionName} — Zone Comparison
              </div>
              <div style={chartSubtitleStyle}>
                {propertyLabel} {propertyUnit && `(${propertyUnit})`} • {data.length} groups
              </div>
              <BoxViolinPlots
                data={data}
                showViolin={true}
                showJitter={true}
                showPValueAsterisks={true}
                selectedProperty={selectedProperty}
                isExport={true}
              />
            </div>
          ))
        }

        {/* ===== SECTION 3: Cross-Sample Comparison (all samples) ===== */}
        {includeSections.crossSample && includeSections.crossSamplePlots && sampleData.length >= 2 && (
          <div
            ref={el => setChartRef('cross_sample__all_samples__comparison', el)}
            style={chartWrapperStyle}
          >
            <div style={chartTitleStyle}>
              Cross-Sample Comparison
            </div>
            <div style={chartSubtitleStyle}>
              {propertyLabel} {propertyUnit && `(${propertyUnit})`} • {sampleData.length} samples
            </div>
            <CrossSamplePlots
              samples={sampleData}
              selectedProperty={selectedProperty}
              showViolin={true}
              showJitter={true}
              isExport={true}
            />
          </div>
        )}

        {/* ===== SECTION 4: Treatment Group Comparison ===== */}
        {includeSections.treatmentGroups && groupData.length >= 2 && (
          <div
            ref={el => setChartRef('treatment_groups__all__comparison', el)}
            style={chartWrapperStyle}
          >
            <div style={chartTitleStyle}>
              Treatment Group Comparison
            </div>
            <div style={chartSubtitleStyle}>
              {propertyLabel} {propertyUnit && `(${propertyUnit})`} • {groupData.length} groups
            </div>
            <BoxViolinPlots
              data={groupData}
              showViolin={true}
              showJitter={true}
              showPValueAsterisks={true}
              selectedProperty={selectedProperty}
              isExport={true}
            />
          </div>
        )}

        {/* ===== SECTION 5: Pooled Zone Comparison (Zone 1 pooled vs Zone 2 pooled) ===== */}
        {includeSections.smartZones && includeSections.smartZonesPooled && pooledZoneData.length >= 2 && (
          <div
            ref={el => setChartRef('pooled_zones__all__pooled_comparison', el)}
            style={chartWrapperStyle}
          >
            <div style={chartTitleStyle}>
              Pooled Zone Comparison
            </div>
            <div style={chartSubtitleStyle}>
              {propertyLabel} {propertyUnit && `(${propertyUnit})`} • {pooledZoneData.length} zone types (combined from all samples)
            </div>
            <BoxViolinPlots
              data={pooledZoneData}
              showViolin={true}
              showJitter={true}
              showPValueAsterisks={true}
              selectedProperty={selectedProperty}
              isExport={true}
            />
          </div>
        )}

        {/* ===== SECTION 6: Smart Zone Cross-Comparison (multi-sample zones aggregated) ===== */}
        {includeSections.smartZones && includeSections.smartZonesCrossComparison && smartZoneData.size >= 2 && (
          <div
            ref={el => setChartRef('smart_zones__multi_sample__cross_zone', el)}
            style={chartWrapperStyle}
          >
            <div style={chartTitleStyle}>
              Cross-Zone Comparison (Multi-Sample Zones)
            </div>
            <div style={chartSubtitleStyle}>
              {propertyLabel} {propertyUnit && `(${propertyUnit})`} • {smartZoneData.size} zone types appearing in 2+ samples
            </div>
            <BoxViolinPlots
              data={Array.from(smartZoneData.entries()).map(([zoneName, entries]) => {
                const allValues = entries.flatMap(e => e.values);
                return {
                  name: zoneName,
                  color: entries[0].zone.color,
                  values: allValues,
                  stats: calculateDescriptiveStats(allValues)
                };
              })}
              showViolin={true}
              showJitter={true}
              showPValueAsterisks={true}
              selectedProperty={selectedProperty}
              isExport={true}
            />
          </div>
        )}

        {/* ===== SECTION 7: Same Zone Across Different Samples ===== */}
        {includeSections.smartZones && includeSections.smartZonesPerZone &&
          Array.from(smartZoneData.entries()).map(([zoneName, entries]) => (
            <div
              key={`smart_zones__${zoneName}__across_samples`}
              ref={el => setChartRef(`smart_zones__${zoneName}__across_samples`, el)}
              style={chartWrapperStyle}
            >
              <div style={chartTitleStyle}>
                Zone: {zoneName} — Across Samples
              </div>
              <div style={chartSubtitleStyle}>
                {propertyLabel} {propertyUnit && `(${propertyUnit})`} • Comparing across {entries.length} samples
              </div>
              <BoxViolinPlots
                data={entries.map(e => ({
                  name: e.sessionName,
                  color: e.zone.color,
                  values: e.values,
                  stats: calculateDescriptiveStats(e.values)
                }))}
                showViolin={true}
                showJitter={true}
                showPValueAsterisks={true}
                selectedProperty={selectedProperty}
                isExport={true}
              />
            </div>
          ))
        }
      </div>
    );
  }
);

ComprehensiveBatchRenderer.displayName = 'ComprehensiveBatchRenderer';
