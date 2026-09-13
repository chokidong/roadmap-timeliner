# Implementation Status

Last updated: 2026-09-13

This document distinguishes between currently implemented features in the working tree and future milestones. The product scope centers on the generation, editing, storage, and export of roadmap JSON. External publishing/synchronization (e.g., Confluence) and live concurrent conflict resolution are planned for future phases.

---

## Completed Work

### 1. Core Editor Stabilization (`roadmap.html`)
- On an empty canvas, clicking "Add your first item" creates an initial category and opens the item creation form.
- Enhanced in-app `validate()` to check for duplicate IDs, valid status/badge references, real date existence, start/end date pairs and ordering, and progress percentage bounds (0–100).
- UI prevents duplicate IDs, single-ended dates, and out-of-range progress values prior to saving.
- Deleting a status cleans up referencing `statusId` fields on associated items.
- Retains unknown optional fields during compatible imports to preserve valid legacy or extended data.
- Sanitizes URLs to allow only safe schemes (`http:`, `https:`, `mailto:`) in rendered hyperlinks while preserving raw input in JSON.

### 2. Export and Printing
- **Standalone HTML Export**: Self-contained HTML file embedding editor code and JSON state for browser-based offline editing.
- **Copy Static HTML**: Copies a static, styled HTML fragment with title, legend, timeline, and styles (without edit event handlers) for Confluence/wiki embedding.
- **Image & Document Exports**: High-resolution PNG export supporting repeating linear gradient stripes, progress bars, and custom milestones. Desktop File menu provides A4 landscape PDF export and system printing.

### 3. Shared Monorepo Packages
- **`packages/core`**: Roadmap TypeScript types, strict/compatible JSON validation, and ID-based batch patch operations (clone → apply → validate → atomic swap).
- **`packages/document-service`**: File reading, memory snapshots, dirty tracking, undo/redo, and atomic filesystem writes.
- **`packages/export`**: Headless JSON serialization and static HTML generation for CLI and MCP tools.
- **`packages/cli`**: Binary commands `roadmap inspect`, `validate`, `format`, `export`, and `setup`.
- **`packages/mcp`**: Stdio Model Context Protocol server exposing `inspect_roadmap`, `validate_roadmap`, `load_roadmap_json`, `preview_roadmap_changes`, `apply_roadmap_changes`, `create_roadmap`, and `export_roadmap`.
- **`packages/agent-kit`**: Codex/Cursor/Claude agent skill with reference schemas and one-click configuration installer.
- **`apps/desktop`**: Electron desktop shell with native menus, recent file tracking, uncommitted change prompts, and custom branding/icons.

### 4. Quality Verification
- 15/15 unit and integration tests passing via Vitest.
- Headless stdio smoke test passing for the MCP server.
- All TypeScript packages compile cleanly under npm workspaces.
- Automated schema synchronization verified from root `roadmap.schema.json` into the `agent-kit` skill directory and tarball.
- Verified offscreen canvas rasterization of diagonal stripes and progress bars via headless Electron test.

---

## Future Roadmap

### High Priority
- Integrate common `document-service` undo/redo directly into all legacy inline editor paths.
- Add an authenticated local IPC bridge connecting the running Electron editor instance directly to the MCP server (allowing AI to query and update the active window in real-time).
- Package and code-sign desktop executables for macOS (.dmg), Windows (.msi/.exe), and Linux (.AppImage/.deb).
