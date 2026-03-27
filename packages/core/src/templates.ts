/**
 * Pre-built templates for quick setup of agents, policies, webhooks,
 * MCP server configurations, and compliance requirements.
 */

import type { AgentPermissionBoundary } from './agents.js';
import type { PolicyCondition } from './policy.js';

// ─── Agent Role Templates ───

export interface AgentRoleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'development' | 'productivity' | 'sales' | 'support' | 'data' | 'ops' | 'content';
  providers: string[];
  permissionBoundary: AgentPermissionBoundary;
  recommendedTTL: number;
  initialTrustScore: number;
}

export const AGENT_ROLE_TEMPLATES: AgentRoleTemplate[] = [
  {
    id: 'coding-assistant',
    name: 'Coding Assistant',
    description: 'Code reviews, PR analysis, and repository management',
    icon: '💻',
    category: 'development',
    providers: ['github', 'jira'],
    permissionBoundary: { allowedProviders: ['github', 'jira'], maxTokenTTL: 3600, maxConcurrentTokens: 5, allowedActions: ['read', 'write'], requireApproval: false },
    recommendedTTL: 3600,
    initialTrustScore: 50,
  },
  {
    id: 'email-assistant',
    name: 'Email Assistant',
    description: 'Inbox summarization and calendar management',
    icon: '📧',
    category: 'productivity',
    providers: ['gmail', 'calendar'],
    permissionBoundary: { allowedProviders: ['gmail', 'calendar'], maxTokenTTL: 1800, maxConcurrentTokens: 2, allowedActions: ['read'], requireApproval: true },
    recommendedTTL: 1800,
    initialTrustScore: 50,
  },
  {
    id: 'sales-agent',
    name: 'Sales Agent',
    description: 'CRM updates, lead management, and team notifications',
    icon: '📊',
    category: 'sales',
    providers: ['salesforce', 'hubspot', 'slack'],
    permissionBoundary: { allowedProviders: ['salesforce', 'hubspot', 'slack'], maxTokenTTL: 3600, maxConcurrentTokens: 5, allowedActions: ['read', 'write'], requireApproval: false },
    recommendedTTL: 3600,
    initialTrustScore: 50,
  },
  {
    id: 'support-agent',
    name: 'Support Agent',
    description: 'Ticket management and customer communication',
    icon: '🎧',
    category: 'support',
    providers: ['slack'],
    permissionBoundary: { allowedProviders: ['slack'], maxTokenTTL: 3600, maxConcurrentTokens: 3, allowedActions: ['read', 'write'], requireApproval: false },
    recommendedTTL: 3600,
    initialTrustScore: 50,
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Query databases, analyze spreadsheets, update documentation',
    icon: '📈',
    category: 'data',
    providers: ['google_drive', 'notion'],
    permissionBoundary: { allowedProviders: ['google_drive', 'notion'], maxTokenTTL: 7200, maxConcurrentTokens: 3, allowedActions: ['read', 'write'], requireApproval: false },
    recommendedTTL: 7200,
    initialTrustScore: 50,
  },
  {
    id: 'devops-agent',
    name: 'DevOps Agent',
    description: 'Infrastructure monitoring and deployment management',
    icon: '🔧',
    category: 'ops',
    providers: ['github'],
    permissionBoundary: { allowedProviders: ['github'], maxTokenTTL: 1800, maxConcurrentTokens: 2, allowedActions: ['read'], requireApproval: true },
    recommendedTTL: 1800,
    initialTrustScore: 30,
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Draft and publish content across platforms',
    icon: '✍️',
    category: 'content',
    providers: ['notion'],
    permissionBoundary: { allowedProviders: ['notion'], maxTokenTTL: 3600, maxConcurrentTokens: 3, allowedActions: ['read', 'write'], requireApproval: false },
    recommendedTTL: 3600,
    initialTrustScore: 50,
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Search and synthesize information from knowledge bases',
    icon: '🔍',
    category: 'data',
    providers: ['google_drive', 'notion'],
    permissionBoundary: { allowedProviders: ['google_drive', 'notion'], maxTokenTTL: 7200, maxConcurrentTokens: 3, allowedActions: ['read'], requireApproval: false },
    recommendedTTL: 7200,
    initialTrustScore: 60,
  },
];

// ─── Policy Templates ───

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'access-control' | 'time-based' | 'risk' | 'compliance';
  effect: 'deny' | 'require_approval' | 'allow';
  conditions: PolicyCondition[];
  priority: number;
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'no-write-after-hours',
    name: 'No Write Access After Hours',
    description: 'Block write and delete operations outside business hours (9am–6pm, Mon–Fri)',
    icon: '🕐',
    category: 'time-based',
    effect: 'deny',
    conditions: [
      { type: 'scope_action', actions: ['write', 'delete'] },
      { type: 'time_window', startHour: 9, endHour: 18, days: [1, 2, 3, 4, 5] },
    ],
    priority: 10,
  },
  {
    id: 'approve-deletes',
    name: 'Require Approval for Deletes',
    description: 'All delete operations require human approval before execution',
    icon: '⚠️',
    category: 'access-control',
    effect: 'require_approval',
    conditions: [{ type: 'scope_action', actions: ['delete'] }],
    priority: 5,
  },
  {
    id: 'block-payment-providers',
    name: 'Block Payment Providers',
    description: 'Deny all agent access to payment services (Stripe)',
    icon: '💳',
    category: 'access-control',
    effect: 'deny',
    conditions: [{ type: 'provider', providers: ['stripe'] }],
    priority: 1,
  },
  {
    id: 'max-1h-ttl',
    name: 'Maximum 1-Hour Token TTL',
    description: 'Deny any token request with TTL exceeding 1 hour',
    icon: '⏱️',
    category: 'risk',
    effect: 'deny',
    conditions: [{ type: 'max_ttl', maxSeconds: 3600 }],
    priority: 20,
  },
  {
    id: 'approve-admin-actions',
    name: 'Require Approval for Admin Actions',
    description: 'All admin-level operations require human approval',
    icon: '🔑',
    category: 'access-control',
    effect: 'require_approval',
    conditions: [{ type: 'scope_action', actions: ['admin'] }],
    priority: 3,
  },
  {
    id: 'restrict-slack-write',
    name: 'Require Approval for Slack Messages',
    description: 'Agents must get approval before posting messages to Slack',
    icon: '💬',
    category: 'access-control',
    effect: 'require_approval',
    conditions: [
      { type: 'provider', providers: ['slack'] },
      { type: 'scope_action', actions: ['write'] },
    ],
    priority: 15,
  },
  {
    id: 'read-only-default',
    name: 'Read-Only by Default',
    description: 'Deny all write, delete, and admin actions unless explicitly allowed',
    icon: '🔒',
    category: 'compliance',
    effect: 'deny',
    conditions: [{ type: 'scope_action', actions: ['write', 'delete', 'admin'] }],
    priority: 100,
  },
  {
    id: 'short-ttl-sensitive',
    name: 'Short TTL for Sensitive Providers',
    description: 'Limit Gmail and Salesforce tokens to 30 minutes max',
    icon: '🛡️',
    category: 'risk',
    effect: 'deny',
    conditions: [
      { type: 'provider', providers: ['gmail', 'salesforce'] },
      { type: 'max_ttl', maxSeconds: 1800 },
    ],
    priority: 8,
  },
];

// ─── MCP Server Security Profiles ───

export interface McpSecurityProfile {
  id: string;
  name: string;
  description: string;
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  approval: string;
  capabilities: {
    filesystemRead: boolean;
    filesystemWrite: boolean;
    networkOutbound: boolean;
    credentials: boolean;
    processSpawn: boolean;
  };
  checks: string[];
}

export const MCP_SECURITY_PROFILES: McpSecurityProfile[] = [
  {
    id: 'read-only-local',
    name: 'Read-Only Local',
    description: 'Filesystem read access within workspace. No network, no credentials.',
    riskTier: 'low',
    approval: 'Automatic',
    capabilities: { filesystemRead: true, filesystemWrite: false, networkOutbound: false, credentials: false, processSpawn: false },
    checks: ['FS-001', 'FS-002', 'FS-004'],
  },
  {
    id: 'api-consumer',
    name: 'API Consumer',
    description: 'Outbound HTTPS to declared domains. Requires OAuth or API keys.',
    riskTier: 'medium',
    approval: 'One-time user confirmation',
    capabilities: { filesystemRead: true, filesystemWrite: false, networkOutbound: true, credentials: true, processSpawn: false },
    checks: ['CRED-001', 'CRED-004', 'NET-001', 'NET-004', 'TOOL-003'],
  },
  {
    id: 'database-accessor',
    name: 'Database Accessor',
    description: 'Database connections with query guardrails. Write operations blocked by default.',
    riskTier: 'high',
    approval: 'Per-session explicit approval',
    capabilities: { filesystemRead: true, filesystemWrite: false, networkOutbound: true, credentials: true, processSpawn: false },
    checks: ['CRED-002', 'CRED-003', 'NET-001', 'FS-002'],
  },
  {
    id: 'full-autonomy',
    name: 'Full Autonomy',
    description: 'Maximum capability. Per-invocation approval required. Full audit logging mandatory.',
    riskTier: 'critical',
    approval: 'Per-invocation with justification',
    capabilities: { filesystemRead: true, filesystemWrite: true, networkOutbound: true, credentials: true, processSpawn: true },
    checks: ['TOOL-001', 'TOOL-003', 'NET-001', 'NET-002', 'FS-001', 'FS-002', 'FS-003', 'PROC-001', 'PROC-002'],
  },
];

// ─── Threat Scenarios ───

export interface ThreatScenario {
  id: string;
  name: string;
  description: string;
  category: 'exfiltration' | 'injection' | 'escalation' | 'abuse' | 'integrity';
  severity: 'medium' | 'high' | 'critical';
  signals: string[];
  response: string;
}

export const THREAT_SCENARIOS: ThreatScenario[] = [
  {
    id: 'THREAT-001',
    name: 'Prompt Injection Credential Theft',
    description: 'Agent accesses credentials for the first time after processing untrusted external content.',
    category: 'injection',
    severity: 'critical',
    signals: ['Credential first-use after untrusted input', 'Credential appears in tool output after external content processing'],
    response: 'Block the tool call. Show user the untrusted content source and credential being accessed.',
  },
  {
    id: 'THREAT-002',
    name: 'Cross-Server Data Exfiltration',
    description: 'Data read from a trusted server is sent outbound through a different server.',
    category: 'exfiltration',
    severity: 'critical',
    signals: ['Read-type tool on Server A followed by write/send-type tool on Server B', 'Content overlap between server outputs and inputs'],
    response: 'Block the outbound call. Show user the data flow path between servers.',
  },
  {
    id: 'THREAT-003',
    name: 'Gradual Scope Escalation',
    description: 'Agent incrementally requests broader permissions over successive sessions.',
    category: 'escalation',
    severity: 'high',
    signals: ['New tools appearing mid-session', 'Expanding file access radius', 'New credential access after session startup'],
    response: 'Freeze tool list at initially approved set. Require re-approval for scope expansion.',
  },
  {
    id: 'THREAT-004',
    name: 'Token Hoarding',
    description: 'Agent requests multiple credentials but only uses a fraction, stockpiling access.',
    category: 'abuse',
    severity: 'high',
    signals: ['Credentials loaded but unused', 'Credential requests unrelated to current task'],
    response: 'Revoke unused credentials. Apply just-in-time credential injection.',
  },
  {
    id: 'THREAT-005',
    name: 'Tool Poisoning via Prompt Injection',
    description: 'Untrusted content in tool results contains instructions that manipulate agent behavior.',
    category: 'injection',
    severity: 'critical',
    signals: ['Injection patterns in tool results', 'Behavioral deviation after processing external content'],
    response: 'Flag toxic content. Pause execution and quarantine suspicious data.',
  },
  {
    id: 'THREAT-006',
    name: 'Server-Side Rug Pull',
    description: 'MCP server changes tool descriptions after initial approval to inject malicious instructions.',
    category: 'integrity',
    severity: 'critical',
    signals: ['Tool description hash differs from approved version', 'Injection language detected in tool descriptions'],
    response: 'Block the mutated tool. Freeze descriptions to approved version. Flag server in registry.',
  },
  {
    id: 'THREAT-007',
    name: 'Shadow Workspace Manipulation',
    description: 'Server writes hidden config files that persist across sessions and influence future agent behavior.',
    category: 'integrity',
    severity: 'high',
    signals: ['Writes to dotfiles, git hooks, IDE config, or agent instruction files'],
    response: 'Block the write. Alert user. Recommend dotfile audit.',
  },
  {
    id: 'THREAT-008',
    name: 'Denial of Wallet',
    description: 'Excessive API calls or sampling requests that run up costs on user accounts.',
    category: 'abuse',
    severity: 'medium',
    signals: ['Tool call rate spike beyond baseline', 'Repetitive identical tool calls (loop detection)'],
    response: 'Throttle or pause the server. Show cost/volume metrics to user.',
  },
];

// ─── Webhook Templates ───

export interface WebhookTemplate {
  id: string;
  name: string;
  description: string;
  format: 'slack' | 'discord' | 'json';
  events: string[];
}

export const WEBHOOK_TEMPLATES: WebhookTemplate[] = [
  {
    id: 'slack-security',
    name: 'Slack Security Alerts',
    description: 'Get notified in Slack when anomalies, denials, or suspensions occur',
    format: 'slack',
    events: ['anomaly.detected', 'token.denied', 'agent.suspended', 'policy.violated'],
  },
  {
    id: 'slack-ops',
    name: 'Slack Operations',
    description: 'Track token issuance, revocation, and connection changes in Slack',
    format: 'slack',
    events: ['token.issued', 'token.revoked', 'connection.revoked'],
  },
  {
    id: 'discord-alerts',
    name: 'Discord Security Alerts',
    description: 'Security notifications delivered to a Discord channel',
    format: 'discord',
    events: ['anomaly.detected', 'token.denied', 'agent.suspended'],
  },
  {
    id: 'all-events-webhook',
    name: 'All Events (JSON)',
    description: 'Forward all events as JSON to a custom endpoint',
    format: 'json',
    events: ['anomaly.detected', 'token.issued', 'token.revoked', 'token.denied', 'agent.suspended', 'policy.violated', 'connection.revoked'],
  },
];

// ─── Exports ───

export function getAgentTemplate(id: string): AgentRoleTemplate | undefined {
  return AGENT_ROLE_TEMPLATES.find((t) => t.id === id);
}

export function getPolicyTemplate(id: string): PolicyTemplate | undefined {
  return POLICY_TEMPLATES.find((t) => t.id === id);
}

export function getMcpProfile(id: string): McpSecurityProfile | undefined {
  return MCP_SECURITY_PROFILES.find((p) => p.id === id);
}

export function getThreatScenario(id: string): ThreatScenario | undefined {
  return THREAT_SCENARIOS.find((t) => t.id === id);
}

export function getWebhookTemplate(id: string): WebhookTemplate | undefined {
  return WEBHOOK_TEMPLATES.find((t) => t.id === id);
}
