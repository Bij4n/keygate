import { Command } from 'commander';
import { api } from '../api.js';

export const auditCmd = new Command('audit')
  .description('Query the audit log');

auditCmd
  .command('list')
  .description('List recent audit entries')
  .option('--agent <id>', 'Filter by agent ID')
  .option('--action <action>', 'Filter by action (token.issued, token.denied, etc.)')
  .option('--limit <n>', 'Number of entries', '20')
  .action(async (opts) => {
    try {
      const params = new URLSearchParams();
      if (opts.agent) params.set('agentId', opts.agent);
      if (opts.action) params.set('action', opts.action);
      params.set('limit', opts.limit);

      const data = await api(`/api/audit?${params}`);
      if (data.entries.length === 0) {
        console.log('No audit entries found.');
        return;
      }
      console.log('');
      console.log('Time          Action           Agent                Provider    Status');
      console.log('─'.repeat(80));
      for (const e of data.entries) {
        const time = new Date(e.timestamp).toLocaleTimeString().padEnd(13);
        const action = e.action.padEnd(16);
        const agent = e.agentId.padEnd(20);
        const provider = e.provider.padEnd(11);
        const status = e.success ? 'OK' : 'DENIED';
        console.log(`${time} ${action} ${agent} ${provider} ${status}`);
      }
      console.log(`\n${data.total} total entries`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

auditCmd
  .command('export')
  .description('Export audit log as JSON')
  .option('--from <date>', 'Start date (ISO format)')
  .option('--to <date>', 'End date (ISO format)')
  .action(async (opts) => {
    try {
      const params = new URLSearchParams();
      if (opts.from) params.set('from', opts.from);
      if (opts.to) params.set('to', opts.to);

      const data = await api(`/api/audit/export?${params}`);
      console.log(JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
