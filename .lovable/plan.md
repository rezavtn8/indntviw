

## Production Polish Pass — `/app` Visual Consistency

After auditing every view (2D, 3D, Overlay, Analysis, Export · Figure, Export · Batch), the app has good bones but suffers from **inconsistent component patterns** between tabs. Below is a focused, high-impact cleanup. Single goal: every view should feel like one product.

### Issues found (by severity)

**A. Layout structure breaks between views**
1. **Overlay view** — no toolbar at all (no Edit/Export buttons, no `pts` count). Toolbar disappears on overlay only.
2. **Analysis view** — has its OWN inner sidebar ("Analysis Controls") *in addition* to the main sidebar, creating a triple-column layout that no other view has. Mode tabs ("Single Sample" / "Cross-Sample") use a different button style than Export Studio's mode tabs.
3. **3D view** — Spatial Analysis context panel labels overlap (e.g., `Z 6.681 - Z Mean: 6.823` collide; `Gradient: -15.7707 Correlation: -0.059` overlap; histogram axis numbers overlap).
4. **Export Studio** — mode tabs (Figure/Batch) use yet a *third* button visual style (rounded, large, black bg).
5. **Color legend** present in 2D/3D as right-rail strip, **missing in Overlay** despite property/colormap controls existing there.

**B. Off-brand colors hardcoded**
6. **Overlay "Active Layer" buttons** use bright green (`hsl(142,76%,46%)`) and bright blue (`hsl(217,91%,60%)`) — completely off-palette. Should use brand navy/teal.
7. **Spatial3D analysis cards** use raw `bg-green-500`, `text-green-600`, `bg-emerald-500` for roughness/coverage badges — clashes with the muted scientific palette. Should use neutral chips with brand-coral for warnings, brand-teal for "good".
8. **Correlation matrix** uses red/green-500 — same issue. Should use coolwarm semantic (navy = positive, coral = negative) to match the platform's diverging colormap convention.

**C. Toolbar / button inconsistency**
9. Toolbar `Edit` and `Export` buttons render as `ghost` variant (text only) but **Single Sample / Figure Export** mode tabs are huge filled black buttons → strong visual hierarchy mismatch. The mode tabs should be a subtle segmented control, not the loudest thing on the screen.
10. `ZoneToolbar` only appears in 2D + Export-Figure but not in Overlay (where zones don't apply — fine) and is missing the consistent divider style.

**D. Sidebar inconsistencies**
11. Section headers use mixed case: some `font-mono uppercase` (DATA FILE, PROPERTY) but Analysis uses `Analysis Controls` (Title Case + bold). Standardize.
12. "Synced Across Tabs" pill has its own framed border style not used elsewhere.
13. `Color Scale` collapsible has a different background (`bg-muted/30`) than other sections.

**E. Misc polish**
14. Sample data toast `Loaded sample data: 102 points` appears inside the heatmap canvas (bottom-right) overlapping data — should be a top-corner sonner toast.
15. Footer wordmark + `102 points loaded` look fine but lack the brand stripe accent that the top has.
16. Toolbar `Export` button is ambiguous (can be confused with the Export view).

---

### Plan — atomic changes

**1. Unified mode-tab component (`SegmentedTabs`)** — new tiny component, used in both Analysis (Single/Cross) and Export (Figure/Batch). Compact pill row with subtle bottom-border accent in brand teal for active tab. Replaces the two big black buttons.

**2. Unified Analysis layout** — move Analysis's inner sidebar contents (Property selector, All Data toggle, Zones list, Plot Options) into the **main `ViewSidebar` controls panel** (same place as 2D/3D controls). Result: Analysis matches every other view's two-column structure.

**3. Toolbar everywhere** — render `AppToolbar` for Overlay too (with Edit/Export hidden if not applicable), so the toolbar bar is visually consistent across all 5 views.

**4. Color Legend in Overlay** — add the same right-rail `ColorLegend` to Overlay since it already has property + scheme + range controls.

**5. Overlay Active Layer buttons** — replace bright green/blue with brand `navy` (Image) and `teal` (Points) with white text. Subtle, on-brand.

**6. Spatial3D / Correlation / Surface / Volume / Gradient color cleanup**
  - Replace raw `green-500/red-500/emerald-500/orange-500/yellow-500` semantic chips with a single helper using brand palette: `navy` = good/positive, `teal` = neutral-good, muted = neutral, `coral` = warning/negative.
  - Fix label collisions in Spatial3D `Depth Statistics` & `Depth vs HIT Correlation` cards: switch from inline two-column flex to a clean two-row `dl` with proper spacing.

**7. Sidebar normalization**
  - All section headers: `font-mono text-xs uppercase tracking-wider text-muted-foreground` (already the standard for most).
  - Drop the `Analysis Controls` H3; use a section group like the others.
  - `Color Scale` collapsible: same trigger style as other section labels (no muted bg).
  - "Synced Across Tabs" pill: replace framed border with the standard label + switch row used elsewhere.

**8. Sample-data load notification** — switch the in-canvas pill to a real sonner toast (one line change in SessionContext).

**9. Footer accent** — add a 1px brand-gradient hairline above the footer for symmetry with the top stripe.

**10. Remove the second `Export` button from `AppToolbar`** when `activeView === 'export'` (it's redundant and confusing — the user is already in Export Studio).

### Files to edit

- `src/components/IndentViewApp.tsx` — wire toolbar into Overlay; add legend to Overlay; pass Analysis-sidebar content into `ViewSidebar`; hide redundant Export button in Export view.
- `src/components/layout/AppLayout.tsx` — footer brand-stripe hairline.
- `src/components/panels/AnalysisPanel.tsx` — remove inner sidebar; expose its controls via prop/render-slot consumed by `ViewSidebar`; replace mode tabs with `SegmentedTabs`.
- `src/components/panels/OverlayControlsPanel.tsx` — Active Layer button colors → brand navy/teal.
- `src/components/analysis/Spatial3DPanel.tsx` + child cards (`DepthAnalysis`, `SurfaceAnalysis`, `VolumeAnalysis`, `GradientAnalysis`, `SpatialDistribution`, `CorrelationAnalysis`) — fix label overlap (grid layout) and swap raw green/red Tailwind classes for a brand-aware `<StatusChip>` helper.
- `src/components/analysis/ComprehensiveBatchExport.tsx` (Export view mode tabs trigger lives in `IndentViewApp.tsx` `renderExportModeTabs`) — replace with new `SegmentedTabs`.
- `src/components/controls/SyncScopeControls.tsx` — restyle pill to match standard sidebar row.
- `src/contexts/SessionContext.tsx` — remove inline canvas pill for sample-load message; use `sonner` toast.
- New file: `src/components/layout/SegmentedTabs.tsx` (shared mode-tab control).
- New file: `src/components/ui/status-chip.tsx` (brand-palette status badge: `good | neutral | warn`).

### Out of scope (will not touch in this pass)
- Heatmap rendering, statistical computation, export logic — purely visual cleanup only.
- Landing page (already redesigned).
- Functional behavior of any feature.

### Outcome
Every view will share: same sidebar pattern, same toolbar bar, same mode-tab control, same brand palette, same chip/badge style, same color legend placement, same brand stripe top + bottom. No more ad-hoc buttons or palette drift between tabs.

