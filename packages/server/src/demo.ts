/**
 * Standalone demo server — runs entirely in-memory with no external dependencies.
 * Usage: npx tsx packages/server/src/demo.ts
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Vault,
  VaultError,
  EncryptionService,
  Provider,
  listProviders,
  getProvider,
  AnomalyEngine,
  PolicyEngine,
  ApprovalManager,
  AgentRegistry,
  DEFAULT_PERMISSION_BOUNDARY,
} from '@keygate/core';
import type { VaultConfig, AuditEntry } from '@keygate/core';
import { MemoryVaultStore } from './db/memory-store.js';
import { policiesRouter } from './routes/policies.js';
import { approvalsRouter, approvalManager } from './routes/approvals.js';
import { agentsRouter, agentRegistry } from './routes/agents.js';
import { alertsRouter, addAlert, getUnacknowledgedCount } from './routes/alerts.js';
import { webhooksRouter, webhookDispatcher } from './routes/webhooks.js';
import { registryRouter } from './routes/registry.js';
import { siemRouter, siemExporter } from './routes/siem.js';
import { telemetry } from './middleware/telemetry.js';

const JWT_SECRET = 'demo-jwt-secret-' + randomBytes(16).toString('hex');
const ENCRYPTION_KEY = 'demo-encryption-key-' + randomBytes(16).toString('hex');

const config: VaultConfig = {
  encryptionKey: ENCRYPTION_KEY,
  tokenTTL: 3600,
  maxTokenTTL: 86400,
  auditRetention: 90,
};

const store = new MemoryVaultStore(ENCRYPTION_KEY);
const vault = new Vault(store, config);
const anomalyEngine = new AnomalyEngine();
const policyEngine = new PolicyEngine();
const app = express();
const port = process.env.PORT ?? 3100;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(telemetry);

// Serve preview.html at root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
app.use(express.static(projectRoot));

// Auth helpers
interface AuthPayload { userId: string; email: string; teamId?: string; role: string }

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const header = req.headers.authorization;
  if (!header) { res.status(401).json({ error: 'Missing authorization header' }); return; }

  if (header.startsWith('Bearer ')) {
    try {
      (req as any).auth = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
      next();
    } catch { res.status(401).json({ error: 'Invalid token' }); }
    return;
  }

  if (header.startsWith('ApiKey ')) {
    const keyHash = createHash('sha256').update(header.slice(7)).digest('hex');
    store.findApiKeyByHash(keyHash).then(apiKey => {
      if (!apiKey) { res.status(401).json({ error: 'Invalid API key' }); return; }
      store.findUserByEmail(apiKey.email).then(user => {
        (req as any).auth = { userId: apiKey.userId, email: apiKey.email ?? '', teamId: apiKey.teamId, role: user?.role ?? 'member' };
        next();
      });
    }).catch(() => res.status(500).json({ error: 'Auth error' }));
    return;
  }

  res.status(401).json({ error: 'Unsupported auth scheme' });
}

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '0.1.0', mode: 'demo' }));

// === Auth routes ===
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().optional(),
    }).parse(req.body);

    const existing = await store.findUserByEmail(email);
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

    const userId = `usr_${nanoid(24)}`;
    const teamId = `team_${nanoid(24)}`;
    const salt = EncryptionService.generateSalt();
    const passwordHash = scryptSync(password, salt, 64).toString('hex');

    await store.createTeam({ id: teamId, name: name ?? `${email}'s Team`, slug: email.split('@')[0] });
    await store.createUser({ id: userId, email, passwordHash, name, teamId, role: 'owner', salt });

    const token = signToken({ userId, email, teamId, role: 'owner' });
    res.status(201).json({ token, expiresIn: 86400, user: { id: userId, email, name, role: 'owner' } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }).parse(req.body);

    const user = await store.findUserByEmail(email);
    if (!user) { res.status(401).json({ error: 'Invalid email or password' }); return; }

    const hash = scryptSync(password, user.salt, 64).toString('hex');
    if (!timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' }); return;
    }

    const token = signToken({ userId: user.id, email, teamId: user.teamId, role: user.role });
    res.json({ token, expiresIn: 86400, user: { id: user.id, email, name: user.name, role: user.role } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/api-keys', authenticate, async (req, res) => {
  try {
    const { name, scopes } = z.object({ name: z.string(), scopes: z.array(z.string()).optional() }).parse(req.body);
    const auth = (req as any).auth as AuthPayload;
    const keyId = `key_${nanoid(24)}`;
    const rawKey = `kg_key_${randomBytes(32).toString('base64url')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    await store.createApiKey({ id: keyId, userId: auth.userId, teamId: auth.teamId, email: auth.email, name, keyHash, prefix: rawKey.substring(0, 12), scopes: scopes ?? ['*'] });
    res.status(201).json({ id: keyId, name, key: rawKey, prefix: rawKey.substring(0, 12), scopes: scopes ?? ['*'], createdAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// === Provider routes ===
app.get('/api/providers', authenticate, (_req, res) => {
  res.json({ providers: listProviders().map(p => ({ id: p.id, name: p.name, icon: p.icon, scopes: p.availableScopes })) });
});

app.get('/api/providers/:id', authenticate, (req, res) => {
  const provider = getProvider(req.params.id);
  if (!provider) { res.status(404).json({ error: 'Provider not found' }); return; }
  res.json(provider);
});

// === Connection routes ===
app.get('/api/connections', authenticate, async (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const connections = await store.getConnectionsByUser(auth.userId);
  res.json({
    connections: connections.map(c => ({
      id: c.id, provider: c.provider, status: c.status, scopes: c.scopes,
      metadata: c.metadata, createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(), lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
    })),
    total: connections.length,
  });
});

app.get('/api/connections/:id', authenticate, async (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const conn = await store.getConnection(req.params.id);
  if (!conn || conn.userId !== auth.userId) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ id: conn.id, provider: conn.provider, status: conn.status, scopes: conn.scopes, metadata: conn.metadata, createdAt: conn.createdAt.toISOString() });
});

app.post('/api/connections', authenticate, async (req, res) => {
  try {
    const auth = (req as any).auth as AuthPayload;
    const body = z.object({ provider: Provider, scopes: z.array(z.string()), metadata: z.record(z.string(), z.unknown()).optional() }).parse(req.body);
    const id = `conn_${nanoid(24)}`;
    const ckId = `ck_${nanoid(24)}`;

    await store.createConnection({ id, userId: auth.userId, teamId: auth.teamId, provider: body.provider, status: 'active', scopes: body.scopes, encryptedCredentials: Buffer.alloc(0), connectionKeyId: ckId, metadata: body.metadata ?? {} });
    res.status(201).json({ id, provider: body.provider, status: 'active', scopes: body.scopes, createdAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/connections/:id', authenticate, async (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const conn = await store.getConnection(req.params.id);
  if (!conn || conn.userId !== auth.userId) { res.status(404).json({ error: 'Not found' }); return; }
  await vault.revokeAllTokens(req.params.id);
  await store.deleteConnection(req.params.id);
  res.json({ id: req.params.id, status: 'revoked', revokedAt: new Date().toISOString() });
});

// === Token routes ===
app.post('/api/tokens/issue', authenticate, async (req, res) => {
  try {
    const auth = (req as any).auth as AuthPayload;
    const body = z.object({
      connectionId: z.string(), agentId: z.string(),
      scopes: z.array(z.object({ resource: z.string(), actions: z.array(z.enum(['read', 'write', 'delete', 'admin'])), constraints: z.record(z.string(), z.unknown()).optional() })),
      ttl: z.number().min(60).max(86400).optional(), maxUsage: z.number().min(1).optional(), metadata: z.record(z.string(), z.unknown()).optional(),
    }).parse(req.body);

    const conn = await store.getConnection(body.connectionId);
    if (!conn || conn.userId !== auth.userId) { res.status(404).json({ error: 'Connection not found' }); return; }

    const result = await vault.issueToken({ connectionId: body.connectionId, agentId: body.agentId, scopes: body.scopes, ttl: body.ttl, maxUsage: body.maxUsage, metadata: body.metadata });
    res.status(201).json({ tokenId: result.tokenId, reference: result.reference, expiresAt: result.expiresAt.toISOString(), scopes: result.scopes });
  } catch (err: any) {
    if (err instanceof VaultError) { res.status(400).json({ error: err.code, message: err.message }); return; }
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tokens/resolve', authenticate, async (req, res) => {
  try {
    const { reference } = z.object({ reference: z.string() }).parse(req.body);
    const result = await vault.resolveToken(reference);
    res.json({ accessToken: result.accessToken, scopes: result.scopes });
  } catch (err: any) {
    if (err instanceof VaultError) { res.status(err.code === 'TOKEN_NOT_FOUND' ? 404 : 403).json({ error: err.code, message: err.message }); return; }
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/tokens/:tokenId', authenticate, async (req, res) => {
  try {
    await vault.revokeToken(req.params.tokenId);
    res.json({ tokenId: req.params.tokenId, revokedAt: new Date().toISOString() });
  } catch (err: any) {
    if (err instanceof VaultError) { res.status(404).json({ error: err.code, message: err.message }); return; }
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/tokens/connection/:connectionId', authenticate, async (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const conn = await store.getConnection(req.params.connectionId);
  if (!conn || conn.userId !== auth.userId) { res.status(404).json({ error: 'Not found' }); return; }
  const tokens = await store.listTokensByConnection(req.params.connectionId);
  res.json({ tokens: tokens.map(t => ({ id: t.id, agentId: t.agentId, scopes: t.scopes, issuedAt: t.issuedAt.toISOString(), expiresAt: t.expiresAt.toISOString(), usageCount: t.usageCount })), connectionId: req.params.connectionId });
});

// === Audit routes ===
app.get('/api/audit', authenticate, async (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const filters = z.object({
    connectionId: z.string().optional(), agentId: z.string().optional(), action: z.string().optional(),
    from: z.string().optional(), to: z.string().optional(),
    limit: z.coerce.number().min(1).max(500).default(50), offset: z.coerce.number().min(0).default(0),
  }).parse(req.query);

  const result = await store.queryAuditLog(auth.userId, filters);
  res.json({
    entries: result.entries.map(e => ({
      id: e.id, timestamp: e.timestamp.toISOString(), connectionId: e.connectionId,
      tokenId: e.tokenId, agentId: e.agentId, action: e.action, resource: e.resource,
      provider: e.provider, metadata: e.metadata, success: e.success, error: e.error,
    })),
    total: result.total, limit: filters.limit, offset: filters.offset,
  });
});

app.get('/api/audit/summary', authenticate, async (req, res) => {
  const auth = (req as any).auth as AuthPayload;
  const summary = await store.getAuditSummary(auth.userId);
  res.json({
    totalRequests: summary.totalRequests, uniqueAgents: summary.uniqueAgents,
    activeConnections: summary.activeConnections, tokensIssued: summary.tokensIssued,
    tokensRevoked: summary.tokensRevoked, anomalies: getUnacknowledgedCount(),
    last24h: { requests: summary.last24hRequests, uniqueAgents: summary.last24hAgents },
  });
});

// === New feature routes ===
app.use('/api/policies', authenticate, policiesRouter);
app.use('/api/approvals', authenticate, approvalsRouter);
app.use('/api/agents', authenticate, agentsRouter);
app.use('/api/alerts', authenticate, alertsRouter);
app.use('/api/webhooks', authenticate, webhooksRouter);
app.use('/api/registry', registryRouter);  // Public — no auth required
app.use('/api/siem', authenticate, siemRouter);

// Anomaly analysis hook — runs on every audit entry
const originalAppendAudit = store.appendAuditLog.bind(store);
store.appendAuditLog = async function (entry: AuditEntry) {
  await originalAppendAudit(entry);
  const detections = anomalyEngine.analyze(entry);
  for (const d of detections) {
    const alert = addAlert({
      type: 'anomaly',
      severity: d.severity,
      title: d.ruleName,
      message: d.message,
      agentId: d.agentId,
      connectionId: d.connectionId,
      metadata: d.metadata,
    });
    agentRegistry.recordAnomaly(d.agentId);
    // Dispatch webhook
    webhookDispatcher.dispatch('anomaly.detected', {
      event: 'anomaly.detected',
      timestamp: new Date().toISOString(),
      alert,
      data: d.metadata,
    }).catch(() => {});
  }
  agentRegistry.recordActivity(entry.agentId, entry.action, entry.success);
  // Export to SIEM
  siemExporter.ingest(entry);
};

// === Seed demo data on first user registration ===
let seeded = false;
const originalCreateUser = store.createUser.bind(store);
store.createUser = async function (user: any) {
  await originalCreateUser(user);
  if (!seeded) {
    seeded = true;
    // Create demo connections
    const providers = ['github', 'gmail', 'slack', 'notion', 'calendar'] as const;
    const scopeMap: Record<string, string[]> = {
      github: ['repo:read', 'read:user'],
      gmail: ['gmail.readonly'],
      slack: ['channels:read', 'chat:write'],
      notion: ['read_content'],
      calendar: ['calendar.readonly'],
    };
    for (const p of providers) {
      await store.createConnection({
        id: `conn_demo_${p}`,
        userId: user.id,
        teamId: user.teamId,
        provider: p,
        status: 'active',
        scopes: scopeMap[p],
        encryptedCredentials: Buffer.alloc(0),
        connectionKeyId: `ck_demo_${p}`,
        metadata: {},
      });
    }
  }
};

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   Keygate Demo Server                            ║
║                                                  ║
║   Dashboard:  http://localhost:${port}/preview.html  ║
║   API:        http://localhost:${port}/api            ║
║   Health:     http://localhost:${port}/health         ║
║                                                  ║
║   Running in-memory (no database required)       ║
║                                                  ║
╚══════════════════════════════════════════════════╝
`);
});
