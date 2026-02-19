
## "Beeswarm" Toggle — Non-Overlapping Point Layout

### The Problem
With the current random jitter, dense datasets cause points to stack on top of each other. Even with translucency (0.45 opacity), the bottom layers can be hard to see. The user wants a mode where every single point is guaranteed to be visible.

### The Solution: Beeswarm Layout
A **beeswarm** is a dot-plot variant where points are placed at their exact Y position (data value) but pushed left or right just enough to avoid overlapping their neighbors. All points remain visible because none can hide behind another. This is the standard solution in scientific visualization for this exact problem.

Key properties:
- Y position is always exact (data fidelity preserved)
- X position is offset only enough to avoid overlap (no more than necessary)
- Points are packed symmetrically around center, so distribution shape stays visible
- Works together with the existing "Sample Colors" toggle (colored beeswarm)

---

### Architecture

The toggle is added in `GroupComparison.tsx` alongside the existing "Sample Colors" toggle. When enabled, it replaces the jitter positioning algorithm with beeswarm positioning. The beeswarm algorithm lives in `jitter.ts` as a new exported function.

```text
GroupComparison.tsx
  └─ showBeeswarm state + toggle UI
  └─ passes beeswarmMode prop to BoxViolinPlots

BoxViolinPlots.tsx
  └─ when beeswarmMode=true, calls getBeeswarmPoints / getColoredBeeswarmPoints
     instead of getColoredJitteredPoints

BoxViolinSvg.tsx
  └─ no changes needed — already renders JitteredPoint[] regardless of how they were computed

jitter.ts
  └─ getBeeswarmPoints(values, radius, niceMin, niceMax, topMargin): JitteredPoint[]
  └─ getColoredBeeswarmPoints(samples, radius, niceMin, niceMax, topMargin): JitteredPoint[]
```

---

### Files to Modify

**1. `src/components/analysis/boxViolin/jitter.ts`**

Add two new exported functions:

`getBeeswarmPoints(values, radius, niceMin, niceMax, topMargin)`:
- Sort values (for deterministic layout)
- For each point, find its Y pixel coordinate
- Greedily push its X coordinate outward from center until it no longer collides with any already-placed point (collision = distance < `radius * 2`)
- Return array of `{ x, y }` — no color

`getColoredBeeswarmPoints(samples, radius, niceMin, niceMax, topMargin)`:
- Same algorithm but accepts `{ values, color }[]` (one per sample)
- Flattens all samples into one list, sorts by Y for proper packing
- Returns `{ x, y, color }[]`

The beeswarm algorithm:
```
placed = []
for each point (sorted by y):
  x = 0
  step = 0
  direction = +1
  while any placed point within 2*r distance:
    x += direction * step
    direction = -direction
    step += 0.5
  placed.push({ x, y, color })
```
This produces a symmetric, packed column of dots.

**2. `src/components/analysis/BoxViolinPlots.tsx`**

- Add optional prop `beeswarmMode?: boolean`
- When `beeswarmMode=true` AND `sampleColoredData` is provided: call `getColoredBeeswarmPoints` instead of `getColoredJitteredPoints` to compute `sampleColoredJitter`
- When `beeswarmMode=true` AND no `sampleColoredData`: pass a new optional `beeswarmPoints` prop to `BoxViolinSvg` (uniform beeswarm without sample colors)
- Point radius used for beeswarm collision = `3` (same as current circle radius)

**3. `src/components/analysis/boxViolin/BoxViolinSvg.tsx`**

- Add optional prop `beeswarmPoints?: { groupIdx: number; points: JitteredPoint[] }[]`
- In the render loop: when `beeswarmPoints` has an entry for this group, use those points for uniform jitter rendering (instead of calling `getJitteredPoints`)
- This handles the case where beeswarm is on but sample colors are off

**4. `src/components/analysis/GroupComparison.tsx`**

- Add `showBeeswarm` state (default `false`)
- Add a "Beeswarm" toggle in the Plot Options bar (alongside Violin, Points, Sample Colors)
- Pass `beeswarmMode={showBeeswarm}` down to `BoxViolinPlots`
- Label: "Beeswarm" with a tooltip note would be nice but keep it simple — just a switch

---

### Behavior Matrix

| Jitter | Sample Colors | Beeswarm | Result |
|--------|--------------|----------|--------|
| ON | OFF | OFF | Current random jitter (group color) |
| ON | ON | OFF | Current translucent colored jitter |
| ON | OFF | ON | Beeswarm, uniform group color |
| ON | ON | ON | Beeswarm with per-sample colors — all points visible |
| OFF | any | any | No points shown |

---

### Technical Details

- The beeswarm algorithm is O(n²) per group but with typical nanoindentation datasets (hundreds to low thousands of points per group), this is instant
- Beeswarm width can grow wider than the box for large datasets — this is expected and desired. Points that exceed the box width still appear correctly because they render in the group's `<g transform>` space
- If the group is very dense (thousands of points), the beeswarm column can get very wide. We add a soft cap: if x would exceed `±BOX_WIDTH * 2`, still place but capped (some overlap is accepted at extreme density)
- No changes to export behavior — the SVG already renders beeswarm points the same as jitter points
- `showBeeswarm` is independent of `showSampleColors`: you can use either alone or together
