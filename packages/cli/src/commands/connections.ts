import { Command } from 'commander';
import { api } from '../api.js';

export const connectionsCmd = new Command('connections')
  .description('Manage service connections');

connectionsCmd
  .command('list')
  .description('List all connections')
  .action(async () => {
    try {
      const data = await api('/api/connections');
      if (data.connections.length === 0) {
        console.log('No connections. Use "keygate connections create" to add one.');
        return;
      }
      console.log('');
      console.log('ID                          Provider        Status    Scopes');
      console.log('─'.repeat(80));
      for (const c of data.connections) {
        const id = c.id.padEnd(27);
        const provider = c.provider.padEnd(15);
        const status = c.status.padEnd(9);
        const scopes = c.scopes.join(', ');
        console.log(`${id} ${provider} ${status} ${scopes}`);
      }
      console.log('');
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

connectionsCmd
  .command('create')
  .description('Create a new connection')
  .requiredOption('--provider <provider>', 'Service provider (github, gmail, slack, etc.)')
  .option('--scopes <scopes>', 'Comma-separated scopes', '')
  .action(async (opts) => {
    try {
      const scopes = opts.scopes ? opts.scopes.split(',').map((s: string) => s.trim()) : [];
      const data = await api('/api/connections', {
        method: 'POST',
        body: JSON.stringify({ provider: opts.provider, scopes }),
      });
      console.log(`Connection created: ${data.id}`);
      console.log(`  Provider: ${data.provider}`);
      console.log(`  Status:   ${data.status}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

connectionsCmd
  .command('revoke <id>')
  .description('Revoke a connection and all its tokens')
  .action(async (id) => {
    try {
      await api(`/api/connections/${id}`, { method: 'DELETE' });
      console.log(`Connection ${id} revoked.`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
