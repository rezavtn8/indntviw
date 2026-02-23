

## ✅ COMPLETED: Add "Small Dots" Toggle to All Box/Violin Plot Controls

Implemented. All 11 files modified. Toggle order is now:
```
[Violin] [Points] [Sample Colors*] [Scatter Density] [Small Dots]
```

- `BoxViolinSvg.tsx`: uniform r={smallDots ? 1 : 2}, colored r={smallDots ? 1.5 : 3}
- `BoxViolinPlots.tsx`: passes `smallDots` through
- `IntraGroupZoneComparison.tsx`: accepts and passes `smallDots`
- All 8 UI components: `GroupComparison`, `AnalysisPanel`, `IntraGroupAnalysis`, `ZoneBetweenGroupsAnalysis`, `ZoneAcrossSamplesPanel`, `GroupZoneAnalysis`, `SmartZoneAnalysis`, `ZoneComparisonPanel`
