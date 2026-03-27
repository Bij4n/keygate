import { Command } from 'commander';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { api } from '../api.js';

export const loginCmd = new Command('login')
  .description('Authenticate with Keygate')
  .requiredOption('--email <email>', 'Your email address')
  .requiredOption('--password <password>', 'Your password')
  .action(async (opts) => {
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: opts.email, password: opts.password }),
      });

      const dir = join(homedir(), '.keygate');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'token'), data.token);

      console.log(`Logged in as ${data.user.email} (${data.user.role})`);
      console.log(`Token saved to ~/.keygate/token`);
    } catch (err: any) {
      console.error(`Login failed: ${err.message}`);
      process.exit(1);
    }
  });
