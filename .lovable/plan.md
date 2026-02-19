
## Rename "Blend Overlap" + Fix All Toggles + Propagate to All Diagrams

### Summary of Changes

1. **Rename** "Blend Overlap" → a better name reflecting the scatter/density behaviour
2. **Audit all toggle bars** — some components are missing "Sample Colors" and "Scatter" toggles
3. **Propagate** the full toggle set to all components that render `BoxViolinPlots`

---

### Proposed New Name: "Scatter Density"

"Scatter Density" clearly communicates both aspects:
- **Scatter** — points are jittered/spread out wider
- **Density** — overlap regions darken, encoding point density

Alternative considered: "Wide Scatter" — but it misses the density visualization. "Scatter Density" wins because it describes the visual outcome accurately.

---

### Audit: What Each Component Currently Has

| Component | Violin | Points | Sample Colors | Scatter Density |
|---|---|---|---|---|
| `GroupComparison.tsx` | ✅ | ✅ | ✅ | ✅ (as "Blend Overlap") |
| `AnalysisPanel.tsx` | ✅ | ✅ | ❌ (B&W mode only) | ❌ |
| `CrossSamplePanel.tsx` | ✅ | ✅ | ❌ (B&W mode only) | ❌ |
| `IntraGroupAnalysis.tsx` | ✅ | ✅ | ❌ | ❌ |
| `ZoneComparisonPanel.tsx` | ✅ | ✅ | ❌ | ❌ |
| `ZoneBetweenGroupsAnalysis.tsx` | ✅ | ✅ | ❌ | ❌ |
| `ZoneAcrossSamplesPanel.tsx` | ✅ | ✅ | ❌ | ❌ |
| `GroupZoneAnalysis.tsx` | ✅ | ✅ | ❌ | ❌ |
| `SmartZoneAnalysis.tsx` | ✅ | ✅ | ❌ | ❌ |

**Note on "Sample Colors":** `AnalysisPanel` and `CrossSamplePanel` already have a "B&W Mode" toggle (which is the inverse — disables color). This is different from the `GroupComparison` "Sample Colors" toggle (which splits per-sample coloring within a group). Since `AnalysisPanel` and `CrossSamplePanel` don't have the concept of multiple samples per box (each box = one zone or one file), "Sample Colors" toggle is not applicable to them. The B&W toggle is the right approach for those. **Only "Scatter Density" is missing from all.**

**Note on `IntraGroupZoneComparison.tsx`**: receives `showViolin` and `showJitter` as props from `IntraGroupAnalysis.tsx`, so it doesn't need its own toggles — but `blendOverlap` will need to be forwarded too.

---

### Files to Modify

**1. `src/components/analysis/GroupComparison.tsx`**
- Rename label "Blend Overlap" → "Scatter Density"
- Rename state variable `showBlendOverlap` → `showScatterDensity`
- No logic changes needed

**2. `src/components/analysis/BoxViolinPlots.tsx`**
- Rename prop `blendOverlap` → `scatterDensity` (for internal clarity; or keep as `blendOverlap` to avoid propagating the rename everywhere — **keep as `blendOverlap` prop name** to minimize churn, only the label changes in the UI)

**3. `src/components/panels/AnalysisPanel.tsx`**
- Add `showScatterDensity` state (default `false`)
- Add "Scatter Density" toggle to the Plot Options section in the sidebar (below "Show Points")
- Pass `blendOverlap={showScatterDensity}` to `BoxViolinPlots`

**4. `src/components/analysis/CrossSamplePanel.tsx`**
- Add `showScatterDensity` state (default `false`)
- Add "Scatter Density" toggle to Plot Options sidebar (below "Show Points")
- Pass `blendOverlap={showScatterDensity}` to `CrossSamplePlots`

  *However — `CrossSamplePlots` is its own custom SVG renderer, not using `BoxViolinPlots`. It currently has its own internal jitter but does not support `blendOverlap`. Two options:*
  - **Option A**: Add `blendOverlap` support to `CrossSamplePlots` (larger change)
  - **Option B**: Skip for `CrossSamplePlots` for now, only propagate to the `BoxViolinPlots` usages in the Groups/Zones tabs
  - **Decision: Option B** — `CrossSamplePanel`'s Overview tab uses `CrossSamplePlots`, but the Groups/Zones tabs use child components that each call `BoxViolinPlots` directly. We add the toggle to `CrossSamplePanel` sidebar and pass it down to `IntraGroupAnalysis`, `GroupComparison`, `ZoneBetweenGroupsAnalysis`, `GroupZoneAnalysis`, `SmartZoneAnalysis`, `ZoneAcrossSamplesPanel`.

**5. `src/components/analysis/IntraGroupAnalysis.tsx`**
- Add `blendOverlap?: boolean` prop (defaults to `false`)
- Pass it to `BoxViolinPlots` in the Overview tab
- Also forward to `IntraGroupZoneComparison` via existing `showViolin`/`showJitter` pattern (add `blendOverlap` prop to `IntraGroupZoneComparison`)
- Add local "Scatter Density" toggle in the Overview tab's plot options bar (for standalone use), unless parent provides it
- **Decision**: simpler — add `blendOverlap` as a prop, but also keep a local toggle for when used standalone. The prop overrides local state. Actually the cleanest is: accept `blendOverlap` as a prop; add local toggle. When used from `CrossSamplePanel`, the prop is passed; when standalone, the local toggle works.
- **Simpler decision**: just add a local state `showScatterDensity` inside `IntraGroupAnalysis` and add the toggle to its plot options UI. `CrossSamplePanel` doesn't need to thread it.

**6. `src/components/analysis/ZoneBetweenGroupsAnalysis.tsx`**
- Add `showScatterDensity` local state (default `false`)
- Add "Scatter Density" toggle in the control bar alongside Violin/Points
- Pass `blendOverlap={showScatterDensity}` to `BoxViolinPlots`

**7. `src/components/analysis/ZoneAcrossSamplesPanel.tsx`**
- Add `showScatterDensity` local state (default `false`)
- Add "Scatter Density" toggle to the plot options bar
- Pass `blendOverlap={showScatterDensity}` to `BoxViolinPlots`

**8. `src/components/analysis/GroupZoneAnalysis.tsx`**
- Add `showScatterDensity` local state (default `false`)
- Add "Scatter Density" toggle in the plot options bar
- Pass `blendOverlap={showScatterDensity}` to `BoxViolinPlots`

**9. `src/components/analysis/SmartZoneAnalysis.tsx`**
- Add `showScatterDensity` local state (default `false`)
- Add "Scatter Density" toggle next to Violin/Points in the Card header area
- Pass `blendOverlap={showScatterDensity}` to both `BoxViolinPlots` calls (cross-zone and per-zone)

**10. `src/components/panels/ZoneComparisonPanel.tsx`**
- Add `showScatterDensity` local state (default `false`)
- Add "Scatter Density" toggle in the compact plot options bar
- Pass `blendOverlap={showScatterDensity}` to `BoxViolinPlots`

**11. `src/components/analysis/IntraGroupZoneComparison.tsx`**
- Add `blendOverlap?: boolean` prop
- Pass it through to `BoxViolinPlots`
- (The parent `IntraGroupAnalysis` will pass it through)

---

### Toggle Bar Consistency

All toggle bars will follow this consistent order:
```
[Violin] [Points] [Scatter Density]
```

For `GroupComparison` which additionally has per-sample coloring:
```
[Violin] [Points] [Sample Colors] [Scatter Density]
```

---

### Technical Notes

- The internal prop name `blendOverlap` in `BoxViolinPlots` and `BoxViolinSvg` stays unchanged — only the user-facing **label** changes to "Scatter Density"
- `IntraGroupZoneComparison` currently only accepts `showViolin` and `showJitter` as props — add `blendOverlap?: boolean` to its props interface
- `CrossSamplePlots` (used in CrossSamplePanel Overview tab) is a bespoke SVG renderer and does NOT use `BoxViolinPlots` — it is out of scope for this change (would require significant refactoring of that component)
- No changes to `BoxViolinSvg.tsx`, `jitter.ts`, `layout.ts`, `violin.ts`, or `index.ts`
