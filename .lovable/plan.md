

# Overlay Tab -- Performance and UX Overhaul

## Problems Found

1. **Canvas is hardcoded to 800x600** instead of filling available space
2. **Every data point is an individual SVG circle DOM node** -- with hundreds of points, every slider change triggers a massive DOM update
3. **SliderRow is defined as an inline component** inside the render function, causing React to unmount/remount it on every parent re-render (this is also the source of the console ref warning)
4. **Pan and zoom use React state**, so every mousemove/wheel event triggers a full component re-render
5. **No direct canvas interaction** -- you can only adjust the image via sliders, not by dragging on the canvas
6. **No auto-fit** -- no way to quickly fit the image to match data bounds

## Solution

### Phase 1: Fix Performance

**`src/components/visualization/OverlayCanvas.tsx`** -- Rewrite for performance:

- **Switch data points to a single Canvas 2D layer** instead of individual SVG circles. Render points onto an offscreen `<canvas>` element whenever points/colors change, then composite it with the image. This drops the DOM node count from N circles to 1 canvas element.
- **Use CSS transforms for pan/zoom** on the container div instead of SVG `transform` attributes and React state. Store pan/zoom in a `useRef` and apply via `element.style.transform` directly -- zero re-renders during interaction.
- **Image layer uses a simple `<img>` tag** with CSS transforms for position/scale/rotation/opacity, instead of an SVG `<image>` element. CSS transforms are GPU-accelerated.
- **Direct image dragging**: Left-click + drag on the canvas moves the image offset. Scroll wheel adjusts image scale. This gives tactile, immediate feedback.
- **Debounce slider updates**: The canvas reads transform values from a ref that updates immediately, while React state updates are throttled via `requestAnimationFrame`.

**`src/components/panels/OverlayControlsPanel.tsx`** -- Fix the ref warning and reduce re-renders:

- **Extract `SliderRow` to a standalone component** defined outside the render function (or use a stable `useCallback`-wrapped approach). This fixes the "Function components cannot be given refs" console error.
- **Add a "Fit Image to Data" button** that automatically calculates scale/offset to align the image bounds with the data bounds.
- **Add a "Center Image" button** as a quick-align shortcut.

### Phase 2: Responsive Sizing

**`src/components/IndentViewApp.tsx`**:

- Remove the hardcoded `width={800} height={600}` props.
- Use a `ResizeObserver` (or the container's `clientWidth`/`clientHeight`) to pass the actual available dimensions to the overlay canvas, so it fills the viewport dynamically.

## Technical Details

### Canvas-based point rendering

Instead of:
```
<g>
  {points.map(p => <circle ... />)}  // N DOM nodes
</g>
```

The new approach:
```
<canvas ref={pointsCanvasRef} />  // 1 DOM node
```

A `useEffect` redraws all points onto the canvas whenever `points`, `colorScheme`, or `selectedProperty` change. During pan/zoom, only the CSS transform on the container changes -- no redraw needed.

### CSS transform for pan/zoom (zero re-renders)

```
// Store in ref, not state
const viewRef = useRef({ x: 0, y: 0, zoom: 1 });

const applyTransform = () => {
  const { x, y, zoom } = viewRef.current;
  containerEl.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
};

// On wheel: update ref + apply -- no setState
onWheel = (e) => {
  viewRef.current.zoom *= e.deltaY > 0 ? 0.95 : 1.05;
  applyTransform();
};
```

### Direct image dragging

- Left-click + drag: updates `transform.offsetX/Y` via a callback (debounced to 1 update per animation frame)
- Scroll wheel on image: adjusts `transform.scale`
- Alt + drag: pan the entire view

### Files changed

| File | Change |
|------|--------|
| `src/components/visualization/OverlayCanvas.tsx` | Rewrite: Canvas 2D for points, CSS transforms for pan/zoom, direct image drag |
| `src/components/panels/OverlayControlsPanel.tsx` | Extract SliderRow, add Fit/Center buttons, fix ref warning |
| `src/components/IndentViewApp.tsx` | Dynamic sizing via ResizeObserver instead of hardcoded 800x600 |

