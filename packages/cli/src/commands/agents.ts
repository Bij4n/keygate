import { Command } from 'commander';
import { api } from '../api.js';

export const agentsCmd = new Command('agents')
  .description('Manage registered agents');

agentsCmd
  .command('list')
  .description('List all registered agents')
  .action(async () => {
    try {
      const data = await api('/api/agents');
      if (data.agents.length === 0) {
        console.log('No agents registered. Use "keygate agents register" to create one.');
        return;
      }
      console.log('');
      console.log('ID                          Name                Status      Trust  Requests');
      console.log('─'.repeat(85));
      for (const a of data.agents) {
        const id = a.id.padEnd(27);
        const name = a.name.padEnd(19);
        const status = a.status.padEnd(11);
        const trust = String(Math.round(a.trustScore)).padStart(5);
        const reqs = String(a.stats?.totalRequests ?? 0).padStart(9);
        console.log(`${id} ${name} ${status} ${trust}  ${reqs}`);
      }
      console.log('');
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

agentsCmd
  .command('register')
  .description('Register a new agent')
  .requiredOption('--name <name>', 'Agent name')
  .option('--description <desc>', 'Agent description')
  .action(async (opts) => {
    try {
      const data = await api('/api/agents', {
        method: 'POST',
        body: JSON.stringify({ name: opts.name, description: opts.description }),
      });
      console.log(`Agent registered: ${data.id}`);
      console.log(`  Name:   ${data.name}`);
      console.log(`  Trust:  ${data.trustScore}`);
      console.log(`  Status: ${data.status}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

agentsCmd
  .command('suspend <id>')
  .description('Suspend an agent')
  .action(async (id) => {
    try {
      await api(`/api/agents/${id}/suspend`, { method: 'POST' });
      console.log(`Agent ${id} suspended.`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

agentsCmd
  .command('activate <id>')
  .description('Activate a suspended agent')
  .action(async (id) => {
    try {
      await api(`/api/agents/${id}/activate`, { method: 'POST' });
      console.log(`Agent ${id} activated.`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
