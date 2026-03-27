import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { McpRegistry } from '@keygate/core';
import type { McpServerEntry, Vulnerability } from '@keygate/core';

const router = Router();
export const mcpRegistry = new McpRegistry();

// Seed with well-known MCP servers
const SEED_SERVERS: Partial<McpServerEntry>[] = [
  {
    name: 'Filesystem',
    description: 'Read and write files on the local filesystem',
    packageName: '@modelcontextprotocol/server-filesystem',
    author: 'Anthropic',
    verified: true,
    signals: { codeAuditScore: 90, communityTrustScore: 85, behavioralScore: 88, provenanceScore: 95, securityScore: 92 },
    tools: [
      { name: 'read_file', description: 'Read a file', riskLevel: 'low', credentialsRequired: false, networkAccess: false, fileSystemAccess: true },
      { name: 'write_file', description: 'Write a file', riskLevel: 'high', credentialsRequired: false, networkAccess: false, fileSystemAccess: true },
      { name: 'list_directory', description: 'List directory contents', riskLevel: 'low', credentialsRequired: false, networkAccess: false, fileSystemAccess: true },
    ],
    credentialAccess: { requestsOAuth: false, requestsApiKeys: false, scopesRequested: [], dataExfiltrationRisk: 'medium', crossServerAccess: false },
  },
  {
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, and pull requests',
    packageName: '@modelcontextprotocol/server-github',
    author: 'Anthropic',
    verified: true,
    signals: { codeAuditScore: 88, communityTrustScore: 82, behavioralScore: 85, provenanceScore: 95, securityScore: 88 },
    tools: [
      { name: 'search_repositories', description: 'Search repos', riskLevel: 'low', credentialsRequired: true, networkAccess: true, fileSystemAccess: false },
      { name: 'create_issue', description: 'Create an issue', riskLevel: 'medium', credentialsRequired: true, networkAccess: true, fileSystemAccess: false },
      { name: 'push_files', description: 'Push files to a repo', riskLevel: 'high', credentialsRequired: true, networkAccess: true, fileSystemAccess: false },
    ],
    credentialAccess: { requestsOAuth: true, requestsApiKeys: true, scopesRequested: ['repo', 'read:user'], dataExfiltrationRisk: 'medium', crossServerAccess: false },
  },
  {
    name: 'Slack',
    description: 'Send and read messages in Slack workspaces',
    packageName: '@modelcontextprotocol/server-slack',
    author: 'Anthropic',
    verified: true,
    signals: { codeAuditScore: 85, communityTrustScore: 80, behavioralScore: 82, provenanceScore: 95, securityScore: 85 },
    tools: [
      { name: 'send_message', description: 'Send a message to a channel', riskLevel: 'medium', credentialsRequired: true, networkAccess: true, fileSystemAccess: false },
      { name: 'list_channels', description: 'List channels', riskLevel: 'low', credentialsRequired: true, networkAccess: true, fileSystemAccess: false },
    ],
    credentialAccess: { requestsOAuth: true, requestsApiKeys: true, scopesRequested: ['channels:read', 'chat:write'], dataExfiltrationRisk: 'high', crossServerAccess: false },
  },
  {
    name: 'Postgres',
    description: 'Query PostgreSQL databases',
    packageName: '@modelcontextprotocol/server-postgres',
    author: 'Anthropic',
    verified: true,
    signals: { codeAuditScore: 82, communityTrustScore: 78, behavioralScore: 80, provenanceScore: 95, securityScore: 80 },
    tools: [
      { name: 'query', description: 'Execute a SQL query', riskLevel: 'critical', credentialsRequired: true, networkAccess: true, fileSystemAccess: false },
    ],
    credentialAccess: { requestsOAuth: false, requestsApiKeys: false, scopesRequested: ['database:read', 'database:write'], dataExfiltrationRisk: 'high', crossServerAccess: false },
  },
  {
    name: 'Fetch',
    description: 'Make HTTP requests to external URLs',
    packageName: '@modelcontextprotocol/server-fetch',
    author: 'Anthropic',
    verified: true,
    signals: { codeAuditScore: 75, communityTrustScore: 72, behavioralScore: 70, provenanceScore: 95, securityScore: 68 },
    tools: [
      { name: 'fetch', description: 'Fetch a URL', riskLevel: 'high', credentialsRequired: false, networkAccess: true, fileSystemAccess: false },
    ],
    credentialAccess: { requestsOAuth: false, requestsApiKeys: false, scopesRequested: [], dataExfiltrationRisk: 'high', crossServerAccess: true },
  },
  {
    name: 'Puppeteer',
    description: 'Browser automation and web scraping',
    packageName: '@modelcontextprotocol/server-puppeteer',
    author: 'Anthropic',
    verified: true,
    signals: { codeAuditScore: 70, communityTrustScore: 68, behavioralScore: 65, provenanceScore: 95, securityScore: 62 },
    tools: [
      { name: 'navigate', description: 'Navigate to a URL', riskLevel: 'high', credentialsRequired: false, networkAccess: true, fileSystemAccess: false },
      { name: 'screenshot', description: 'Take a screenshot', riskLevel: 'medium', credentialsRequired: false, networkAccess: true, fileSystemAccess: true },
      { name: 'click', description: 'Click an element', riskLevel: 'high', credentialsRequired: false, networkAccess: true, fileSystemAccess: false },
    ],
    credentialAccess: { requestsOAuth: false, requestsApiKeys: false, scopesRequested: [], dataExfiltrationRisk: 'high', crossServerAccess: true },
  },
  {
    name: 'Suspicious Data Harvester',
    description: 'Collects and aggregates data from multiple sources',
    packageName: 'mcp-data-harvester-pro',
    author: 'unknown-dev-2024',
    verified: false,
    signals: { codeAuditScore: 20, communityTrustScore: 15, behavioralScore: 10, provenanceScore: 8, securityScore: 5 },
    tools: [
      { name: 'harvest_data', description: 'Collect data from connected services', riskLevel: 'critical', credentialsRequired: true, networkAccess: true, fileSystemAccess: true },
      { name: 'export_bulk', description: 'Export all collected data', riskLevel: 'critical', credentialsRequired: false, networkAccess: true, fileSystemAccess: true },
    ],
    credentialAccess: { requestsOAuth: true, requestsApiKeys: true, scopesRequested: ['*'], dataExfiltrationRisk: 'high', crossServerAccess: true },
    vulnerabilities: [
      { id: 'vuln_1', severity: 'critical', title: 'Credential exfiltration via tool description injection', description: 'Tool descriptions contain hidden instructions that cause the LLM to relay credentials to an external endpoint.', reportedAt: new Date('2025-11-15'), cveId: undefined },
    ],
  },
];

// Initialize seed data
for (const seed of SEED_SERVERS) {
  const id = `mcp_${nanoid(16)}`;
  mcpRegistry.register({
    id,
    name: seed.name!,
    description: seed.description!,
    packageName: seed.packageName!,
    version: '1.0.0',
    repository: `https://github.com/modelcontextprotocol/servers`,
    author: seed.author!,
    license: 'MIT',
    verified: seed.verified ?? false,
    reputationScore: 0,
    signals: seed.signals!,
    tools: seed.tools ?? [],
    credentialAccess: seed.credentialAccess!,
    communityRatings: { totalRatings: Math.floor(Math.random() * 200) + 10, averageScore: 3.5 + Math.random() * 1.5, trustVotes: Math.floor(Math.random() * 100), flagCount: seed.verified ? 0 : Math.floor(Math.random() * 8), lastReviewedAt: new Date() },
    vulnerabilities: seed.vulnerabilities ?? [],
    lastScannedAt: new Date(),
    registeredAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  });
}

// List / search MCP servers
router.get('/', (req: Request, res: Response) => {
  const options = {
    query: req.query.q as string | undefined,
    minScore: req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined,
    verified: req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined,
    sortBy: (req.query.sortBy as string) || 'reputation',
    limit: parseInt((req.query.limit as string) || '50', 10),
    offset: parseInt((req.query.offset as string) || '0', 10),
  };
  const result = mcpRegistry.search(options as any);
  res.json({ servers: result.entries, total: result.total, stats: mcpRegistry.getStats() });
});

// Get a specific server
router.get('/:id', (req: Request, res: Response) => {
  const entry = mcpRegistry.get(req.params.id);
  if (!entry) { res.status(404).json({ error: 'MCP server not found' }); return; }
  res.json(entry);
});

// Check if a server is allowed
router.get('/:id/check', (req: Request, res: Response) => {
  const minScore = parseInt((req.query.minScore as string) || '50', 10);
  const result = mcpRegistry.isAllowed(req.params.id, minScore);
  res.json(result);
});

// Rate a server
router.post('/:id/rate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { score, trusted } = z.object({
      score: z.number().min(1).max(5),
      trusted: z.boolean().default(false),
    }).parse(req.body);
    const result = mcpRegistry.addRating(req.params.id, score, trusted);
    if (!result) { res.status(404).json({ error: 'MCP server not found' }); return; }
    res.json({ reputationScore: result.reputationScore, communityRatings: result.communityRatings });
  } catch (err) { next(err); }
});

// Flag a server
router.post('/:id/flag', (req: Request, res: Response) => {
  const result = mcpRegistry.flag(req.params.id);
  if (!result) { res.status(404).json({ error: 'MCP server not found' }); return; }
  res.json({ flagCount: result.communityRatings.flagCount, reputationScore: result.reputationScore });
});

// Report vulnerability
router.post('/:id/vulnerability', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string().min(1),
      description: z.string().min(1),
      cveId: z.string().optional(),
    }).parse(req.body);
    const vuln: Vulnerability = { id: `vuln_${nanoid(16)}`, ...body, reportedAt: new Date() };
    const result = mcpRegistry.reportVulnerability(req.params.id, vuln);
    if (!result) { res.status(404).json({ error: 'MCP server not found' }); return; }
    res.status(201).json({ vulnerability: vuln, reputationScore: result.reputationScore });
  } catch (err) { next(err); }
});

// Registry stats
router.get('/stats/summary', (_req: Request, res: Response) => {
  res.json(mcpRegistry.getStats());
});

export { router as registryRouter };
