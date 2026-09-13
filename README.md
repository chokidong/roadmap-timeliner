# Roadmap Timeliner

A visual roadmap & timeline editor and npm workspace for editing roadmap JSON with consistent validation rules across Desktop, CLI, and MCP.

## Overview

Roadmap Timeliner provides:
- **Interactive Single-Page Editor (`roadmap.html`)**: JSON import/export, standalone editable HTML export, static HTML fragment copy, and PNG export.
- **Desktop App (`apps/desktop`)**: Native file menus (New, Open, Recent, Save, Save As, Export, Print), custom app icon branding, and an About dialog.
- **Shared Validation & Mutation Core (`packages/core`)**: Unified `strict` and `compatible` JSON schema validation and ID-based batch patch operations.
- **Document Session Service (`packages/document-service`)**: Memory snapshots, dirty tracking, undo/redo, and atomic filesystem saves.
- **Export Package (`packages/export`)**: Headless JSON serialization and clean static HTML exports.
- **CLI (`packages/cli`)**: Terminal commands for inspection, validation, formatting, export, and client setup.
- **Model Context Protocol (MCP) Server (`packages/mcp`)**: Stdio server enabling AI agents (Claude, Cursor, Codex, etc.) to inspect, validate, edit, and export roadmaps.
- **Agent Kit (`packages/agent-kit`)**: Distributable AI agent skill with generation guidelines, reference schemas, and one-click configuration installer.

---

## Getting Started

Requires Node.js 20 or higher.

```sh
npm install
npm test
npm run build
npm run desktop
npm run desktop:roadmap
```

- `npm run desktop` launches the local `roadmap.html` in the Roadmap Timeliner app window.
- `npm run desktop:roadmap` automatically loads `./roadmap.json` once the window is ready.
- You can also load any custom file: `npm run desktop -- /path/to/roadmap.json`.

### Desktop installer builds

Create an installer from a matching operating system:

```sh
# macOS: apps/desktop/release/*.dmg
npm run dist:mac --workspace @roadmap-timeliner/desktop

# Windows: apps/desktop/release/*Setup*.exe
npm run dist:win --workspace @roadmap-timeliner/desktop
```

The repository's GitHub Actions workflow can build both installers and attach them to a GitHub Release whenever a `desktop-v*` tag is pushed. See `.github/workflows/desktop-release.yml`.

---

## CLI

```sh
# Inspect title, categories, items, statuses, and milestones
npm run roadmap -- inspect ./roadmap.json

# Validate against JSON schema (use --strict for AI drafts, default is --compatible)
npm run roadmap -- validate ./roadmap.json --strict

# Format JSON with 2-space indentation
npm run roadmap -- format ./roadmap.json

# Export portable static HTML document
npm run roadmap -- export ./roadmap.json ./roadmap.html --format static-html

# One-click setup for AI clients (Claude Desktop, Cursor, Codex)
npm run roadmap -- setup [--target all|claude|cursor|codex]
```

---

## MCP Server

Run the stdio MCP server directly or via package:

```sh
node packages/mcp/dist/index.js
# or via npx
npx -y @roadmap-timeliner/mcp
```

### Available Tools:
1. `inspect_roadmap`: Read roadmap metadata, categories, item IDs, statuses, and milestones.
2. `validate_roadmap`: Check schema validity with `strict` or `compatible` modes.
3. `load_roadmap_json`: Validate generated or imported JSON before saving.
4. `preview_roadmap_changes`: Preview proposed batch changes using ID-based operations.
5. `apply_roadmap_changes`: Apply verified modifications atomically.
6. `create_roadmap`: Validate and write a complete roadmap to disk.
7. `export_roadmap`: Export as clean JSON or standalone static HTML.

---

## AI One-Click Setup & Skills

Quickly register the Roadmap Timeliner MCP server and skills with your preferred AI coding environment:

```sh
# Automatic setup for all detected environments (Claude, Cursor, Codex, Antigravity / Gemini)
npm run roadmap -- setup

# Or configure a specific target:
npm run roadmap -- setup --target claude
npm run roadmap -- setup --target cursor
npm run roadmap -- setup --target codex
npm run roadmap -- setup --target antigravity   # or --target gemini
```

After running setup, restart your client to enable Roadmap Timeliner tools immediately.

---

## Export Options

- **Export HTML**: Generates a self-contained, editable single-page application with your roadmap data embedded. Opening this file in any modern web browser restores the full interactive editor.
- **Copy HTML**: Copies a static, styled HTML fragment (header, legend, timeline, CSS) directly to your clipboard, ideal for embedding in Confluence, Notion, or internal dashboards.
- **Export PNG**: Renders the complete roadmap canvas (including custom stripes, progress bars, milestones, and theme colors) to a high-resolution PNG image.
- **Export PDF / Print**: Available via the desktop app's native File menu (`Export PDF...`, `Print...`).

---

## Architecture & Specifications

For more in-depth architecture and development guidelines:
- [ARCHITECTURE.md](ARCHITECTURE.md): Monorepo packages, separation of concerns, and boundaries.
- [PLAN.md](PLAN.md): Product scope, user scenarios, and feature roadmap.
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md): Current completion status and verification log.
- [AGENTS.md](AGENTS.md): Repository development rules for AI coding assistants.
