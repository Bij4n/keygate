import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const initCmd = new Command('init')
  .description('Initialize Keygate configuration')
  .option('--api-url <url>', 'Keygate API URL', 'http://localhost:3100')
  .option('--api-key <key>', 'API key for authentication')
  .option('--project', 'Initialize a .keygate/ directory in the current project')
  .action((opts) => {
    if (opts.project) {
      initProject();
    } else {
      initGlobal(opts.apiUrl, opts.apiKey);
    }
  });

function initGlobal(apiUrl: string, apiKey?: string) {
  const dir = join(homedir(), '.keygate');
  mkdirSync(dir, { recursive: true });

  const configPath = join(dir, 'config.json');
  const config: Record<string, string> = { apiUrl };
  if (apiKey) config.apiKey = apiKey;

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`Configuration saved to ${configPath}`);
  console.log(`  API URL: ${apiUrl}`);
  if (apiKey) console.log(`  API Key: ${apiKey.slice(0, 12)}...`);
  console.log('\nRun "keygate status" to verify the connection.');
}

function initProject() {
  const dir = join(process.cwd(), '.keygate');
  mkdirSync(dir, { recursive: true });

  const configPath = join(dir, 'config.json');
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify({
      policies: [],
      agents: [],
      requiredTrustScore: 50,
      maxTokenTTL: 3600,
    }, null, 2) + '\n');
  }

  const policiesPath = join(dir, 'policies.json');
  if (!existsSync(policiesPath)) {
    writeFileSync(policiesPath, JSON.stringify([
      {
        name: 'Deny write access outside business hours',
        effect: 'deny',
        conditions: [
          { type: 'scope_action', actions: ['write', 'delete'] },
          { type: 'time_window', startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] },
        ],
      },
      {
        name: 'Require approval for admin operations',
        effect: 'require_approval',
        conditions: [
          { type: 'scope_action', actions: ['admin'] },
        ],
      },
    ], null, 2) + '\n');
  }

  const agentsPath = join(dir, 'agents.json');
  if (!existsSync(agentsPath)) {
    writeFileSync(agentsPath, JSON.stringify([
      {
        name: 'example-agent',
        description: 'Replace with your agent configuration',
        permissionBoundary: {
          allowedProviders: [],
          maxTokenTTL: 3600,
          maxConcurrentTokens: 10,
          allowedActions: ['read'],
          requireApproval: false,
        },
      },
    ], null, 2) + '\n');
  }

  console.log('Initialized .keygate/ in current directory:');
  console.log('  .keygate/config.json    — project settings');
  console.log('  .keygate/policies.json  — access control policies');
  console.log('  .keygate/agents.json    — agent configurations');
  console.log('\nCommit these files to version control to enable policy-as-code.');
  console.log('Use "keygate verify" in CI/CD to enforce policies before deployment.');
}
