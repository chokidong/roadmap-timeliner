import { clone, validateDocument, applyOperations } from '@roadmap-timeliner/core';
import type { ApplyResult, PatchOperation, RoadmapDocument, ValidationMode, ValidationResult } from '@roadmap-timeliner/core';
import type { FilePort } from './file-port.js';

export type DocumentSession = {
  documentId: string;
  snapshot: RoadmapDocument;
  sourcePath?: string;
  dirty: boolean;
  mode: ValidationMode;
};

type History = { states: RoadmapDocument[]; index: number; saved: string };

const fingerprint = (document: RoadmapDocument) => JSON.stringify(document);

export class DocumentService {
  private sessions = new Map<string, DocumentSession>();
  private histories = new Map<string, History>();
  private sequence = 0;
  constructor(private readonly files: FilePort) {}

  list(): DocumentSession[] { return Array.from(this.sessions.values()).map(session => clone(session)); }
  get(documentId: string): DocumentSession | undefined { const session = this.sessions.get(documentId); return session && clone(session); }
  create(snapshot: RoadmapDocument, mode: ValidationMode = 'strict'): DocumentSession {
    const validation = validateDocument(snapshot, mode);
    if (!validation.valid) throw new DocumentValidationError(validation);
    return this.openSnapshot(snapshot, undefined, mode, true);
  }
  async open(path: string, mode: ValidationMode = 'compatible'): Promise<DocumentSession> {
    const parsed = JSON.parse(await this.files.read(path)) as unknown;
    const validation = validateDocument(parsed, mode);
    if (!validation.valid) throw new DocumentValidationError(validation);
    return this.openSnapshot(parsed as RoadmapDocument, path, mode, false);
  }
  async reload(documentId: string, discardUnsaved = false): Promise<DocumentSession> {
    const session = this.require(documentId);
    if (session.dirty && !discardUnsaved) throw new UnsavedChangesError(documentId);
    if (!session.sourcePath) throw new Error('Document has no source path.');
    const parsed = JSON.parse(await this.files.read(session.sourcePath)) as unknown;
    const validation = validateDocument(parsed, session.mode);
    if (!validation.valid) throw new DocumentValidationError(validation);
    const reloaded = clone(parsed as RoadmapDocument);
    session.snapshot = reloaded; session.dirty = false;
    this.histories.set(documentId, { states: [clone(reloaded)], index: 0, saved: fingerprint(reloaded) });
    return clone(session);
  }
  validate(documentId: string, mode?: ValidationMode): ValidationResult { const session = this.require(documentId); return validateDocument(session.snapshot, mode ?? session.mode); }
  apply(documentId: string, operations: PatchOperation[]): ApplyResult {
    const session = this.require(documentId);
    const result = applyOperations(session.snapshot, operations);
    if (!result.ok) return result;
    session.snapshot = result.document;
    this.pushHistory(session);
    return result;
  }
  undo(documentId: string): DocumentSession | undefined {
    const session = this.require(documentId), history = this.histories.get(documentId)!;
    if (history.index === 0) return undefined;
    history.index -= 1; session.snapshot = clone(history.states[history.index]); session.dirty = fingerprint(session.snapshot) !== history.saved;
    return clone(session);
  }
  redo(documentId: string): DocumentSession | undefined {
    const session = this.require(documentId), history = this.histories.get(documentId)!;
    if (history.index >= history.states.length - 1) return undefined;
    history.index += 1; session.snapshot = clone(history.states[history.index]); session.dirty = fingerprint(session.snapshot) !== history.saved;
    return clone(session);
  }
  async save(documentId: string, path?: string): Promise<DocumentSession> {
    const session = this.require(documentId), target = path ?? session.sourcePath;
    if (!target) throw new Error('A save path is required.');
    const validation = validateDocument(session.snapshot, session.mode);
    if (!validation.valid) throw new DocumentValidationError(validation);
    await this.files.write(target, `${JSON.stringify(session.snapshot, null, 2)}\n`);
    session.sourcePath = target; session.dirty = false;
    const history = this.histories.get(documentId)!; history.saved = fingerprint(session.snapshot);
    return clone(session);
  }
  private openSnapshot(snapshot: RoadmapDocument, sourcePath: string | undefined, mode: ValidationMode, dirty: boolean): DocumentSession {
    const documentId = `doc-${++this.sequence}`;
    const session = { documentId, snapshot: clone(snapshot), sourcePath, mode, dirty };
    this.sessions.set(documentId, session);
    this.histories.set(documentId, { states: [clone(snapshot)], index: 0, saved: dirty ? '' : fingerprint(snapshot) });
    return clone(session);
  }
  private pushHistory(session: DocumentSession): void {
    const history = this.histories.get(session.documentId)!;
    history.states = history.states.slice(0, history.index + 1); history.states.push(clone(session.snapshot)); history.index += 1;
    session.dirty = fingerprint(session.snapshot) !== history.saved;
  }
  private require(documentId: string): DocumentSession { const session = this.sessions.get(documentId); if (!session) throw new Error(`Document '${documentId}' was not found.`); return session; }
}

export class DocumentValidationError extends Error { constructor(readonly validation: ValidationResult) { super('Document validation failed.'); } }
export class UnsavedChangesError extends Error { constructor(readonly documentId: string) { super('Document has unsaved changes.'); } }
