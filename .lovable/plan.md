

# Unify the Toolbar

## The Problem
Right now there are **two separate bars** with overlapping actions:
- The **header bar** has: Clear, point count, Reset, Edit Mode, Undo/Redo, Add Point, Delete, and Export
- The **toolbar below the file tabs** has: zone tools + Open Project, Save Project, and a second Clear Workspace button

This is cluttered and confusing -- two "Clear" buttons, actions scattered across two rows.

## The Solution
Merge everything into **one unified toolbar** below the file tabs, and slim down the header to just the app title and branding. The toolbar will be organized into logical groups separated by subtle dividers:

```text
| [Zone tools...] | [Edit Mode] [Undo] [Redo] [Add] [Delete N] | [Export v] | --- spacer --- | [Open] [Save] | [Clear] |
```

### Layout groups (left to right):
1. **View tools** -- zone drawing tools (when in 2D or Export/Figure view)
2. **Editing tools** -- Edit Mode toggle, Undo/Redo, Add Point, Delete selected, Reset (only when data is loaded)
3. **Data export** -- the Export dropdown (CSV, Excel, Screenshot, PDF)
4. **Spacer** pushes project actions to the right
5. **Project actions** -- Open Project, Save Project (icon-only with tooltips)
6. **Clear workspace** -- separated by a divider (icon-only, destructive)

### What changes in the header
The header shrinks to just: **"IndentView" title + version badge + point count**. All action buttons move down to the toolbar.

---

## Technical Details

### 1. `src/components/layout/AppToolbar.tsx`
- Accept new props for editing controls and export:
  - `isEditing`, `onToggleEditing`, `canUndo`, `canRedo`, `onUndo`, `onRedo`
  - `hasChanges`, `onReset`, `onAddPoint`
  - `selectedPointCount`, `onBulkDelete`
  - `data`, `visualizationRef`, `selectedProperty` (for ExportControls)
- Render all action groups in one row with vertical `Separator` dividers between logical groups
- Keep project actions (Open/Save/Clear) on the right as they are now

### 2. `src/components/IndentViewApp.tsx`
- **Header** (lines 400-485): Strip out all buttons -- keep only the title, version badge, and point count
- **`renderToolbar()`**: Pass editing state, undo/redo handlers, export props, etc. into `AppToolbar` so it renders everything in one bar
- Remove the duplicate `AlertDialog` for Clear Workspace from the header since it already exists in `AppToolbar`

### 3. No new files or dependencies needed

