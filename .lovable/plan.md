

## Add "Small Dots" Toggle to All Box/Violin Plot Controls

### What It Does
Adds a new toggle that reduces jitter dot radius from the default sizes (r=2 for uniform, r=3 for colored) down to smaller sizes (r=1 for uniform, r=1.5 for colored). This helps visualize dense datasets where large dots obscure patterns.

### Changes

**Prop Threading (bottom-up)**

1. **`BoxViolinSvg.tsx`** -- Add `smallDots?: boolean` prop. When true, uniform jitter uses `r={1}` instead of `r={2}`, and colored jitter uses `r={1.5}` instead of `r={3}`.

2. **`BoxViolinPlots.tsx`** -- Add `smallDots?: boolean` prop, pass through to `BoxViolinSvg`.

3. **`IntraGroupZoneComparison.tsx`** -- Add `smallDots?: boolean` prop, pass through to `BoxViolinPlots`.

**Toggle UI (all components that render BoxViolinPlots)**

Add `showSmallDots` state and a "Small Dots" toggle switch to the standardized control bar in each of these files, after "Scatter Density":

4. **`GroupComparison.tsx`** -- `[Violin] [Points] [Sample Colors] [Scatter Density] [Small Dots]`
5. **`AnalysisPanel.tsx`** -- `[Violin] [Points] [Scatter Density] [Small Dots]`
6. **`IntraGroupAnalysis.tsx`** -- add toggle, pass to `BoxViolinPlots` and `IntraGroupZoneComparison`
7. **`ZoneBetweenGroupsAnalysis.tsx`** -- add toggle, pass to `BoxViolinPlots`
8. **`ZoneAcrossSamplesPanel.tsx`** -- add toggle, pass to `BoxViolinPlots`
9. **`GroupZoneAnalysis.tsx`** -- add toggle, pass to `BoxViolinPlots`
10. **`SmartZoneAnalysis.tsx`** -- add toggle, pass to both `BoxViolinPlots` calls
11. **`ZoneComparisonPanel.tsx`** -- add toggle, pass to `BoxViolinPlots`

### Standardized Toggle Order

```
[Violin] [Points] [Sample Colors*] [Scatter Density] [Small Dots]
```
(*Sample Colors only where applicable)

### Technical Details

In `BoxViolinSvg.tsx`, the radius change:
- Uniform jitter: `r={smallDots ? 1 : 2}`
- Colored jitter: `r={smallDots ? 1.5 : 3}`
- Legend circles remain unchanged (always `r={5}`)

Total files modified: 11

