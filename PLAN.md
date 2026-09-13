# Roadmap Timeliner — Requirements and Planning

Status: Vertical feature slice complete (2026-09-13). Primary scope focuses on roadmap creation, editing, validation, and export across Desktop, CLI, and MCP.

---

## 1. Product Goals and Scenarios

Expand the visual timeline editor into an accessible tool on macOS, Windows, and Linux. Establish roadmap JSON as the shared data contract between human graphical interaction and autonomous AI agent operations.

| Scenario | Input | Expected Outcome |
| --- | --- | --- |
| *"Build a roadmap from this data"* | Meeting notes, pasted markdown table, or document | Verified JSON draft and visual timeline; uncertain dates left omitted or preserved in assumptions |
| *"Update auth improvement end date to March 31"* | Active document, natural language request | ID-targeted update preserving existing fields, IDs, and ordering |
| *"Save to our shared network folder"* | Target path, modified snapshot | Atomic write to disk with immediate UI feedback |
| *"Export a timeline for documentation"* | Current roadmap snapshot | Self-contained editable HTML, static HTML fragment, PNG, or PDF |
| *"Set up MCP tools in my Claude/Cursor environment"* | `roadmap setup` command | One-click automatic configuration of MCP servers and Codex skills |

---

## 2. Requirements Specification

### Editing and Data Contracts
- Maintain support for categories, timeline items, status legends, badges, milestones, search filter, scale switching, undo/redo, i18n (EN/KO), and dark mode.
- Maintain intentional theme behavior where preset changes apply coordinated palette colors across categories and items.
- File operations: New Roadmap, Open, Recent Files, Save, Save As, Reload from Disk.
- Strict validation for new AI drafts; compatible validation for existing files to ensure backward compatibility and preserve custom metadata.
- Date handling: Valid calendar days, start/end pair requirements, ordering (`start <= end`), and bounds checks.
- Hyperlinks: Sanitized on display to allow only secure web schemes (`http:`, `https:`, `mailto:`).

### Desktop App Features
- Cross-platform Electron shell hosting the rich single-page canvas editor with secure IPC isolation.
- Native menus matching OS conventions (New, Open, Save, Save As, Export HTML/PDF, Print, About).
- Confirmation dialogs guarding against unsaved data loss on window close, reload, or file open.
- Native branding: Custom application icon (`.icns` / `.png`) and custom About dialog.

### AI Integration & Tool Routing
- **MCP Stdio Server**: Exposes structured JSON-RPC tools (`inspect_roadmap`, `validate_roadmap`, `load_roadmap_json`, `preview_roadmap_changes`, `apply_roadmap_changes`, `create_roadmap`, `export_roadmap`).
- **CLI Commands**: Direct command-line utility for CI/CD, scripting, and offline inspection.
- **Agent Skill**: Installable skill (`packages/agent-kit/skills/roadmap-timeliner`) with system instructions, reference schemas, and generation profiles.
- **Setup Command**: Automated configuration merger for Claude Desktop (`claude_desktop_config.json`), Cursor (`mcp.json`), and Codex skills.
