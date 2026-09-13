import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(packageRoot, '..', '..', 'roadmap.schema.json');
const target = join(packageRoot, 'skills', 'roadmap-timeliner', 'references', 'roadmap.schema.json');

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
process.stdout.write('Synchronized packaged roadmap schema: ' + target + '\n');
