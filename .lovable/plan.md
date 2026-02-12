
# Overlay Tab -- Complete UX Redesign

## Problems Identified

1. **Bloated sidebar**: The overlay view duplicates File Uploader, Property Selector, Color Scheme, and Range Controls from the 2D view, pushing the actual overlay controls below the fold. Users have to scroll past irrelevant controls to find what matters.
2. **Stale closure bug in drag handler**: `handleMouseMove` captures `transform` in its dependency array, meaning every drag frame creates a new callback. When dragging, the offset calculations use stale state, causing jitter and lag.
3. **Image renders at native pixel size**: A 4000x3000 microscope photo renders at those pixel dimensions, then requires manual scaling down to ~0.1x. The image should auto-fit to the data bounds on first upload.
4. **Scale slider range is absurd**: 0.05x to 20x is far too wide -- most useful values are between 0.5x and 3x. The slider is unusable because 95% of the range is irrelevant.
5. **PDF export hardcodes 800x600**: Ignores actual canvas dimensions.
6. **No auto-fit on upload**: User has to manually fiddle with scale/offset after every upload.
7. **Too many collapsible sections**: Image Transform, Points, Export all as separate collapsibles makes the sidebar feel heavy for what should be simple controls.

## Solution

### Phase 1: Streamline the sidebar

**`src/components/IndentViewApp.tsx`** -- Remove the duplicated controls from the overlay view sidebar. The overlay view should only show:
- Image upload (compact)
- Image transform sliders (only when image is loaded)
- Point settings (compact)
- Export button (compact)

The Property Selector, Color Scheme, and Range Controls are already accessible from the 2D view and persist across views via context -- no need to duplicate them.

### Phase 2: Fix the canvas interactions

**`src/components/visualization/OverlayCanvas.tsx`**:
- **Fix stale closure**: Store `transform` in a `useRef` that syncs with the prop. Use the ref inside mouse handlers so they always read the latest value without needing to be recreated.
- **Auto-fit on first image upload**: When `imageUrl` changes and `imageDimensions` loads, automatically call `fitImageToData()` so the image starts aligned with the data bounds.
- **Use the full container**: The scene `div` should match `width x height` of the container, and the image should be positioned relative to the data coordinate space (centered on the data center, not the viewport center).

### Phase 3: Compact the controls panel

**`src/components/panels/OverlayControlsPanel.tsx`**:
- **Flatten the layout**: Remove unnecessary collapsible wrappers. Use a single compact form with clear section headers.
- **Better scale slider**: Change range to 0.1x -- 5x with step 0.01.
- **Inline quick actions**: Put Fit/Center/Reset as small icon buttons in a row, not full-width buttons.
- **Compact export**: Single row with format selector and export button, no separate collapsible section.
- **Fix PDF dimensions**: Use actual canvas dimensions instead of hardcoded 800x600.

## Technical Details

### Fixing the stale closure (critical performance fix)

```text
Current (broken):
  handleMouseMove depends on [transform]
  -> every transform change recreates the callback
  -> drag uses stale values between frames

Fixed:
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);
  
  handleMouseMove reads from transformRef.current
  -> callback is stable, always reads latest values
  -> zero jitter during drag
```

### Auto-fit on image load

When `imageDimensions` changes (image loaded), if this is the first load (previous was null), automatically calculate and apply the fit transform. This means when you upload an image, it immediately appears aligned with your data -- no manual adjustment needed.

### Sidebar layout (simplified)

```text
+---------------------------+
| [Upload Image] [x Remove] |  <- compact row
+---------------------------+
| Image Opacity    [====] % |  <- only most-used slider inline
| Scale            [====] x |
| Rotation         [====] * |
| X Offset         [====]px |
| Y Offset         [====]px |
| [Fit] [Center] [Reset]    |  <- small icon buttons
+---------------------------+
| Point Size       [====] x |
| Point Opacity    [====] % |
+---------------------------+
| [PNG|SVG|PDF]  [Export]    |  <- single compact row
+---------------------------+
```

### Files changed

| File | Change |
|------|--------|
| `src/components/visualization/OverlayCanvas.tsx` | Fix stale closure with transformRef, auto-fit on image load, use container dimensions properly |
| `src/components/panels/OverlayControlsPanel.tsx` | Compact layout, better slider ranges, inline actions, fix PDF dimensions |
| `src/components/IndentViewApp.tsx` | Remove duplicated Property/Color/Range controls from overlay sidebar |
