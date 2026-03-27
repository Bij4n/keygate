# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Keygate, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email security concerns to the maintainers directly. Include:

1. A description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact assessment
4. Suggested fix, if any

We will acknowledge receipt within 48 hours and provide a detailed response within 5 business days, including a timeline for a fix.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Security Design

Keygate is built around the principle that AI agents are untrusted callers. Security is enforced architecturally, not through prompts or model behavior.

### Encryption

- **At rest:** AES-256-GCM with per-connection derived keys
- **Key derivation:** scrypt with unique salts per user and connection
- **Token storage:** SHA-256 hash for lookups, encrypted copy for resolution
- **Passwords:** scrypt with 64-byte output and per-user salts

### Authentication

- **User auth:** JWT with configurable expiration (default: 24 hours)
- **API keys:** SHA-256 hashed at rest, shown to user only once at creation
- **OAuth state:** HMAC-SHA256 signed to prevent CSRF

### Agent Security

- **Opaque references:** Agents receive reference tokens, never raw credentials
- **Scoped tokens:** Permissions limited to specific resources and actions
- **Automatic expiry:** Configurable TTL (default: 1 hour, max: 24 hours)
- **Trust scoring:** Agents build reputation over time; anomalies reduce trust
- **Auto-suspension:** Agents dropping below trust threshold are suspended

### Infrastructure

- **Rate limiting:** Per-IP request throttling
- **Security headers:** Helmet.js with sensible defaults
- **Input validation:** Zod schemas on all API inputs
- **CORS:** Configurable origin allowlist

## Dependency Management

We monitor dependencies for known vulnerabilities. If you discover a vulnerable dependency, please report it through the process above.
