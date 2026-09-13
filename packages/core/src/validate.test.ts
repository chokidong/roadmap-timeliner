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
