import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface FilePort {
  read(path: string): Promise<string>;
  write(path: string, text: string): Promise<void>;
}

export class NodeFilePort implements FilePort {
  async read(path: string): Promise<string> { return readFile(path, 'utf8'); }
  async write(path: string, text: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temporary = join(dirname(path), `.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
    try {
      await writeFile(temporary, text, 'utf8');
      await rename(temporary, path);
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  }
}
