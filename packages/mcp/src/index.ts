#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PROVIDERS } from '@keygate/core';

const API_URL = process.env.KEYGATE_API_URL ?? 'http://localhost:3100';
const API_KEY = process.env.KEYGATE_API_KEY ?? '';

async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `API request failed: ${response.status}`);
  }

  return response.json();
}

const server = new McpServer({
  name: 'keygate',
  version: '0.1.0',
});

server.tool(
  'keygate_list_connections',
  'List all active service connections available through Keygate',
  {},
  async () => {
    try {
      const data = await apiRequest('/api/connections');
      const connections = data.connections.map((c: any) => ({
        id: c.id,
        provider: c.provider,
        status: c.status,
        scopes: c.scopes,
        lastUsed: c.last_used_at,
      }));
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(connections, null, 2) },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'keygate_request_token',
  'Request a scoped, time-limited access token for a connected service. Returns an opaque reference that can be resolved to an actual token.',
  {
    connectionId: z
      .string()
      .describe('The connection ID to request access for'),
    scopes: z
      .array(
        z.object({
          resource: z
            .string()
            .describe('The resource to access (e.g., "repos", "messages")'),
          actions: z
            .array(z.enum(['read', 'write', 'delete', 'admin']))
            .describe('Permitted actions'),
        }),
      )
      .describe('Requested access scopes'),
    ttl: z
      .number()
      .optional()
      .describe('Token lifetime in seconds (default: 3600, max: 86400)'),
    reason: z
      .string()
      .optional()
      .describe('Why this access is needed (logged for audit)'),
  },
  async ({ connectionId, scopes, ttl, reason }) => {
    try {
      const data = await apiRequest('/api/tokens/issue', {
        method: 'POST',
        body: JSON.stringify({
          connectionId,
          agentId: 'mcp-agent',
          scopes,
          ttl,
          metadata: reason ? { reason } : undefined,
        }),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                tokenId: data.tokenId,
                reference: data.reference,
                expiresAt: data.expiresAt,
                scopes: data.scopes,
                note: 'Use keygate_resolve_token with the reference to get the actual access token when ready to make API calls.',
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'keygate_resolve_token',
  'Resolve a token reference to get the actual access token. Each resolution is logged. Only call this immediately before making an API request.',
  {
    reference: z
      .string()
      .describe('The opaque token reference from keygate_request_token'),
  },
  async ({ reference }) => {
    try {
      const data = await apiRequest('/api/tokens/resolve', {
        method: 'POST',
        body: JSON.stringify({ reference }),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                accessToken: data.accessToken,
                scopes: data.scopes,
                warning:
                  'This token is scoped and time-limited. Do not store it or include it in conversation history.',
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'keygate_revoke_token',
  'Revoke an active token. Use this when done with a credential or if suspicious activity is detected.',
  {
    tokenId: z.string().describe('The token ID to revoke'),
  },
  async ({ tokenId }) => {
    try {
      await apiRequest(`/api/tokens/${tokenId}`, { method: 'DELETE' });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Token ${tokenId} has been revoked.`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'keygate_list_providers',
  'List all available service providers that can be connected through Keygate',
  {},
  async () => {
    try {
      const providers = Object.values(PROVIDERS).map((p) => ({
        id: p.id,
        name: p.name,
        scopes: p.availableScopes.map((s) => ({
          value: s.value,
          label: s.label,
          risk: s.risk,
        })),
      }));
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(providers, null, 2) },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

server.tool(
  'keygate_audit_log',
  'View recent credential access audit entries',
  {
    connectionId: z
      .string()
      .optional()
      .describe('Filter by connection ID'),
    limit: z
      .number()
      .optional()
      .describe('Number of entries to return (default: 20)'),
  },
  async ({ connectionId, limit }) => {
    try {
      const params = new URLSearchParams();
      if (connectionId) params.set('connectionId', connectionId);
      if (limit) params.set('limit', String(limit));

      const data = await apiRequest(`/api/audit?${params}`);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(data.entries, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Failed to start Keygate MCP server:', err);
  process.exit(1);
});
