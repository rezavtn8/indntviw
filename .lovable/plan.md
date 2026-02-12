

# Overlay View — Microscope Image + Data Points

## Overview
Add a new **"Overlay"** view tab (between 3D and Analysis) that lets you upload a microscope image of your sample, then overlay the indentation data points on top. You can pan, scale, and rotate the image to align it with the data, then export the composite figure.

## How It Works

1. **Upload** a microscope image (JPG/PNG) via the sidebar or drag-and-drop onto the canvas
2. The image appears as the background with your colored data points rendered on top
3. **Transform controls** in the sidebar let you adjust:
   - Image position (X/Y offset)
   - Image scale (zoom in/out)
   - Image rotation (degrees)
   - Image opacity (so you can see through to data or vice versa)
4. Point appearance controls: size multiplier, opacity
5. **Export** the composite as PNG/SVG/PDF — reusing the same format/DPI controls from Export Studio

## Architecture

### New view tab
- Add `'overlay'` to the `ViewType` union in `ViewSidebar.tsx` (icon: `Layers`)
- Wire it into `IndentViewApp.tsx` alongside the existing 2D/3D/Analysis/Export views

### New files

**`src/components/visualization/OverlayCanvas.tsx`**
- SVG-based canvas (similar pattern to ExportCanvas)
- Renders an `<image>` element for the background photo
- Renders colored circles for data points on top
- Supports pan/zoom of the entire view (mouse wheel + drag)
- Transform controls apply CSS/SVG transforms to the image layer independently

**`src/components/panels/OverlayControlsPanel.tsx`**
- Sidebar panel with:
  - **Image upload** button (accepts JPG, PNG, WEBP)
  - **Transform** section: X offset, Y offset, Scale (0.1x-10x), Rotation (0-360), Opacity (0-100%)
  - **Points** section: Size multiplier, Opacity
  - **Export** button: Format (PNG/SVG/PDF), dimensions, DPI

### State management
- Overlay state (image URL, transforms) stored locally in `IndentViewApp` via `useState` since it's view-specific and doesn't need to persist across sessions
- Image stored as an object URL from `URL.createObjectURL()` (no database, no base64)

### Changes to existing files

**`src/components/layout/ViewSidebar.tsx`**
- Add `'overlay'` to `ViewType`
- Add new nav item with `Layers` icon labeled "Overlay"

**`src/components/IndentViewApp.tsx`**
- Expand `activeView` state type to include `'overlay'`
- Add `renderContent()` case for overlay view
- Add `renderSidebarControls()` case for overlay controls
- Add overlay-specific state: `overlayImage`, `overlayTransform`

### No changes needed to contexts or types — this is a self-contained view

## Technical Details

### Image handling
- User selects an image file via `<input type="file" accept="image/*">`
- Create object URL with `URL.createObjectURL(file)` 
- Revoke on cleanup or replacement with `URL.revokeObjectURL()`
- Image is rendered as an SVG `<image>` element with transform attributes

### Alignment workflow
The SVG coordinate system matches the data coordinate system (same as ExportCanvas). The image transform controls (offset, scale, rotation) are applied to the image layer only, so the user drags/scales the photo until it aligns with the fixed data point positions.

### Export
The overlay canvas exposes a `exportToDataURL()` method (same pattern as ExportCanvas). The sidebar includes a simple export button that serializes the SVG to PNG/PDF.

