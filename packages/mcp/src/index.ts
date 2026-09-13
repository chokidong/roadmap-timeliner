#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { applyOperations, validateDocument } from '@roadmap-timeliner/core';
import { NodeFilePort } from '@roadmap-timeliner/document-service';
import { renderStaticRoadmapHtml, serializeRoadmap } from '@roadmap-timeliner/export';

const files = new NodeFilePort();
const appliedRequests = new Map<string, Record<string, unknown>>();
const server = new McpServer({ name: 'roadmap-timeliner', version: '0.1.0' });
const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }], structuredContent: value as Record<string, unknown> });
const failure = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true });

server.registerTool('validate_roadmap', {
  title: 'Validate roadmap JSON', description: 'Validate a roadmap file without modifying it.', inputSchema: { path: z.string(), mode: z.enum(['strict', 'compatible']).default('compatible') }
}, async ({ path, mode }) => {
  try { return text(validateDocument(JSON.parse(await files.read(path)), mode)); } catch (error) { return failure(error instanceof Error ? error.message : String(error)); }
});

server.registerTool('inspect_roadmap', {
  title: 'Inspect roadmap', description: 'Read roadmap title, categories, items, statuses, and milestones.', inputSchema: { path: z.string() }
}, async ({ path }) => {
  try {
    const document = JSON.parse(await files.read(path));
    const roadmap = document.roadmap ?? {};
    const categories = Array.isArray(roadmap.categories) ? roadmap.categories : [];
    return text({ path, title: roadmap.title, statuses: roadmap.statuses ?? [], categories: categories.map((category: any) => ({ id: category.id, name: category.name, items: category.items ?? [] })), milestones: roadmap.milestones ?? [] });
  } catch (error) { return failure(error instanceof Error ? error.message : String(error)); }
});

server.registerTool('apply_roadmap_changes', {
  title: 'Apply roadmap changes', description: 'Apply ID-based operations to a roadmap file and save it after validation. Reusing requestId returns the original result without applying again.', inputSchema: { path: z.string(), operations: z.array(z.any()), requestId: z.string().min(1).optional() }
}, async ({ path, operations, requestId }) => {
  try {
    const requestKey = requestId ? `${path}\u0000${requestId}` : undefined;
    const previous = requestKey && appliedRequests.get(requestKey);
    if (previous) return text({ ...previous, duplicate: true });
    const original = JSON.parse(await files.read(path));
    const result = applyOperations(original, operations as any);
    if (!result.ok) return text({ ok: false, issues: result.issues });
    const validation = validateDocument(result.document, 'compatible');
    if (!validation.valid) return text({ ok: false, issues: validation.errors });
    await files.write(path, `${JSON.stringify(result.document, null, 2)}\n`);
    const response = { ok: true, summary: result.summary, warnings: validation.warnings, path };
    if (requestKey) appliedRequests.set(requestKey, response);
    return text(response);
  } catch (error) { return failure(error instanceof Error ? error.message : String(error)); }
});

server.registerTool('load_roadmap_json', {
  title: 'Validate loaded roadmap JSON', description: 'Validate JSON supplied by an AI or user before it is saved to a file.', inputSchema: { document: z.unknown(), mode: z.enum(['strict', 'compatible']).default('strict') }
}, async ({ document, mode }) => {
  const validation = validateDocument(document, mode);
  if (!validation.valid) return text({ ok: false, issues: validation.errors, warnings: validation.warnings });
  const roadmap = (document as any).roadmap;
  return text({ ok: true, title: roadmap.title, categories: roadmap.categories.length, warnings: validation.warnings });
});

server.registerTool('export_roadmap', {
  title: 'Export roadmap file', description: 'Export a roadmap as JSON or portable static HTML to an explicit output path.', inputSchema: { path: z.string(), outputPath: z.string(), format: z.enum(['json', 'static-html']) }
}, async ({ path, outputPath, format }) => {
  try {
    const document = JSON.parse(await files.read(path));
    const validation = validateDocument(document, 'compatible');
    if (!validation.valid) return text({ ok: false, issues: validation.errors });
    const content = format === 'json' ? serializeRoadmap(document) : renderStaticRoadmapHtml(document);
    await files.write(outputPath, content);
    return text({ ok: true, path: outputPath, format, mimeType: format === 'json' ? 'application/json' : 'text/html', bytes: Buffer.byteLength(content), warnings: validation.warnings });
  } catch (error) { return failure(error instanceof Error ? error.message : String(error)); }
});

server.registerTool('preview_roadmap_changes', {
  title: 'Preview roadmap changes', description: 'Validate ID-based changes and return their summary without writing the roadmap file.', inputSchema: { path: z.string(), operations: z.array(z.any()) }
}, async ({ path, operations }) => {
  try {
    const original = JSON.parse(await files.read(path));
    const result = applyOperations(original, operations as any);
    if (!result.ok) return text({ ok: false, issues: result.issues });
    const validation = validateDocument(result.document, 'compatible');
    return text({ ok: validation.valid, summary: result.summary, errors: validation.errors, warnings: validation.warnings });
  } catch (error) { return failure(error instanceof Error ? error.message : String(error)); }
});

server.registerTool('create_roadmap', {
  title: 'Create roadmap file', description: 'Strictly validate a new roadmap JSON document and save it to the explicit path.', inputSchema: { path: z.string(), document: z.unknown() }
}, async ({ path, document }) => {
  try {
    const validation = validateDocument(document, 'strict');
    if (!validation.valid) return text({ ok: false, issues: validation.errors });
    await files.write(path, `${JSON.stringify(document, null, 2)}\n`);
    return text({ ok: true, path, warnings: validation.warnings });
  } catch (error) { return failure(error instanceof Error ? error.message : String(error)); }
});

await server.connect(new StdioServerTransport());
