#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { validateDocument } from '@roadmap-timeliner/core';
import { DocumentService, NodeFilePort } from '@roadmap-timeliner/document-service';
import { renderStaticRoadmapHtml, serializeRoadmap } from '@roadmap-timeliner/export';
import { runSetup, type SetupTargetResult } from '@roadmap-timeliner/agent-kit';

const usage = 'Usage: roadmap <validate|inspect|format|export|setup> [path] [outputPath] [--strict|--compatible] [--format json|static-html] [--target all|claude|cursor|codex|antigravity|gemini]';
const [command, path, ...arguments_] = process.argv.slice(2);
const modeFlag = arguments_.find(argument => argument === '--strict' || argument === '--compatible');
const mode = modeFlag === '--strict' ? 'strict' : 'compatible';

async function main(): Promise<void> {
  if (!command || !['validate', 'inspect', 'format', 'export', 'setup'].includes(command)) {
    throw new Error(usage);
  }

  if (command === 'setup') {
    const allArgs = [path, ...arguments_].filter(Boolean);
    const targetIndex = allArgs.indexOf('--target');
    let target: 'all' | 'claude' | 'cursor' | 'codex' | 'antigravity' | 'gemini' = 'all';
    if (targetIndex >= 0 && allArgs[targetIndex + 1]) {
      const val = allArgs[targetIndex + 1];
      if (['all', 'claude', 'cursor', 'codex', 'antigravity', 'gemini'].includes(val)) {
        target = val as any;
      }
    }
    const results = await runSetup({ target });
    for (const res of results) {
      const icon = res.success ? '✔' : '✖';
      process.stdout.write(`${icon} [${res.target}] ${res.message} (${res.path})\n`);
    }
    const hasFailure = results.some((r: SetupTargetResult) => !r.success);
    if (hasFailure) {
      process.exitCode = 1;
    } else {
      process.stdout.write(`\nSetup completed! Please restart your AI client (Claude Desktop, Cursor, Antigravity, etc.) to use Roadmap tools.\n`);
    }
    return;
  }

  if (!path) throw new Error(usage);

  const files = new NodeFilePort();
  if (command === 'validate') {
    const result = validateDocument(JSON.parse(await readFile(path, 'utf8')), mode);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.valid ? 0 : 1;
    return;
  }
  const service = new DocumentService(files);
  const document = await service.open(path, mode);
  if (command === 'inspect') {
    const snapshot = document.snapshot.roadmap;
    const categories = Array.isArray(snapshot.categories) ? snapshot.categories : [];
    const items = categories.flatMap(category => typeof category === 'object' && category && Array.isArray((category as any).items) ? (category as any).items : []);
    process.stdout.write(`${JSON.stringify({ documentId: document.documentId, path: document.sourcePath, title: snapshot.title, categories: categories.length, items: items.length, milestones: Array.isArray(snapshot.milestones) ? snapshot.milestones.length : 0 }, null, 2)}\n`);
    return;
  }
  if (command === 'export') {
    const outputPath = arguments_.find(argument => !argument.startsWith('--'));
    const formatIndex = arguments_.indexOf('--format');
    const format = formatIndex >= 0 ? arguments_[formatIndex + 1] : 'json';
    if (!outputPath || !['json', 'static-html'].includes(format)) throw new Error(usage);
    const content = format === 'static-html' ? renderStaticRoadmapHtml(document.snapshot) : serializeRoadmap(document.snapshot);
    await files.write(outputPath, content);
    process.stdout.write(`${JSON.stringify({ path: outputPath, format, bytes: Buffer.byteLength(content) }, null, 2)}\n`);
    return;
  }
  await service.save(document.documentId, path);
  process.stdout.write(`${JSON.stringify({ path, formatted: true }, null, 2)}\n`);
}

main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
