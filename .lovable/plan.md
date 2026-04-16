

## Overlay Tab — Critical Audit & Fix

### Issues found

**A. Visual inconsistency with the polish pass**
1. Bottom-center layer switcher pill still uses **bright hardcoded green/blue** (`hsl(142,76%,46%)`, `hsl(217,91%,60%)`) — the in-canvas pill was missed in the previous brand cleanup. Should match the sidebar buttons (navy/teal).
2. The **selection bounding-box outlines** drawn over image/points use the same off-brand green/blue — they jump out and clash with everything else.
3. Bottom-left help hint (`Click: select layer · Drag: move...`) is plain text, low contrast, easily overlapped by the layer switcher; no proper grouping.
4. The "Color Scale" collapsible in the sidebar uses `bg-muted/30` background — flagged in prior audit as inconsistent with other section headers. Still present in Overlay's sidebar branch (separate code path from 2D/3D).

**B. UX / functional friction**
5. **No zoom indicator and no "Reset View" button** for the pan/zoom (Alt+wheel/Alt+drag). Once panned/zoomed, only way back is to refresh — easy to get lost.
6. **Discoverability of Alt-modifiers is poor** — only mentioned in tiny grey text. Users won't find pan/zoom.
7. **Active layer is ambiguous** when both bounding boxes overlap. The active one is only slightly thicker; with off-brand colors it reads like noise rather than selection state.
8. **Empty state** ("Upload a microscope image and load data to begin") is bare centered text — no icon, no CTA button, doesn't match the polish of other empty states.
9. **Resize handles** are flat colored squares; small (8px), no hover feedback, identical cursor on all four corners (`nwse-resize` even on TR/BL where it should be `nesw-resize`).
10. **Rotation control** exists in the sidebar but the bounding box doesn't rotate with the image — so "rotate" feels disconnected from the visual selection.

**C. Toolbar / layout**
11. Overlay now has the standard `AppToolbar` (added in prior pass) but the `pts` count + Edit button appear even though Edit Mode does nothing in Overlay (clicking points doesn't select/edit them here). Edit button should be hidden for Overlay.
12. Image filename is never displayed — once uploaded you can't tell which file is loaded without re-checking.

**D. Sidebar control panel issues** (`OverlayControlsPanel.tsx`)
13. Active Layer buttons were given brand colors (navy/teal) in the previous pass, but their **hover/idle state uses `bg-muted/50`** which is the same as inactive Format toggles below — visually competing rows of identical pills.
14. **"Points Visibility" toggle** (Eye/EyeOff) is a separate row at the top — duplicates state already controlled by the Active Layer system. Should be inline with Points layer controls.
15. Image Controls panel has **Fit / Center / Reset** buttons but Points panel only has **Center / Reset** (no Fit) — asymmetric.
16. **Section dividers** use `border-t border-border` between every block, creating a busy stacked-card look. Should use spacing or a single subtle separator.

### Plan — atomic changes

**1. Brand-align in-canvas chrome** (`OverlayCanvas.tsx`)
- Replace bottom-center layer pill colors: Image → `BRAND.navy`, Points → `BRAND.teal`. Match the sidebar exactly.
- Selection bounding-box strokes: Image bbox → `BRAND.navy`, Points bbox → `BRAND.teal`. Use brand-coral only on hover of resize handles (interaction affordance).
- Improve handle: 10px squares, white fill + 2px brand-color stroke, correct cursor per corner (TL/BR = nwse-resize, TR/BL = nesw-resize).
- Make active bbox stroke 3px, inactive 1px dashed at 40% opacity → unmistakable hierarchy.

**2. Zoom controls + reset** (`OverlayCanvas.tsx`)
- Add a small floating control cluster top-right: `+`, `−`, `Fit`, `1:1`, plus a live zoom-percent readout (`100%`).
- On click: animate viewRef zoom and recenter pan to 0,0 for "Fit" / "1:1".
- Replace the cryptic bottom-left hint with a clean `kbd`-styled chip group: `Alt+Drag pan · Alt+Wheel zoom`.

**3. Better empty state** (`OverlayCanvas.tsx`)
- Centered card with overlay-icon + headline + two side-by-side CTAs:
  - "Upload Image" (opens the file picker — wire from sidebar handler)
  - "Load Sample Data"
- Brand gradient hairline at the top of the card.

**4. Hide Edit toolbar in Overlay** (`IndentViewApp.tsx`)
- Pass `onToggleEditing={undefined}` (or new `hideEditing` prop) to `AppToolbar` when `activeView === 'overlay'`. Keep `pts` count + filename.
- Surface active image filename in the toolbar: `image.png · 1024×768` next to `pts` count.

**5. Sidebar cleanup** (`OverlayControlsPanel.tsx`)
- Remove the standalone "Points Visibility" row at top. Move Eye/EyeOff toggle inline with the "Points" tab in the Active Layer selector (small icon on the right side of the Points pill).
- Add **Fit** button to the Points controls (calls `centerPoints` + reset stretch/scale to 1).
- Replace per-section `border-t border-border` with a single shared spacing rhythm (`space-y-4`) and `font-mono uppercase` headers (no top borders).
- Active Layer pills: keep brand navy/teal for active, use `bg-transparent border border-border` for inactive (not `bg-muted/50`) so they don't compete with format toggles.

**6. Sidebar parity with other views** (`IndentViewApp.tsx`)
- Replace the Overlay-specific Color Scale collapsible (`bg-muted/30` trigger) with the same trigger style used elsewhere (no muted bg) — already noted in prior pass for the non-overlay path; the Overlay branch was missed.

### Files to edit
- `src/components/visualization/OverlayCanvas.tsx` — in-canvas branding, zoom controls, empty state, handle polish, brand-aligned bboxes.
- `src/components/panels/OverlayControlsPanel.tsx` — sidebar cleanup, merge points-visibility into Active Layer, add Fit for points, normalize dividers.
- `src/components/IndentViewApp.tsx` — hide Edit toolbar in Overlay, surface image filename + dimensions in toolbar, normalize the Color Scale collapsible style to match other views.
- `src/components/layout/AppToolbar.tsx` — accept optional `hideEditing` prop (or simpler: just don't pass `onToggleEditing` when in Overlay — already supported via the `showEditingTools` check).

### Out of scope
- Underlying overlay math (transform composition, export pipeline) — works correctly, no changes.
- New features (e.g. multi-image stacking, scale calibration) — separate request.

### Outcome
Overlay finally feels like the same product as the other tabs: brand-aligned colors throughout (in-canvas + sidebar), discoverable zoom/pan, polished empty state, no redundant Edit button, file context surfaced, and a calmer sidebar with a clear single source of truth for layer selection + visibility.

