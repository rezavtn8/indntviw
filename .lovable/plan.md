
## Fix: "Blend Overlap" as a Fully Independent Toggle

### What the User Wants
"Blend Overlap" should stand on its own — not hidden under "Sample Colors". The idea: when many points are stacked at the same Y position, the overlapping region becomes darker/more saturated, encoding density visually. This works with OR without Sample Colors:

- **Without Sample Colors**: same-color points multiply → progressively darker shade = density map within the group scatter
- **With Sample Colors**: different-color points multiply → mixed hues where samples co-occur

Both are scientifically useful. The toggle should always be visible.

---

### Root Cause of the Current Bug
In `BoxViolinSvg.tsx`, the `blendOverlap` prop only affects the **sample-colored jitter** branch (`useColoredJitter`). The **uniform jitter** branch (`useUniformJitter`) completely ignores `blendOverlap`. So when Sample Colors is OFF, enabling Blend Overlap does absolutely nothing visible.

Additionally, the UI hides "Blend Overlap" behind "Sample Colors" in `GroupComparison.tsx`, so users can't even try it independently.

---

### Files to Modify

**1. `src/components/analysis/GroupComparison.tsx`**
- Remove the `if (!v) setShowBlendOverlap(false)` reset logic from the Sample Colors `onCheckedChange`
- Move the "Blend Overlap" switch out of the `{showSampleColors && (...)}` conditional — make it always visible alongside the other toggles
- Result: `[Violin] [Points] [Sample Colors] [Blend Overlap]` — four independent toggles

**2. `src/components/analysis/boxViolin/BoxViolinSvg.tsx`**
- In the **uniform jitter** rendering block (`useUniformJitter`), apply `mixBlendMode: 'multiply'` when `blendOverlap=true`, same as the colored jitter block:
  - Increase `fillOpacity` from `0.4` to `0.75` in blend mode (multiply needs stronger base color)
  - Remove stroke in blend mode
  - Wrap circles in `<g style={{ mixBlendMode: 'multiply' }}>` when blend is active
- This means density in uniform group-colored jitter is now visible as darker regions

---

### Behavior Matrix (corrected — all independent)

| Points | Sample Colors | Blend Overlap | Result |
|--------|--------------|---------------|--------|
| ON | OFF | OFF | Default random jitter, group color, translucent |
| ON | ON | OFF | Per-sample colored jitter, translucent, legend shown |
| ON | OFF | ON | Uniform jitter with multiply blend — dense regions go darker |
| ON | ON | ON | Sample-colored jitter with multiply blend — overlap = mixed hue |
| OFF | any | any | No points |

---

### Technical Detail: Why Multiply Works for Density

When `n` identical semi-opaque circles overlap on a white background with multiply blending:
- 1 point: `fillOpacity=0.75` → light tinted color
- 2 points: colors multiply → noticeably darker
- 3+ points: progressively darker still

For example, with `fillOpacity=0.75` and a blue `#4363d8`:
- 1 point: light blue
- 2 overlapping: medium blue
- 4 overlapping: near-solid blue

This creates a natural density heatmap on top of the jitter scatter — dense clusters are dark, sparse regions are light. Zero repositioning needed.

---

### UI Layout After Fix

```text
[Violin ○] [Points ●] [Sample Colors ○] [Blend Overlap ○]
```

All four are independent peers. No nesting, no conditional rendering.

---

### No Changes Needed
- `jitter.ts` — unchanged
- `BoxViolinPlots.tsx` — already passes `blendOverlap` through correctly
- `layout.ts`, `violin.ts`, `index.ts` — unchanged
