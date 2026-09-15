# Roadmap JSON generation profile

Use this profile for a new document. The authoritative machine schema is [the packaged desktop document schema](roadmap.schema.json), synchronized from the repository root; validate against Draft 2020-12 with date format checking enabled.

## Required document shape

- The top-level object is exactly version `1.0` with one roadmap object. This is the document format version, independent of the desktop application/package release.
- A roadmap requires id, title, statuses, badges, categories, and milestones. Required collections are arrays, including empty ones.
- Categories contain their items; do not create a top-level items array or use categoryId on items.
- Statuses define id, name, color, pattern, and border. A badge is either a shape with shape or text with text, plus id, type, and a solid color object.

## Data integrity

- IDs use letters, digits, hyphens, and underscores, and start with a letter or digit. Keep category and item IDs globally unique; use distinct IDs within statuses, badges, and milestones.
- Every statusId and badge reference must point to a defined object.
- Dates are real YYYY-MM-DD dates. An item has both start and end or neither; when present, start is no later than end.
- rangeLocked true requires both roadmap range dates. Do not set dates, progress, completion, links, or ownership facts that the source does not establish.
- Progress is an integer from 0 through 100. A completed item should have progress 100; omit unknown progress rather than assigning zero.
- Preserve material uncertainty in roadmap.metadata.assumptions. Undated items are valid but display without a timeline bar.

## Rendering conventions

- Optional roadmap.style is `default` (existing layout) or `card` (numbered category cards with a distinct date index on a plain background). Omission means `default`. This is independent of roadmap.theme and darkMode; preserve it when editing.

- Default new documents to English locale (`en`), monthly scale, showToday true, and darkMode false unless the request calls for another setting.
- Allowed scales: auto, week, month, quarter. Allowed patterns: solid, diagonal, horizontal, vertical, dot, grid, gradient, diagonal-lines, horizontal-lines, vertical-lines, grid-lines. The `-lines` variants use a white background with thin colored lines and apply to both pattern and progressPattern; existing filled variants remain unchanged.
- Use only fillColor for a newly generated per-item color. Do not generate legacy barColor or progressColor.
- Use #RRGGBB colors. Color precedence for generated data is `item.fillColor`, then `status.color`, then `category.color`. For `-lines` patterns this is the line color; the background stays white, including in dark mode.
- `status.progressPattern` defaults to `status.pattern` when omitted. Set it explicitly to `solid` for a solid progress area over a white line-pattern base. Progress uses a darker shade of the resolved item color. Labels have no background; the outer bar clips progress corners consistently in both styles.
- Both styles use page-level vertical scrolling, with a sticky date index and horizontal timeline scrolling. Do not generate scroll or corner-radius settings.
- Milestone label position is `top`. `marker.shape` uses the schema shape enum, `marker.size` must be positive, and `line.style` is solid, dashed, or dotted. The renderer uses `line.color` when present and otherwise falls back to `marker.color`. The desktop color control writes matching marker and line colors.
- Theme presets are default, violet, ocean, forest, sunset, macaron, rainbow, darkchic. `theme.override` currently accepts only an empty object.
- Unknown fields are preserved in compatible imports. Known fields, including nested marker/line settings, still require valid types and values. Strict generation rejects unknown fields.

## Final checks

Validate JSON parsing, schema compliance with date formats, ID uniqueness, references, chronological ranges, and any locked timeline range. Report only checks actually performed. If the user asks for JSON only, respond with one pure JSON object and no Markdown or explanation.
