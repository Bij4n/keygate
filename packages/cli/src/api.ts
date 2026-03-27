/**
 * Keygate CLI API client.
 * Reads config from ~/.keygate/config.json or env vars.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface CliConfig {
  apiUrl: string;
  apiKey: string;
  agentId?: string;
}

function loadConfig(): CliConfig {
  const configPath = join(homedir(), '.keygate', 'config.json');
  let fileConfig: Partial<CliConfig> = {};

  if (existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {}
  }

  return {
    apiUrl: process.env.KEYGATE_API_URL || fileConfig.apiUrl || 'http://localhost:3100',
    apiKey: process.env.KEYGATE_API_KEY || fileConfig.apiKey || '',
    agentId: process.env.KEYGATE_AGENT_ID || fileConfig.agentId,
  };
}

const config = loadConfig();

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.apiUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `ApiKey ${config.apiKey}`;
  }

  const token = getStoredToken();
  if (token && !config.apiKey) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || body.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}

function getStoredToken(): string | null {
  const tokenPath = join(homedir(), '.keygate', 'token');
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, 'utf-8').trim();
  }
  return null;
}

export function getConfig(): CliConfig {
  return config;
}
