# Roadmap Timeliner Development Guide

This guide applies specifically to repository development work. The generation, validation, and desktop launch workflows for roadmap JSON are managed by the distributable skill located at `packages/agent-kit/skills/roadmap-timeliner`.

- When modifying editor behavior, refer to `buildTemplate`, `validate`, `getRange`, `renderTimeline`, `mountTimeline`, `materializePatterns`, and `applyThemePreset` in `roadmap.html` as the standard reference.
- The desktop implementation in `roadmap.html` defines supported rendering behavior. Keep the root `roadmap.schema.json`, public interfaces/enums in `packages/core/src/types.ts`, core validation, and the desktop validator aligned. Document format `version: "1.0"` is independent of application/package release versions.
- Strict generation rejects unknown fields. Compatible imports preserve unknown fields but validate all declared fields, including nested settings. Do not weaken known-field validation to accept malformed desktop data.
- When updating data models, synchronize types, validation, and tests in `packages/core`, root `roadmap.schema.json`, agent-kit packaged schema, and the generation profile in the `roadmap-timeliner` skill together.
- Ensure the `agent-kit` build synchronizes the root schema to the skill resources, and verify that the schema and skill reference docs are included in distributions via `npm pack --dry-run`.
- After modifying npm packaging, verify with the sequence: `npm test` → `npm run build --workspace @roadmap-timeliner/agent-kit` → `npm pack --dry-run --workspace @roadmap-timeliner/agent-kit`, checking the presence of `dist`, `SKILL.md`, generation profile, and packaged `roadmap.schema.json`.
- The desktop shell is located in `apps/desktop`, CLI in `packages/cli`, MCP server in `packages/mcp`, and the installable agent skill in `packages/agent-kit`.
- After changes, build relevant packages and verify general changes from the root using `npm test`. `packages/core/src/desktop-contract.test.ts` checks actual desktop templates/validation against the root schema, public enums, and packaged schema. Extend these contract checks when changing fields or supported values.
- For editor rendering changes, run `node_modules/.bin/electron scripts/editor-layout-smoke.cjs` on a desktop-capable host and visually inspect affected combinations. Keep page-level vertical scrolling, horizontal index synchronization, and frozen labels consistent across both styles.
- White line patterns have transparent label backgrounds. Progress layers use the outer bar’s clipping rather than independent corner radii, preventing white seams over solid progress. Verify base/progress pattern combinations at partial and full completion in both styles.
- Update the distributable skill in `packages/agent-kit/skills/roadmap-timeliner`; use the agent-kit build to synchronize the schema copy, not hand-edited packaged schemas.
- When updating skill behavior or generation rules, update `packages/agent-kit/skills/roadmap-timeliner/SKILL.md` or its references, and re-run installer build and packaging checks.
- Do not normalize, delete, or overwrite `roadmap.json` outside the explicit scope of requests, as it may contain user data.
- **Versioning & Publishing Workflow (Release Branch Automation)**:
  - Trigger: Pushing or merging code into the `release` branch automatically bumps the version (`patch`), commits it, creates a Git tag (`vX.Y.Z`), and publishes to npm.
  - Manual verification before merging to `release`: Run `npm test` and `npm pack --dry-run --workspace @roadmap-timeliner/agent-kit`.
  - Infinite loop prevention: Automated version bump commits include `[skip ci]`.
  - CI environment: Ensure `NPM_TOKEN` is configured in GitHub Secrets and Workflow permissions allow read/write (`contents: write`).

