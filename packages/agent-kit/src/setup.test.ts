import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeMcpConfig, runSetup, getClaudeConfigPath, getCursorConfigPath, getCodexSkillPath } from './setup.js';

describe('setup module', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'setup-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('merges mcp config into a new file', async () => {
    const configPath = join(tempDir, 'test_mcp.json');
    await mergeMcpConfig(configPath, 'roadmap', { command: 'npx', args: ['-y', '@roadmap-timeliner/mcp'] });

    const content = JSON.parse(await readFile(configPath, 'utf8'));
    expect(content.mcpServers).toBeDefined();
    expect(content.mcpServers.roadmap).toEqual({
      command: 'npx',
      args: ['-y', '@roadmap-timeliner/mcp']
    });
  });

  it('merges mcp config preserving existing servers', async () => {
    const configPath = join(tempDir, 'test_mcp.json');
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          existing: { command: 'node', args: ['other.js'] }
        }
      })
    );

    await mergeMcpConfig(configPath, 'roadmap', { command: 'npx', args: ['-y', '@roadmap-timeliner/mcp'] });

    const content = JSON.parse(await readFile(configPath, 'utf8'));
    expect(content.mcpServers.existing).toEqual({ command: 'node', args: ['other.js'] });
    expect(content.mcpServers.roadmap).toEqual({ command: 'npx', args: ['-y', '@roadmap-timeliner/mcp'] });
  });

  it('runs setup for all targets in custom directory', async () => {
    const results = await runSetup({
      homeDir: tempDir,
      target: 'all'
    });

    expect(results.length).toBe(5);
    const claudeResult = results.find(r => r.target === 'claude');
    const cursorResult = results.find(r => r.target === 'cursor');
    const codexResult = results.find(r => r.target === 'codex');
    const agyResults = results.filter(r => r.target === 'antigravity');

    expect(claudeResult?.success).toBe(true);
    expect(cursorResult?.success).toBe(true);
    expect(codexResult?.success).toBe(true);
    expect(agyResults.length).toBe(2);
    expect(agyResults[0]?.success).toBe(true);
    expect(agyResults[1]?.success).toBe(true);

    const claudeContent = JSON.parse(await readFile(claudeResult!.path, 'utf8'));
    expect(claudeContent.mcpServers.roadmap).toBeDefined();

    const cursorContent = JSON.parse(await readFile(cursorResult!.path, 'utf8'));
    expect(cursorContent.mcpServers.roadmap).toBeDefined();

    const agyContent = JSON.parse(await readFile(agyResults[0]!.path, 'utf8'));
    expect(agyContent.mcpServers.roadmap).toBeDefined();

    const skillContent = await readFile(join(agyResults[1]!.path, 'SKILL.md'), 'utf8');
    expect(skillContent).toContain('roadmap-timeliner');
  });

  it('runs setup specifically for antigravity target', async () => {
    const results = await runSetup({
      homeDir: tempDir,
      target: 'antigravity'
    });

    expect(results.length).toBe(2);
    expect(results.every(r => r.success)).toBe(true);
    expect(results.every(r => r.target === 'antigravity')).toBe(true);

    const agyConfig = JSON.parse(await readFile(results[0].path, 'utf8'));
    expect(agyConfig.mcpServers.roadmap).toEqual({
      command: 'npx',
      args: ['-y', '@roadmap-timeliner/mcp']
    });
  });
});
