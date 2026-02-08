

# Save and Load Workspace as a File

## What This Does
Adds **Save Project** and **Open Project** buttons to the toolbar so you can download your entire workspace (all open files, zones, treatment groups, settings) as a single `.indentview` file, and later reload it -- even on a different computer or browser.

## How It Will Work

1. **Save Project** -- Downloads a `.indentview` file (JSON format compressed with JSZip) containing:
   - All open file tabs with their full data
   - Zones you created on each file
   - Treatment groups and their assignments
   - Active tab, selected property, color scheme, and range settings

2. **Open Project** -- A file picker lets you select a `.indentview` file and restores the entire workspace exactly as it was when saved.

3. Both buttons will appear in the top toolbar alongside the existing "Clear Workspace" button.

---

## Technical Details

### 1. New utility: `src/utils/projectFileService.ts`
- **`saveProjectToFile(workspace)`** -- Serializes the `PersistedWorkspace` object to JSON, compresses it with JSZip (already installed), and triggers a browser download as `MyProject_2026-02-08.indentview`.
- **`loadProjectFromFile(file)`** -- Reads the uploaded `.indentview` file, decompresses it, validates the JSON structure and version, and returns a `PersistedWorkspace` object.
- Includes version checking so future format changes remain backward-compatible.

### 2. Update `src/contexts/SessionContext.tsx`
- Add two new actions to the context:
  - **`saveProjectFile()`** -- Gathers current state into a `PersistedWorkspace` and calls `saveProjectToFile()`.
  - **`loadProjectFile(file: File)`** -- Calls `loadProjectFromFile()`, then feeds the result into the existing `handleWorkspaceLoaded()` logic to restore all state.
- Expose both actions in the context value.

### 3. Update `src/components/layout/AppToolbar.tsx`
- Add a **Save Project** button (download icon) that calls `saveProjectFile()`.
- Add an **Open Project** button (folder-open icon) with a hidden file input that accepts `.indentview` files and calls `loadProjectFile()`.
- Both buttons sit next to the existing "Clear Workspace" button for a clean layout.

### 4. File format
- Extension: `.indentview`
- Contents: A ZIP archive containing a single `workspace.json` file (the serialized `PersistedWorkspace`).
- Compression keeps file sizes manageable even with large datasets (thousands of indentation points across multiple files).

