import { Command } from 'commander';
import { api } from '../api.js';

export const tokensCmd = new Command('tokens')
  .description('Manage credential tokens');

tokensCmd
  .command('issue')
  .description('Issue a scoped token for a connection')
  .requiredOption('--connection <id>', 'Connection ID')
  .requiredOption('--agent <id>', 'Agent ID')
  .option('--resource <resource>', 'Resource to access', 'data')
  .option('--actions <actions>', 'Comma-separated actions (read,write,delete,admin)', 'read')
  .option('--ttl <seconds>', 'Token TTL in seconds', '3600')
  .action(async (opts) => {
    try {
      const actions = opts.actions.split(',').map((a: string) => a.trim());
      const data = await api('/api/tokens/issue', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: opts.connection,
          agentId: opts.agent,
          scopes: [{ resource: opts.resource, actions }],
          ttl: parseInt(opts.ttl, 10),
        }),
      });
      console.log(`Token issued: ${data.tokenId}`);
      console.log(`  Reference: ${data.reference}`);
      console.log(`  Expires:   ${data.expiresAt}`);
      console.log(`  Scopes:    ${JSON.stringify(data.scopes)}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

tokensCmd
  .command('resolve <reference>')
  .description('Resolve a token reference to get the access token')
  .action(async (reference) => {
    try {
      const data = await api('/api/tokens/resolve', {
        method: 'POST',
        body: JSON.stringify({ reference }),
      });
      console.log(data.accessToken);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

tokensCmd
  .command('revoke <tokenId>')
  .description('Revoke a token')
  .action(async (tokenId) => {
    try {
      await api(`/api/tokens/${tokenId}`, { method: 'DELETE' });
      console.log(`Token ${tokenId} revoked.`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
