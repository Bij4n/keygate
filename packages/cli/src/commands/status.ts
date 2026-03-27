import { Command } from 'commander';
import { api, getConfig } from '../api.js';

export const statusCmd = new Command('status')
  .description('Check Keygate connection and account status')
  .action(async () => {
    const config = getConfig();
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`API Key: ${config.apiKey ? config.apiKey.slice(0, 12) + '...' : '(not set)'}`);
    console.log('');

    try {
      const health = await api('/health');
      console.log(`Server:  ${health.status} (v${health.version})`);
    } catch {
      console.error('Server:  unreachable');
      process.exit(1);
    }

    try {
      const summary = await api('/api/audit/summary');
      console.log('');
      console.log('Account:');
      console.log(`  Active connections:  ${summary.activeConnections}`);
      console.log(`  Tokens issued:       ${summary.tokensIssued}`);
      console.log(`  Unique agents:       ${summary.uniqueAgents}`);
      console.log(`  Anomalies:           ${summary.anomalies ?? 0}`);
      console.log(`  Events (24h):        ${summary.last24h?.requests ?? 0}`);
    } catch {
      console.log('Account: not authenticated (run "keygate login" or set KEYGATE_API_KEY)');
    }
  });
