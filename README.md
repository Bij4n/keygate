# Keygate

**Credential governance for AI agents.**

Other tools authenticate agents. Keygate governs what happens after — scoped tokens, anomaly detection, trust scoring, and policy enforcement in real time.

[![CI](https://github.com/Bij4n/keygate/actions/workflows/ci.yml/badge.svg)](https://github.com/Bij4n/keygate/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Why Keygate

Nearly half of teams still use shared API keys for agent auth. Even those using OAuth hand agents broad, persistent tokens with zero visibility into how they're used. One compromised tool means full account access.

Keygate sits between your agents and the services they access:

```
Your Agents  ──>  Keygate Broker  ──>  Your Services
                       │
                  Dashboard +
                  Audit + Alerts
```

- **Scoped tokens** — short-lived, narrowly scoped credentials per agent, per tool
- **Opaque references** — agents never see raw tokens, preventing context window leaks
- **Anomaly detection** — velocity spikes, off-hours access, scope escalation, bulk exfiltration
- **Policy engine** — conditional access rules: time restrictions, scope limits, provider controls
- **Human-in-the-loop** — high-risk operations require human approval before access is granted
- **Agent trust scoring** — every agent builds a 0–100 trust score; unknown or misbehaving agents are auto-suspended
- **MCP Registry** — reputation database for MCP servers with trust scores, vulnerability tracking, and community ratings
- **Complete audit trail** — every credential use logged; exportable for SOC 2 and GDPR
- **SIEM integration** — export events to Datadog, Splunk, Elastic, or any webhook
- **Webhook alerts** — Slack, Discord, and JSON notifications on anomalies

---

## Quick Start

```bash
git clone https://github.com/Bij4n/keygate.git
cd keygate
npm run init    # installs, builds, runs tests
npm run demo    # starts the server (in-memory, no DB required)
```

Open [http://localhost:3100/preview.html](http://localhost:3100/preview.html) for the dashboard.

---

## Packages

| Package | Description |
|---------|-------------|
| `@keygate/core` | Vault, encryption, anomaly detection, policy engine, agent registry, MCP registry, SIEM export |
| `@keygate/server` | Express REST API with auth, rate limiting, telemetry, audit logging |
| `@keygate/dashboard` | Web dashboard with 8 pages (connections, tokens, audit, agents, policies, registry, settings) |
| `@keygate/mcp` | MCP server — 6 tools for any MCP-compatible agent |
| `@keygate/sdk` | TypeScript client SDK |
| `keygate-langchain` | Python SDK with LangChain integration, tool wrapping, and credential provider |

---

## SDK Usage

### TypeScript

```typescript
import { KeygateClient } from '@keygate/sdk';

const kg = new KeygateClient({
  apiKey: process.env.KEYGATE_API_KEY,
  agentId: 'my-agent',
});

const { accessToken } = await kg.getToken('conn_github', [
  { resource: 'repos', actions: ['read'] },
]);
```

### Python / LangChain

```python
from keygate_langchain import KeygateCredentialProvider

provider = KeygateCredentialProvider(
    api_key="kg_key_...",
    agent_id="my-agent",
)

with provider.scoped("conn_github", actions=["read"]) as token:
    response = httpx.get(
        "https://api.github.com/user/repos",
        headers={"Authorization": f"Bearer {token}"},
    )
```

### MCP Server

```json
{
  "mcpServers": {
    "keygate": {
      "command": "npx",
      "args": ["@keygate/mcp"],
      "env": {
        "KEYGATE_API_URL": "http://localhost:3100",
        "KEYGATE_API_KEY": "kg_key_..."
      }
    }
  }
}
```

---

## Architecture

Keygate uses envelope encryption. Master credentials are encrypted with per-connection keys, which are encrypted with the account root key. Tokens issued to agents are short-lived derivatives that never expose underlying credentials.

```
Root Key (ENCRYPTION_KEY + user salt)
  └─ Connection Key (per OAuth connection)
       └─ Stored Credential (AES-256-GCM at rest)
            └─ Scoped Token (short-lived, limited permissions)
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Sign in |
| `POST /api/auth/api-keys` | Generate API key |
| `GET /api/connections` | List connections |
| `POST /api/connections` | Create OAuth connection |
| `POST /api/tokens/issue` | Issue scoped token |
| `POST /api/tokens/resolve` | Resolve token reference |
| `DELETE /api/tokens/:id` | Revoke token |
| `GET /api/audit` | Query audit log |
| `GET /api/agents` | List registered agents |
| `POST /api/agents` | Register agent |
| `GET /api/policies` | List access policies |
| `POST /api/policies` | Create policy |
| `GET /api/registry` | Search MCP server registry |
| `POST /api/registry/:id/rate` | Rate an MCP server |
| `GET /api/alerts` | View alerts |
| `POST /api/webhooks` | Configure webhook |
| `POST /api/siem` | Configure SIEM export |

Full API documentation at [/docs.html](http://localhost:3100/docs.html).

---

## Deployment

### Docker

```bash
docker build -t keygate .
docker run -p 3100:3100 keygate
```

### Fly.io

```bash
fly launch --name keygate
fly deploy
```

### Railway

```bash
railway up
```

---

## Full Setup (with PostgreSQL)

```bash
cp .env.example .env
# Set ENCRYPTION_KEY and JWT_SECRET

docker compose up -d postgres redis
npm run migrate --workspace=packages/server
npm run dev
```

---

## Development

```bash
npm run init          # install + build + test
npm run demo          # start demo server
npm test              # run all tests
npm run build         # build all packages
```

---

## Security

Keygate is built around the principle that agents are untrusted callers. Security is enforced architecturally, not by prompts.

- AES-256-GCM encryption at rest
- Scrypt password hashing
- HMAC-signed OAuth state parameters
- Per-token derived encryption keys
- Rate limiting on all endpoints
- Helmet security headers

For vulnerability reporting, see [SECURITY.md](SECURITY.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

---

## License

MIT. See [LICENSE](LICENSE) for details.
