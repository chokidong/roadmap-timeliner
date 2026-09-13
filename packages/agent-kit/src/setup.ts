import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';

export interface SetupOptions {
  homeDir?: string;
  platformName?: NodeJS.Platform;
  target?: 'all' | 'claude' | 'cursor' | 'codex' | 'antigravity' | 'gemini';
  mcpCommand?: string;
  mcpArgs?: string[];
}

export interface SetupTargetResult {
  target: 'claude' | 'cursor' | 'codex' | 'antigravity' | 'gemini';
  path: string;
  success: boolean;
  message: string;
}

export function getClaudeConfigPath(home: string, currentPlatform: NodeJS.Platform = platform()): string {
  if (currentPlatform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  if (currentPlatform === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    return join(appData, 'Claude', 'claude_desktop_config.json');
  }
  return join(home, '.config', 'Claude', 'claude_desktop_config.json');
}

export function getCursorConfigPath(home: string): string {
  return join(home, '.cursor', 'mcp.json');
}

export function getCodexSkillPath(home: string): string {
  return process.env.CODEX_HOME
    ? join(process.env.CODEX_HOME, 'skills', 'roadmap-timeliner')
    : join(home, '.codex', 'skills', 'roadmap-timeliner');
}

export function getAntigravityMcpConfigPath(home: string): string {
  return join(home, '.gemini', 'config', 'mcp_config.json');
}

export function getAntigravitySkillPath(home: string): string {
  return join(home, '.gemini', 'config', 'skills', 'roadmap-timeliner');
}

export async function mergeMcpConfig(
  filePath: string,
  serverName: string,
  serverConfig: { command: string; args: string[] }
): Promise<void> {
  let config: any = {};
  try {
    const raw = await readFile(filePath, 'utf8');
    config = JSON.parse(raw);
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      config = {};
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      try {
        await writeFile(`${filePath}.bak`, await readFile(filePath, 'utf8'));
      } catch {
        // ignore backup error
      }
      config = {};
    }
  }

  if (!config.mcpServers || typeof config.mcpServers !== 'object' || Array.isArray(config.mcpServers)) {
    config.mcpServers = {};
  }

  config.mcpServers[serverName] = serverConfig;

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function installCodexSkill(targetDir: string): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = join(here, '../skills/roadmap-timeliner');
  await mkdir(dirname(targetDir), { recursive: true });
  await cp(source, targetDir, { recursive: true, force: true, errorOnExist: false });
}

export async function runSetup(options: SetupOptions = {}): Promise<SetupTargetResult[]> {
  const home = options.homeDir || homedir();
  const currentPlatform = options.platformName || platform();
  const target = options.target || 'all';

  const mcpCommand = options.mcpCommand || 'npx';
  const mcpArgs = options.mcpArgs || ['-y', '@roadmap-timeliner/mcp'];
  const serverConfig = { command: mcpCommand, args: mcpArgs };

  const results: SetupTargetResult[] = [];

  if (target === 'all' || target === 'claude') {
    const claudePath = getClaudeConfigPath(home, currentPlatform);
    try {
      await mergeMcpConfig(claudePath, 'roadmap', serverConfig);
      results.push({
        target: 'claude',
        path: claudePath,
        success: true,
        message: 'Claude Desktop MCP config registered'
      });
    } catch (error: any) {
      results.push({
        target: 'claude',
        path: claudePath,
        success: false,
        message: error?.message || String(error)
      });
    }
  }

  if (target === 'all' || target === 'cursor') {
    const cursorPath = getCursorConfigPath(home);
    try {
      await mergeMcpConfig(cursorPath, 'roadmap', serverConfig);
      results.push({
        target: 'cursor',
        path: cursorPath,
        success: true,
        message: 'Cursor MCP config registered'
      });
    } catch (error: any) {
      results.push({
        target: 'cursor',
        path: cursorPath,
        success: false,
        message: error?.message || String(error)
      });
    }
  }

  if (target === 'all' || target === 'codex') {
    const codexPath = getCodexSkillPath(home);
    try {
      await installCodexSkill(codexPath);
      results.push({
        target: 'codex',
        path: codexPath,
        success: true,
        message: 'Codex skill installed'
      });
    } catch (error: any) {
      results.push({
        target: 'codex',
        path: codexPath,
        success: false,
        message: error?.message || String(error)
      });
    }
  }

  if (target === 'all' || target === 'antigravity' || target === 'gemini') {
    const agyMcpPath = getAntigravityMcpConfigPath(home);
    try {
      await mergeMcpConfig(agyMcpPath, 'roadmap', serverConfig);
      results.push({
        target: 'antigravity',
        path: agyMcpPath,
        success: true,
        message: 'Antigravity / Gemini CLI MCP config registered'
      });
    } catch (error: any) {
      results.push({
        target: 'antigravity',
        path: agyMcpPath,
        success: false,
        message: error?.message || String(error)
      });
    }

    const agySkillPath = getAntigravitySkillPath(home);
    try {
      await installCodexSkill(agySkillPath);
      results.push({
        target: 'antigravity',
        path: agySkillPath,
        success: true,
        message: 'Antigravity / Gemini CLI skill installed'
      });
    } catch (error: any) {
      results.push({
        target: 'antigravity',
        path: agySkillPath,
        success: false,
        message: error?.message || String(error)
      });
    }
  }

  return results;
}
