import { Command } from 'commander';
import { api } from '../api.js';

export const policiesCmd = new Command('policies')
  .description('Manage access control policies');

policiesCmd
  .command('list')
  .description('List all policies')
  .action(async () => {
    try {
      const data = await api('/api/policies');
      if (data.policies.length === 0) {
        console.log('No policies defined. Use "keygate policies create" or "keygate init --project".');
        return;
      }
      console.log('');
      console.log('ID                          Name                              Effect');
      console.log('─'.repeat(75));
      for (const p of data.policies) {
        const id = p.id.padEnd(27);
        const name = p.name.padEnd(33);
        console.log(`${id} ${name} ${p.effect}`);
      }
      console.log('');
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

policiesCmd
  .command('create')
  .description('Create a policy')
  .requiredOption('--name <name>', 'Policy name')
  .requiredOption('--effect <effect>', 'Effect: deny, require_approval, or allow')
  .requiredOption('--condition <json>', 'Condition as JSON (e.g., \'{"type":"scope_action","actions":["write"]}\')')
  .action(async (opts) => {
    try {
      const condition = JSON.parse(opts.condition);
      const data = await api('/api/policies', {
        method: 'POST',
        body: JSON.stringify({
          name: opts.name,
          effect: opts.effect,
          conditions: [condition],
        }),
      });
      console.log(`Policy created: ${data.id}`);
      console.log(`  Name:   ${data.name}`);
      console.log(`  Effect: ${data.effect}`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

policiesCmd
  .command('delete <id>')
  .description('Delete a policy')
  .action(async (id) => {
    try {
      await api(`/api/policies/${id}`, { method: 'DELETE' });
      console.log(`Policy ${id} deleted.`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
