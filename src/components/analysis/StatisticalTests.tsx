import React from 'react';
import { ComparisonReport } from './ComparisonReport';

interface StatisticalTestsProps {
  data: { name: string; color: string; values: number[] }[];
  selectedProperty: string;
}

/**
 * Zone-level statistical comparison within a single sample.
 *
 * This was ~280 lines that reimplemented the normality / two-group /
 * multi-group / post-hoc pipeline and its rendering. All of that now lives in
 * ComparisonReport; the only thing specific to this view is that a "group"
 * here is a zone, and the unit of analysis is the individual indent.
 */
export const StatisticalTests: React.FC<StatisticalTestsProps> = ({ data }) => (
  <ComparisonReport
    groups={data}
    title="Statistical Tests"
    unit="indents"
    emptyHint="Select at least 2 zones to perform statistical comparisons."
  />
);
