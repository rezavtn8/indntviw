
## Replace "Beeswarm" with "Blend Overlap" Toggle

### The Problem
The beeswarm algorithm forces 500+ points per group to not overlap by pushing them horizontally. With dense nanoindentation datasets, this creates an absurdly wide point cloud (as seen in the screenshot). It defeats the purpose entirely.

### The Solution: SVG Multiply Blend Mode
Replace the Beeswarm toggle with a **"Blend Overlap"** toggle that applies `mix-blend-mode: multiply` to the jitter point layer. This is the standard technique used in scientific visualization tools (Prism, R ggplot2, Illustrator) for exactly this problem:

- Points stay in their **random jitter positions** (same as Sample Colors mode)
- Overlapping circles from different samples **multiply their colors** together:
  - Blue + Red = Purple
  - Red + Green = Dark Olive/Brown
  - Three overlapping = even darker, distinct hue
- All layers remain visible — overlap depth is encoded as color intensity
- Zero performance cost — it is a single CSS property on an SVG group element

This approach is called "multiply blending" and it works because the SVG background is white: any single color on white is unchanged, and two overlapping colors produce a darker mixed color that is distinct from either original.

---

### Behavior Matrix

| Points | Sample Colors | Blend Overlap | Result |
|--------|--------------|---------------|--------|
| ON | OFF | OFF | Default random jitter, group color |
| ON | ON | OFF | Per-sample colored jitter, translucent (existing behavior) |
| ON | ON | ON | Per-sample colored jitter with multiply blend — overlaps show mixed colors |
| ON | OFF | ON | Uniform group color jitter with multiply blend |
| OFF | any | any | No points |

---

### Files to Modify

**1. `src/components/analysis/GroupComparison.tsx`**
- Remove `showBeeswarm` state
- Add `showBlendOverlap` state (default `false`)
- Replace the "Beeswarm" `<Switch>` UI with "Blend Overlap"
- Pass `blendOverlap={showBlendOverlap}` to `BoxViolinPlots` (replacing `beeswarmMode`)

**2. `src/components/analysis/BoxViolinPlots.tsx`**
- Remove `beeswarmMode` prop
- Add `blendOverlap?: boolean` prop
- Remove the `beeswarmPts` useMemo block (no longer needed)
- Remove `getBeeswarmPoints` / `getColoredBeeswarmPoints` imports
- Pass `blendOverlap` through to `BoxViolinSvg`

**3. `src/components/analysis/boxViolin/BoxViolinSvg.tsx`**
- Remove `beeswarmPoints` prop and all associated logic (`beeswarmMap`, `useBeeswarmJitter` rendering block)
- Add `blendOverlap?: boolean` prop
- When rendering sample-colored jitter: if `blendOverlap=true`, wrap the circles in a `<g style={{ mixBlendMode: 'multiply' }}>` and increase `fillOpacity` to `0.7` (multiply needs higher base opacity to show clear blending)
- When rendering uniform jitter: same — wrap in multiply blend group when `blendOverlap=true`
- Point opacity strategy:
  - Normal sample colors mode: `fillOpacity=0.45` (unchanged — translucent)
  - Blend mode: `fillOpacity=0.75` (higher — multiply needs stronger base color to blend visibly)
  - Stroke removed in blend mode (stroke interferes with multiply blending)

**4. `src/components/analysis/boxViolin/jitter.ts`**
- Remove `getBeeswarmPoints` and `getColoredBeeswarmPoints` functions (clean up dead code)
- Keep `getJitteredPoints` and `getColoredJitteredPoints` unchanged

**5. `src/components/analysis/boxViolin/index.ts`**
- Remove any beeswarm-related exports if present

---

### Technical Details of Multiply Blend Mode

SVG `mix-blend-mode: multiply` works as follows:
- Each channel: `result = src * dst / 255`
- On white background (255,255,255): `result = src * 255/255 = src` → no change (correct)
- Two overlapping colors: `result = c1 * c2 / 255` → darker, distinct hue
- Three overlapping: product of all three → even darker

For the sample color palette (bright, saturated colors), this produces clearly distinct overlap indicators. For example:
- `#e6194b` (red) + `#3cb44b` (green) → dark olive
- `#4363d8` (blue) + `#f58231` (orange) → dark brown
- `#e6194b` + `#42d4f4` (cyan) → dark magenta

The user can instantly see "this point is from sample 1 alone" vs "this point is where sample 1 and sample 2 overlap" vs "triple overlap" — all without any repositioning.

This works correctly in SVG export and PNG rasterization via html2canvas (which supports mix-blend-mode).
