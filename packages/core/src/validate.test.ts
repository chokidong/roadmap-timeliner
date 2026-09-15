import { describe, expect, it } from 'vitest';
import { validateDocument } from './validate.js';

const base = () => ({
  version: '1.0' as const,
  roadmap: {
    id: 'rm-test', title: 'Test', statuses: [{ id: 'st-plan', name: 'Planned', color: '#123456', pattern: 'solid', border: 'solid' }], badges: [],
    categories: [{ id: 'cat-work', name: 'Work', color: '#123456', items: [{ id: 'item-one', name: 'One', start: '2028-02-28', end: '2028-02-29', statusId: 'st-plan', link: 'confluence://page/123' }] }],
    milestones: [{ id: 'ms-release', name: 'Release', date: '2028-02-29' }]
  }
});

describe('validateDocument', () => {
  it.each(['strict', 'compatible'] as const)('validates white-background line patterns in %s mode', mode => {
    for (const pattern of ['diagonal-lines', 'horizontal-lines', 'vertical-lines', 'grid-lines']) {
      const document = base();
      Object.assign(document.roadmap.statuses[0], { pattern, progressPattern: pattern });
      expect(validateDocument(document, mode).valid).toBe(true);
    }
    const document = base();
    Object.assign(document.roadmap.statuses[0], { pattern: 'unknown-lines', progressPattern: 'unknown-lines' });
    const paths = validateDocument(document, mode).errors.filter(issue => issue.code === 'INVALID_PATTERN').map(issue => issue.path);
    expect(paths).toContain('/roadmap/statuses/0/pattern');
    expect(paths).toContain('/roadmap/statuses/0/progressPattern');
  });
  it.each(['strict', 'compatible'] as const)('validates layout styles in %s mode', mode => {
    for (const style of ['default', 'card']) {
      expect(validateDocument({ ...base(), roadmap: { ...base().roadmap, style } }, mode).valid).toBe(true);
    }
    expect(validateDocument(base(), mode).valid).toBe(true);
    for (const style of ['cards', '', null, 1, {}]) {
      expect(validateDocument({ ...base(), roadmap: { ...base().roadmap, style } }, mode).errors)
        .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/roadmap/style', code: 'INVALID_STYLE' })]));
    }
  });
  it('accepts an arbitrary link string and leap-day dates', () => expect(validateDocument(base()).valid).toBe(true));
  it('rejects an impossible calendar date', () => { const document = base(); document.roadmap.categories[0].items[0].end = '2028-02-30'; expect(validateDocument(document).errors.some(error => error.code === 'INVALID_DATE')).toBe(true); });
  it('rejects a partial item date', () => { const document = base(); delete (document.roadmap.categories[0].items[0] as Record<string, unknown>).end; expect(validateDocument(document).errors.some(error => error.code === 'DATE_PAIR_REQUIRED')).toBe(true); });
  it('keeps unknown optional fields for compatible imports while strict generation rejects them', () => {
    const document = base() as any; document.roadmap.categories[0].legacyDisplay = 'stripe';
    expect(validateDocument(document, 'compatible').valid).toBe(true);
    expect(validateDocument(document, 'strict').errors.some(error => error.code === 'SCHEMA_ADDITIONALPROPERTIES')).toBe(true);
  });
  it('returns errors instead of throwing for malformed input', () => expect(() => validateDocument({ version: '1.0', roadmap: { categories: 'nope' } })).not.toThrow());
});
