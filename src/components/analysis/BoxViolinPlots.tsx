/**
 * Box/Violin Plot Component
 * 
 * Wrapper component that handles statistical calculations and renders
 * the BoxViolinSvg with optional legend.
 */

import React, { useMemo } from 'react';
import { DescriptiveStats, welchTTest, oneWayANOVA } from '@/utils/advancedStatistics';
import { PROPERTY_CONFIGS } from '@/types/indentation';
import { BoxViolinSvg, PairwiseResult, getPValueAsterisks } from './boxViolin';

export interface BoxViolinPlotsProps {
  data: { name: string; color: string; values: number[]; stats: DescriptiveStats }[];
  selectedProperty: string;
  showViolin?: boolean;
  showJitter?: boolean;
  showPValueAsterisks?: boolean;
  isExport?: boolean;
  blackAndWhite?: boolean;
}

const FONT_STYLE: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

export const BoxViolinPlots: React.FC<BoxViolinPlotsProps> = ({
  data,
  selectedProperty,
  showViolin = false,
  showJitter = true,
  showPValueAsterisks = false,
  isExport = false,
  blackAndWhite = false,
}) => {
  // Get property config for display
  const propertyConfig = useMemo(() => {
    return PROPERTY_CONFIGS.find(c => c.key === selectedProperty);
  }, [selectedProperty]);

  const unit = propertyConfig?.unit || '';
  const yAxisLabel = propertyConfig 
    ? `${propertyConfig.label}${unit ? ` (${unit})` : ''}` 
    : selectedProperty;

  // Calculate pairwise p-values for significance asterisks
  const pairwiseResults = useMemo((): PairwiseResult[] => {
    if (!showPValueAsterisks || data.length < 2) return [];
    
    const results: PairwiseResult[] = [];
    
    // For 2 groups, show one comparison
    if (data.length === 2) {
      const test = welchTTest(data[0].values, data[1].values);
      results.push({ 
        i: 0, 
        j: 1, 
        pValue: test.pValue, 
        asterisks: getPValueAsterisks(test.pValue) 
      });
    } else {
      // For multiple groups, first check ANOVA significance
      const groups = data.map(d => d.values);
      const anova = oneWayANOVA(groups);
      
      if (anova.isSignificant) {
        // Show pairwise comparisons (adjacent pairs to avoid clutter)
        for (let i = 0; i < data.length - 1; i++) {
          const test = welchTTest(data[i].values, data[i + 1].values);
          results.push({ 
            i, 
            j: i + 1, 
            pValue: test.pValue, 
            asterisks: getPValueAsterisks(test.pValue) 
          });
        }
      }
    }
    
    return results;
  }, [data, showPValueAsterisks]);

  return (
    <div 
      className={isExport ? '' : 'border-2 border-border rounded-lg p-4'} 
      style={FONT_STYLE}
    >
      {/* Header - hide in export mode */}
      {!isExport && (
        <div className="mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider" style={FONT_STYLE}>
            Box Plot Comparison
            {unit && <span className="text-muted-foreground ml-2">({unit})</span>}
          </h4>
        </div>
      )}

      {/* SVG Plot */}
      <div className={isExport ? '' : 'overflow-x-auto'}>
        <BoxViolinSvg
          data={data}
          pairwiseResults={pairwiseResults}
          showViolin={showViolin}
          showJitter={showJitter}
          showPValueAsterisks={showPValueAsterisks}
          blackAndWhite={blackAndWhite}
          yAxisLabel={yAxisLabel}
          xAxisLabel="Samples"
        />
      </div>

      {/* Legend - hide in export mode */}
      {!isExport && (
        <div 
          className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-4 text-xs text-muted-foreground"
          style={FONT_STYLE}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-foreground" />
            <span>Median</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-foreground rotate-45" />
            <span>Mean</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-foreground/20 border border-foreground" />
            <span>IQR</span>
          </div>
          {showPValueAsterisks && (
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <span className="font-bold">*</span>
              <span>p&lt;0.05</span>
              <span className="font-bold">**</span>
              <span>p&lt;0.01</span>
              <span className="font-bold">***</span>
              <span>p&lt;0.001</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
