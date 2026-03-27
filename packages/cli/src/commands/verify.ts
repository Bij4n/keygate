import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { api } from '../api.js';

export const verifyCmd = new Command('verify')
  .description('Verify agent compliance with policies (for CI/CD gates)')
  .option('--agent <id>', 'Agent ID to verify')
  .option('--config <path>', 'Path to .keygate/ directory', '.keygate')
  .option('--strict', 'Fail on any warning (not just errors)')
  .option('--json', 'Output results as JSON')
  .action(async (opts) => {
    const configDir = opts.config;
    const results: VerifyResult[] = [];
    let hasError = false;
    let hasWarning = false;

    // 1. Check .keygate/ config exists
    if (!existsSync(configDir)) {
      results.push({ level: 'error', check: 'config', message: `No ${configDir}/ directory found. Run "keygate init --project" to create one.` });
      hasError = true;
    } else {
      results.push({ level: 'pass', check: 'config', message: `${configDir}/ directory found` });

      // 2. Validate policies file
      const policiesPath = join(configDir, 'policies.json');
      if (existsSync(policiesPath)) {
        try {
          const policies = JSON.parse(readFileSync(policiesPath, 'utf-8'));
          if (Array.isArray(policies) && policies.length > 0) {
            results.push({ level: 'pass', check: 'policies', message: `${policies.length} policies defined` });

            // Check for critical policies
            const hasDenyWrite = policies.some((p: any) =>
              p.effect === 'deny' && p.conditions?.some((c: any) =>
                c.type === 'scope_action' && c.actions?.includes('write')
              )
            );
            if (!hasDenyWrite) {
              results.push({ level: 'warn', check: 'policies', message: 'No policy restricting write access. Consider adding one.' });
              hasWarning = true;
            }

            const hasApproval = policies.some((p: any) => p.effect === 'require_approval');
            if (!hasApproval) {
              results.push({ level: 'warn', check: 'policies', message: 'No approval-required policies. Consider requiring approval for destructive actions.' });
              hasWarning = true;
            }
          } else {
            results.push({ level: 'warn', check: 'policies', message: 'policies.json is empty' });
            hasWarning = true;
          }
        } catch {
          results.push({ level: 'error', check: 'policies', message: 'policies.json is invalid JSON' });
          hasError = true;
        }
      } else {
        results.push({ level: 'warn', check: 'policies', message: 'No policies.json found' });
        hasWarning = true;
      }

      // 3. Validate agents file
      const agentsPath = join(configDir, 'agents.json');
      if (existsSync(agentsPath)) {
        try {
          const agents = JSON.parse(readFileSync(agentsPath, 'utf-8'));
          if (Array.isArray(agents) && agents.length > 0) {
            results.push({ level: 'pass', check: 'agents', message: `${agents.length} agents configured` });

            for (const agent of agents) {
              if (!agent.name) {
                results.push({ level: 'error', check: 'agents', message: 'Agent missing required "name" field' });
                hasError = true;
              }
              const boundary = agent.permissionBoundary;
              if (boundary) {
                if (boundary.allowedActions?.includes('admin')) {
                  results.push({ level: 'warn', check: 'agents', message: `Agent "${agent.name}" has admin permissions. Review if necessary.` });
                  hasWarning = true;
                }
                if (boundary.maxTokenTTL > 86400) {
                  results.push({ level: 'error', check: 'agents', message: `Agent "${agent.name}" has TTL > 24h. Maximum recommended is 86400s.` });
                  hasError = true;
                }
              }
            }
          }
        } catch {
          results.push({ level: 'error', check: 'agents', message: 'agents.json is invalid JSON' });
          hasError = true;
        }
      }

      // 4. Check project config
      const configPath = join(configDir, 'config.json');
      if (existsSync(configPath)) {
        try {
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));
          if (config.requiredTrustScore !== undefined && config.requiredTrustScore < 30) {
            results.push({ level: 'warn', check: 'config', message: `Trust score threshold is ${config.requiredTrustScore}. Consider raising to 50+.` });
            hasWarning = true;
          }
          results.push({ level: 'pass', check: 'config', message: 'config.json is valid' });
        } catch {
          results.push({ level: 'error', check: 'config', message: 'config.json is invalid JSON' });
          hasError = true;
        }
      }
    }

    // 5. Check server connection and agent status (if agent ID provided)
    if (opts.agent) {
      try {
        const agent = await api(`/api/agents/${opts.agent}`);
        if (agent.status === 'suspended') {
          results.push({ level: 'error', check: 'agent-status', message: `Agent "${agent.name}" is suspended (trust: ${agent.trustScore})` });
          hasError = true;
        } else if (agent.status === 'revoked') {
          results.push({ level: 'error', check: 'agent-status', message: `Agent "${agent.name}" is revoked` });
          hasError = true;
        } else if (agent.trustScore < 40) {
          results.push({ level: 'warn', check: 'agent-status', message: `Agent "${agent.name}" has low trust score: ${agent.trustScore}` });
          hasWarning = true;
        } else {
          results.push({ level: 'pass', check: 'agent-status', message: `Agent "${agent.name}" is active (trust: ${agent.trustScore})` });
        }
      } catch {
        results.push({ level: 'warn', check: 'agent-status', message: 'Could not verify agent status (server unreachable or agent not found)' });
        hasWarning = true;
      }
    }

    // Output
    if (opts.json) {
      console.log(JSON.stringify({ passed: !hasError && (!opts.strict || !hasWarning), results }, null, 2));
    } else {
      console.log('');
      console.log('Keygate Verification');
      console.log('─'.repeat(60));
      for (const r of results) {
        const icon = r.level === 'pass' ? '✓' : r.level === 'warn' ? '⚠' : '✗';
        const color = r.level === 'pass' ? '\x1b[32m' : r.level === 'warn' ? '\x1b[33m' : '\x1b[31m';
        console.log(`  ${color}${icon}\x1b[0m  ${r.message}`);
      }
      console.log('─'.repeat(60));

      const passes = results.filter(r => r.level === 'pass').length;
      const warnings = results.filter(r => r.level === 'warn').length;
      const errors = results.filter(r => r.level === 'error').length;

      if (hasError) {
        console.log(`\x1b[31m  ✗ FAILED\x1b[0m  ${passes} passed, ${warnings} warnings, ${errors} errors`);
      } else if (hasWarning && opts.strict) {
        console.log(`\x1b[33m  ⚠ FAILED (strict)\x1b[0m  ${passes} passed, ${warnings} warnings`);
      } else if (hasWarning) {
        console.log(`\x1b[33m  ⚠ PASSED with warnings\x1b[0m  ${passes} passed, ${warnings} warnings`);
      } else {
        console.log(`\x1b[32m  ✓ PASSED\x1b[0m  ${passes} checks passed`);
      }
      console.log('');
    }

    // Exit code for CI/CD
    if (hasError) process.exit(1);
    if (hasWarning && opts.strict) process.exit(1);
  });

interface VerifyResult {
  level: 'pass' | 'warn' | 'error';
  check: string;
  message: string;
}
