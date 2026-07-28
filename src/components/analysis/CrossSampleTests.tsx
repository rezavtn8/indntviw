import React, { useMemo } from 'react';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import { getSampleColor } from './SampleSelector';
import { ComparisonReport } from './ComparisonReport';

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

/**
 * Sample-to-sample statistical comparison.
 *
 * Was a near-verbatim copy of StatisticalTests with "zone" swapped for
 * "sample"; both now delegate to ComparisonReport. Note the unit here is still
 * the individual indent — every point from each sample is pooled, so a
 * significant result partly reflects within-sample spread. Use the sample-level
 * view under "By Group" when comparing treatments.
 */
export const CrossSampleTests: React.FC<CrossSampleTestsProps> = ({ samples }) => {
  const groups = useMemo(
    () => samples.map(s => ({
      name: s.name,
      values: s.values,
      color: getSampleColor(s.colorIndex),
    })),
    [samples],
  );

  return (
    <ComparisonReport
      groups={groups}
      title="Cross-Sample Statistical Tests"
      unit="indents"
      emptyHint="Select at least 2 samples to perform statistical comparisons."
    />
  );
};
