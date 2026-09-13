import { describe, expect, it } from 'vitest';
import { renderStaticRoadmapHtml, serializeRoadmap } from './index.js';

const fixture = () => ({ version: '1.0' as const, roadmap: { id: 'rm-a', title: '<Roadmap>', statuses: [], badges: [], categories: [{ id: 'cat-a', name: 'Core', color: '#123456', items: [{ id: 'item-a', name: '<API>', start: '2026-01-01', end: '2026-01-31', progress: 20 }] }], milestones: [] } });

describe('export', () => {
  it('serializes a JSON document with a trailing newline', () => expect(serializeRoadmap(fixture())).toMatch(/\n$/));
  it('escapes data in standalone static HTML', () => {
    const html = renderStaticRoadmapHtml(fixture());
    expect(html).toContain('&lt;Roadmap&gt;');
    expect(html).toContain('&lt;API&gt;');
    expect(html).not.toContain('<API>');
  });
});
