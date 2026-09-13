import type { JsonObject, RoadmapDocument } from '@roadmap-timeliner/core';

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]!));

export function serializeRoadmap(document: RoadmapDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** A portable, non-interactive HTML export for headless CLI/MCP use. */
export function renderStaticRoadmapHtml(document: RoadmapDocument): string {
  const roadmap = document.roadmap;
  const categories = Array.isArray(roadmap.categories) ? roadmap.categories as JsonObject[] : [];
  const rows = categories.map(category => {
    const items = Array.isArray(category.items) ? category.items as JsonObject[] : [];
    const itemRows = items.length ? items.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.start)}</td><td>${escapeHtml(item.end)}</td><td>${escapeHtml(item.progress ?? '')}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No items</td></tr>';
    return `<section><h2><span style="background:${escapeHtml(category.color || '#94A3B8')}"></span>${escapeHtml(category.name)}</h2><table><thead><tr><th>Item</th><th>Start</th><th>End</th><th>Progress</th></tr></thead><tbody>${itemRows}</tbody></table></section>`;
  }).join('');
  const title = escapeHtml(roadmap.title || 'Roadmap');
  const subtitle = roadmap.subtitle ? `<p class="subtitle">${escapeHtml(roadmap.subtitle)}</p>` : '';
  return `<!doctype html><html lang="${escapeHtml(roadmap.locale || 'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} - Roadmap Timeliner</title><style>body{font-family:ui-sans-serif,system-ui,sans-serif;color:#1f2937;margin:40px;max-width:1100px}h1{margin-bottom:4px}.subtitle{color:#6b7280;margin-top:0}section{margin-top:30px}h2{font-size:17px}h2 span{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #e5e7eb}th{background:#f8fafc}.empty{color:#94a3b8;font-style:italic}</style></head><body><h1>${title}</h1>${subtitle}${rows || '<p class="empty">No categories</p>'}</body></html>`;
}
