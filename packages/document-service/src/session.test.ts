import { describe, expect, it } from 'vitest';
import { DocumentService, UnsavedChangesError } from './session.js';
import type { FilePort } from './file-port.js';

const fixture = () => ({ version: '1.0' as const, roadmap: { id: 'rm-a', title: 'A', statuses: [], badges: [], categories: [{ id: 'cat-a', name: 'A', color: '#111111', items: [{ id: 'item-a', name: 'A' }] }], milestones: [] } });
class MemoryFiles implements FilePort { files = new Map<string, string>(); async read(path: string) { const value = this.files.get(path); if (!value) throw new Error('Missing'); return value; } async write(path: string, text: string) { this.files.set(path, text); } }

describe('DocumentService', () => {
  it('tracks dirty state through apply, save, undo and redo', async () => {
    const files = new MemoryFiles(), service = new DocumentService(files), session = service.create(fixture());
    service.apply(session.documentId, [{ op: 'update', itemId: 'item-a', set: { name: 'Changed' } }]); expect(service.get(session.documentId)?.dirty).toBe(true);
    await service.save(session.documentId, '/roadmap.json'); expect(service.get(session.documentId)?.dirty).toBe(false);
    service.apply(session.documentId, [{ op: 'update', itemId: 'item-a', set: { name: 'Again' } }]); service.undo(session.documentId); expect(service.get(session.documentId)?.dirty).toBe(false);
    service.redo(session.documentId); expect(service.get(session.documentId)?.dirty).toBe(true);
  });
  it('keeps the current snapshot when reload is refused', async () => {
    const files = new MemoryFiles(), service = new DocumentService(files); files.files.set('/roadmap.json', JSON.stringify(fixture()));
    const session = await service.open('/roadmap.json'); service.apply(session.documentId, [{ op: 'update', itemId: 'item-a', set: { name: 'Changed' } }]);
    await expect(service.reload(session.documentId)).rejects.toBeInstanceOf(UnsavedChangesError);
    expect((service.get(session.documentId)?.snapshot.roadmap.categories as any)[0].items[0].name).toBe('Changed');
  });
});
