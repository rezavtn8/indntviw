
## Fix: Make "Blend Overlap" a Sub-Mode of "Sample Colors"

### The Problem
Currently "Blend Overlap" is an independent toggle that can be turned on even when "Sample Colors" is OFF. When Sample Colors is off, all points are the same color, so multiply-blending identical colors just makes them slightly darker — it provides no useful information and looks broken (the user called it "a scam").

Blend Overlap only makes sense when Sample Colors is ON, because the entire point is to show *which samples overlap* by mixing their distinct colors.

### The Fix
Remove "Blend Overlap" as a standalone toggle. Instead, make it a **sub-option of Sample Colors** — a secondary switch that only appears (or only activates) when Sample Colors is already enabled.

The UI will look like:

```text
[Violin ○] [Points ○] [Sample Colors ○──→ Blend Overlap ○]
```

When Sample Colors is toggled OFF, Blend Overlap is hidden/reset to OFF automatically.

---

### Files to Modify

**1. `src/components/analysis/GroupComparison.tsx`**
- Add auto-reset: when `showSampleColors` turns OFF, also set `showBlendOverlap` to `false`
- Move the "Blend Overlap" switch so it renders **only when `showSampleColors` is true**, visually indented or connected with a small arrow/label to indicate it's a sub-option
- Keep both state variables as-is internally — just control when Blend Overlap is visible and when it resets

**2. `src/components/analysis/boxViolin/BoxViolinSvg.tsx`**
- Add a guard: only apply `mixBlendMode: multiply` when **both** `blendOverlap=true` AND `sampleColoredJitter` is being used (i.e., skip blend mode for uniform jitter entirely)
- This ensures that even if `blendOverlap` is somehow passed as `true` without sample colors, it has no visual effect

---

### UI Layout (in the Plot Options bar)

```text
[Violin]  [Points]  [Sample Colors ●]  [↳ Blend Overlap ●]
```

The "Blend Overlap" label will have a small left-indent and a subtle "↳" prefix or dimmed separator to signal it is a child control of Sample Colors. It disappears entirely when Sample Colors is OFF.

---

### Behavior Matrix (corrected)

| Points | Sample Colors | Blend Overlap | Result |
|--------|--------------|---------------|--------|
| ON | OFF | — (hidden) | Default random jitter, group color |
| ON | ON | OFF | Per-sample colored jitter, translucent |
| ON | ON | ON | Per-sample colored jitter with multiply blend — overlaps show mixed colors |
| OFF | any | any | No points |

---

### Technical Details
- No changes to `jitter.ts`, `layout.ts`, `BoxViolinPlots.tsx`, or `index.ts` — this is purely a UI/logic fix
- The `blendOverlap` prop still flows through the component tree unchanged
- The guard in `BoxViolinSvg.tsx` is a safety net — the real fix is in `GroupComparison.tsx` controlling visibility
- When `showSampleColors` is turned ON → OFF, `showBlendOverlap` resets to `false` via the `onCheckedChange` handler:
  ```tsx
  onCheckedChange={(v) => {
    setShowSampleColors(v);
    if (!v) setShowBlendOverlap(false);
  }}
  ```
