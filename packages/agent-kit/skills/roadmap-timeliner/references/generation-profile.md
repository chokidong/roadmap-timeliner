# Roadmap JSON generation profile

Use this profile for a new document. The authoritative machine schema is the project's roadmap.schema.json; validate against Draft 2020-12 with date format checking enabled.

## Required document shape

- The top-level object is exactly version 1.0 with one roadmap object.
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

- Default new documents to English locale (`en`), monthly scale, showToday true, and darkMode false unless the request calls for another setting.
- Allowed scales: auto, week, month, quarter. Allowed patterns: solid, diagonal, horizontal, vertical, dot, grid, gradient.
- Use only fillColor for a newly generated per-item color. Do not generate legacy barColor or progressColor.
- Use #RRGGBB colors. Status colors determine bars unless an item has fillColor.
- Milestone label positions are currently supported only as top; when both marker and line colors are supplied, keep them equal.

## Final checks

Validate JSON parsing, schema compliance with date formats, ID uniqueness, references, chronological ranges, and any locked timeline range. Report only checks actually performed. If the user asks for JSON only, respond with one pure JSON object and no Markdown or explanation.
