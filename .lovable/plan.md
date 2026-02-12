

# Overlay Tab -- Dual-Layer Interactive Editor

## The Problem

Right now the overlay tab treats points as a fixed grid and only the image can be moved (and only via sliders or clunky drag). The user wants **two independent objects** -- the microscope image and the data points -- that can both be **freely moved, resized, and adjusted directly on the canvas**, like layers in a design tool.

## Solution: Two Selectable, Draggable Layers

The overlay becomes a simple two-layer compositor where each layer (Image and Points) is an independent object the user can click to select, drag to move, and resize using corner handles.

### How it works for the user

1. **Click on the image** -- it gets selected with a blue bounding box and corner handles
2. **Click on the points** -- they get selected with a green bounding box and corner handles
3. **Drag** the selected layer to reposition it
4. **Drag a corner handle** to resize (maintains aspect ratio)
5. **Sidebar sliders** update to show the selected layer's properties (opacity, rotation, scale)
6. **Layer switcher buttons** at the top of the sidebar let you toggle between "Image" and "Points" layers quickly

```text
Canvas view:
+------------------------------------------+
|                                          |
|   +-- blue handles (selected) --+        |
|   |   [microscope image]        |        |
|   |                             |        |
|   +-----------------------------+        |
|                                          |
|      o  o  o  o  o  <- data points       |
|      o  o  o  o  o     (green box        |
|      o  o  o  o  o      when selected)   |
|                                          |
|  [Image] [Points]  <- layer tabs bottom  |
+------------------------------------------+
```

### Sidebar layout (context-aware)

```text
+---------------------------+
| [Upload Image]  [x]       |
+---------------------------+
| Active Layer:              |
| [Image] [Points]           |  <- toggle buttons
+---------------------------+
| -- Selected Layer --       |
| Opacity      [========] % |
| Scale        [========] x |
| Rotation     [========] * |
| [Fit] [Center] [Reset]    |
+---------------------------+
| Export                     |
| [PNG|SVG|PDF]  [Export]    |
+---------------------------+
```

## Technical Changes

### 1. `src/components/visualization/OverlayCanvas.tsx`

- **Add `PointsTransform`**: New transform state for the points layer with `offsetX`, `offsetY`, `scale` (passed in as props, same pattern as the image transform)
- **Active layer state**: Track which layer (`'image' | 'points'`) is currently selected
- **Bounding box + handles**: Draw selection outlines and 4 corner resize handles for the active layer using a lightweight SVG overlay on top of the canvas
- **Hit testing**: On mousedown, check if the click is on a handle (start resize), on the active layer (start drag), or on the other layer (switch selection)
- **Resize via handles**: Corner drag scales the layer proportionally. The scale factor is computed from the drag delta relative to the opposite corner
- **Both layers use CSS transforms**: Image stays as `<img>` with CSS transform. Points canvas gets wrapped in a div with its own CSS transform for offset/scale
- **Remove the fixed data-coordinate mapping for points**: Instead, the points canvas renders at a fixed internal resolution, and the wrapper div's transform handles positioning/scaling

### 2. `src/components/panels/OverlayControlsPanel.tsx`

- **Add layer selector**: Two toggle buttons at the top ("Image" / "Points") that control which layer's sliders are shown
- **Shared slider set**: Opacity, Scale, Rotation sliders apply to whichever layer is selected
- **Fit/Center/Reset**: Apply to the active layer
- **Accept new props**: `pointsTransform`, `onPointsTransformChange`, `activeLayer`, `onActiveLayerChange`

### 3. `src/components/IndentViewApp.tsx`

- **Add `pointsTransform` state**: New state alongside `overlayTransform` for the points layer
- **Add `activeLayer` state**: `'image' | 'points'`
- **Pass new props** to both `OverlayCanvas` and `OverlayControlsPanel`

### Files changed

| File | Change |
|------|--------|
| `src/components/visualization/OverlayCanvas.tsx` | Add points transform, active layer selection, bounding box handles, resize logic |
| `src/components/panels/OverlayControlsPanel.tsx` | Layer selector toggle, context-aware sliders |
| `src/components/IndentViewApp.tsx` | New state for points transform and active layer |

