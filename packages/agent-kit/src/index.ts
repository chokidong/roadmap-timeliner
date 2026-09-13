#!/usr/bin/env node
import { runSetup, SetupOptions } from './setup.js';

const [command, ...args] = process.argv.slice(2);

function printUsage(): void {
  process.stdout.write(`Usage: roadmap-agent <install|setup> [--target all|claude|cursor|codex]\n`);
}

function parseTarget(argsList: string[]): 'all' | 'claude' | 'cursor' | 'codex' {
  const targetIndex = argsList.indexOf('--target');
  if (targetIndex >= 0 && argsList[targetIndex + 1]) {
    const val = argsList[targetIndex + 1];
    if (['all', 'claude', 'cursor', 'codex'].includes(val)) {
      return val as any;
    }
  }
  return 'all';
}

async function main(): Promise<void> {
  if (!command || !['install', 'setup'].includes(command)) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const target = command === 'install' ? 'codex' : parseTarget(args);
  const results = await runSetup({ target });

  for (const res of results) {
    const icon = res.success ? '✔' : '✖';
    process.stdout.write(`${icon} [${res.target}] ${res.message} (${res.path})\n`);
  }

  const hasFailure = results.some(r => !r.success);
  if (hasFailure) {
    process.exitCode = 1;
  } else {
    process.stdout.write(`\nSetup completed! Please restart your AI client (Claude Desktop, Cursor, etc.) to use Roadmap tools.\n`);
  }
}

main().catch(err => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
