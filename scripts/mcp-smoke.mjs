import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['packages/mcp/dist/index.js'],
  cwd: process.cwd(),
  stderr: 'pipe'
});

let stderr = '';
transport.stderr?.on('data', chunk => { stderr += String(chunk); });

const client = new Client({ name: 'roadmap-mcp-smoke', version: '0.1.0' });
let temporaryDirectory;
try {
  await client.connect(transport);
  const tools = await client.listTools();
  const required = ['inspect_roadmap', 'validate_roadmap', 'preview_roadmap_changes', 'apply_roadmap_changes', 'create_roadmap', 'load_roadmap_json', 'export_roadmap'];
  const names = tools.tools.map(tool => tool.name);
  if (!required.every(name => names.includes(name))) throw new Error(`Missing MCP tools: ${required.filter(name => !names.includes(name)).join(', ')}`);

  const preview = await client.callTool({
    name: 'preview_roadmap_changes',
    arguments: { path: 'roadmap.json', operations: [{ op: 'update', itemId: 'missing-item', set: { name: 'Must not write' } }] }
  });
  if (!String(preview.content?.[0]?.text).includes('ITEM_NOT_FOUND')) throw new Error('Preview did not report the invalid target item.');

  temporaryDirectory = await mkdtemp(join(tmpdir(), 'roadmap-mcp-'));
  const roadmapPath = join(temporaryDirectory, 'roadmap.json');
  const htmlPath = join(temporaryDirectory, 'roadmap.html');
  await writeFile(roadmapPath, JSON.stringify({ version: '1.0', roadmap: { id: 'rm-smoke', title: 'Smoke', statuses: [], badges: [], categories: [{ id: 'cat-smoke', name: 'Core', color: '#123456', items: [{ id: 'item-smoke', name: 'Before' }] }], milestones: [] } }));
  const change = { name: 'apply_roadmap_changes', arguments: { path: roadmapPath, requestId: 'same-request', operations: [{ op: 'update', itemId: 'item-smoke', set: { name: 'After' } }] } };
  const applied = await client.callTool(change);
  const duplicate = await client.callTool(change);
  if (!String(applied.content?.[0]?.text).includes('"ok": true') || !String(duplicate.content?.[0]?.text).includes('"duplicate": true')) throw new Error('Request idempotency check failed.');
  const exported = await client.callTool({ name: 'export_roadmap', arguments: { path: roadmapPath, outputPath: htmlPath, format: 'static-html' } });
  if (!String(exported.content?.[0]?.text).includes('"ok": true') || !(await readFile(htmlPath, 'utf8')).includes('After')) throw new Error('MCP export check failed.');
  process.stdout.write('MCP smoke test passed.\n');
} catch (error) {
  const detail = stderr ? `\nMCP stderr:\n${stderr}` : '';
  throw new Error(`${error instanceof Error ? error.message : String(error)}${detail}`);
} finally {
  await transport.close().catch(() => undefined);
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
}
