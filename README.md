# Keygate

Credential broker and access control for AI agents.

Keygate sits between your AI agents and the services they access — providing scoped, short-lived tokens with full audit trails and one-click revocation.

## The Problem

AI agents need access to your accounts (Gmail, GitHub, Slack, etc.) but current approaches give agents broad, persistent access with no visibility or control. A single compromised tool can access everything.

## How It Works

1. **Connect** your accounts through OAuth — once.
2. **Keygate brokers access** by issuing scoped, short-lived tokens per agent, per tool, per session.
3. **Monitor and control** through a real-time dashboard showing exactly what each agent is accessing.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Your Agent │────>│   Keygate    │────>│   Gmail      │
│              │     │   Broker     │     │   GitHub     │
│  (any agent) │<────│              │<────│   Slack ...  │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                     ┌─────v─────┐
                     │ Dashboard │
                     │ Audit Log │
                     └───────────┘
```

## Key Features

- **Scoped tokens** — agents get the minimum access needed, not your master credentials
- **Automatic expiry** — tokens expire after a configurable TTL (default: 1 hour)
- **Opaque references** — agents never see actual credentials, preventing context window leakage
- **Real-time audit log** — every credential use is logged with agent, tool, action, and timestamp
- **One-click revocation** — instantly kill any agent's access to any service
- **MCP integration** — ships as an MCP server for any compatible agent
- **Team support** — shared vaults with role-based access control

## Quick Start

```bash
# Clone and install
git clone https://github.com/user/keygate.git
cd keygate
npm install

# Start infrastructure
docker compose up -d postgres redis

# Configure
cp .env.example .env
# Edit .env with your settings

# Run database migrations
npm run migrate --workspace=packages/server

# Start the server and dashboard
npm run dev
```

## Packages

| Package | Description |
|---------|-------------|
| `@keygate/core` | Token broker, encryption, and vault logic |
| `@keygate/server` | REST API server |
| `@keygate/dashboard` | Web dashboard for managing connections |
| `@keygate/mcp` | MCP server for agent integration |
| `@keygate/sdk` | TypeScript SDK for agent developers |

## SDK Usage

```typescript
import { KeygateClient } from '@keygate/sdk';

const kg = new KeygateClient({
  apiKey: process.env.KEYGATE_API_KEY,
  agentId: 'my-agent',
});

// Request a scoped token
const token = await kg.getToken('github', {
  scopes: ['repo:read'],
  ttl: '1h',
});

// Use it
const response = await fetch('https://api.github.com/user/repos', {
  headers: { Authorization: `Bearer ${token.accessToken}` },
});
```

## MCP Integration

Add Keygate to your MCP config:

```json
{
  "mcpServers": {
    "keygate": {
      "command": "npx",
      "args": ["@keygate/mcp"],
      "env": {
        "KEYGATE_API_URL": "http://localhost:3100",
        "KEYGATE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Architecture

Keygate uses envelope encryption for credential storage. Your master credentials are encrypted with a per-connection key, which is itself encrypted with your account's root key. Tokens issued to agents are short-lived derivatives that never expose the underlying credentials.

```
Root Key (derived from ENCRYPTION_KEY + user salt)
  └──> Connection Key (per OAuth connection)
       └──> Stored Credential (encrypted at rest)
            └──> Scoped Token (short-lived, limited permissions)
```

## Development

```bash
# Run tests
npm test

# Build all packages
npm run build

# Lint
npm run lint
```

## License

MIT
