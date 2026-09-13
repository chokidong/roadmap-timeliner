import { describe, expect, it } from 'vitest';
import { applyOperations } from './operations.js';
import type { RoadmapDocument } from './types.js';

const document = (): RoadmapDocument => ({ version: '1.0', roadmap: { id: 'rm-a', title: 'A', statuses: [{ id: 'st-a', name: 'A', color: '#111111', pattern: 'solid', border: 'solid' }], badges: [], categories: [{ id: 'cat-a', name: 'A', color: '#111111', items: [{ id: 'item-a', name: 'A', statusId: 'st-a' }] }, { id: 'cat-b', name: 'B', color: '#222222', items: [] }], milestones: [] } });

describe('applyOperations', () => {
  it('moves an item without recreating it', () => { const result = applyOperations(document(), [{ op: 'move', itemId: 'item-a', categoryId: 'cat-b' }]); expect(result.ok).toBe(true); if (result.ok) expect((result.document.roadmap.categories as any)[1].items[0].id).toBe('item-a'); });
  it('does not partially apply a failing batch', () => { const original = document(); const result = applyOperations(original, [{ op: 'update', itemId: 'item-a', set: { name: 'Changed' } }, { op: 'remove', itemId: 'missing' }]); expect(result.ok).toBe(false); expect((original.roadmap.categories as any)[0].items[0].name).toBe('A'); });
  it('clears references when deleting a status', () => { const result = applyOperations(document(), [{ op: 'delete-status', statusId: 'st-a' }]); expect(result.ok).toBe(true); if (result.ok) expect((result.document.roadmap.categories as any)[0].items[0].statusId).toBeUndefined(); });
});
