#!/usr/bin/env node

import { Command } from 'commander';
import { initCmd } from './commands/init.js';
import { loginCmd } from './commands/login.js';
import { agentsCmd } from './commands/agents.js';
import { connectionsCmd } from './commands/connections.js';
import { tokensCmd } from './commands/tokens.js';
import { policiesCmd } from './commands/policies.js';
import { verifyCmd } from './commands/verify.js';
import { auditCmd } from './commands/audit.js';
import { statusCmd } from './commands/status.js';

const program = new Command();

program
  .name('keygate')
  .description('Credential governance for AI agents')
  .version('0.1.0');

program.addCommand(initCmd);
program.addCommand(loginCmd);
program.addCommand(statusCmd);
program.addCommand(agentsCmd);
program.addCommand(connectionsCmd);
program.addCommand(tokensCmd);
program.addCommand(policiesCmd);
program.addCommand(auditCmd);
program.addCommand(verifyCmd);

program.parse();
