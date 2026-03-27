# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-26

### Added

#### Core
- Vault with scoped token issuance, resolution, and revocation
- AES-256-GCM envelope encryption with per-connection key derivation
- Scope validation and intersection logic
- Anomaly detection engine with 6 rules (velocity spike, off-hours access, scope escalation, unknown agent, bulk data access, failed auth burst)
- Policy engine with conditional access rules (deny, allow, require approval)
- Human-in-the-loop approval manager
- Agent registry with trust scoring (0-100) and auto-suspension
- MCP Server Reputation Registry with trust scores and vulnerability tracking
- Token rotation manager with auto-refresh before expiry
- SIEM export adapters (Datadog, Splunk, Elastic, syslog, webhook)
- Webhook dispatcher with Slack, Discord, and JSON formatters

#### Server
- Express REST API with JWT and API key authentication
- PostgreSQL schema with migrations
- In-memory store for development and demos
- Routes: auth, connections, tokens, audit, agents, policies, approvals, alerts, webhooks, registry, SIEM
- Rate limiting, CORS, security headers
- Telemetry middleware (IP, user-agent, framework ID, session, latency)
- OAuth provider configurations for 10 services

#### Dashboard
- 10-page interactive dashboard (connections, tokens, audit, agents, policies, registry, webhooks, SIEM, settings)
- Works in demo mode without backend (pre-loaded data)
- Responsive design

#### SDKs
- TypeScript SDK with token lifecycle management
- Python/LangChain SDK with credential provider and tool wrapping
- MCP server with 6 tools

#### Infrastructure
- Monorepo with npm workspaces
- Docker and Docker Compose setup
- Deployment configs for Fly.io and Railway
- GitHub Actions CI (Node 20 + 22)
- 119 tests across 9 test files
