/**
 * SIEM (Security Information and Event Management) export adapters.
 *
 * Transforms Keygate audit events into formats consumable by
 * Datadog, Splunk, Elastic, and generic syslog/webhook endpoints.
 */

import type { AuditEntry } from './types.js';

export interface SiemConfig {
  id: string;
  type: 'datadog' | 'splunk' | 'elastic' | 'syslog' | 'webhook';
  endpoint: string;
  apiKey?: string;
  index?: string;
  enabled: boolean;
  batchSize: number;
  flushIntervalMs: number;
}

export interface SiemEvent {
  timestamp: string;
  source: 'keygate';
  service: string;
  level: 'info' | 'warn' | 'error' | 'critical';
  event: string;
  agent_id: string;
  connection_id: string;
  provider: string;
  success: boolean;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

export class SiemExporter {
  private configs: Map<string, SiemConfig> = new Map();
  private buffer: Map<string, SiemEvent[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  addConfig(config: SiemConfig): void {
    this.configs.set(config.id, config);
    this.buffer.set(config.id, []);

    if (config.enabled) {
      const timer = setInterval(() => this.flush(config.id), config.flushIntervalMs);
      this.timers.set(config.id, timer);
    }
  }

  removeConfig(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearInterval(timer);
    this.timers.delete(id);
    this.configs.delete(id);
    this.buffer.delete(id);
  }

  getConfigs(): SiemConfig[] {
    return Array.from(this.configs.values());
  }

  ingest(entry: AuditEntry): void {
    const event = this.transformEvent(entry);

    for (const [id, config] of this.configs) {
      if (!config.enabled) continue;
      const buf = this.buffer.get(id)!;
      buf.push(event);

      if (buf.length >= config.batchSize) {
        this.flush(id);
      }
    }
  }

  async flush(configId: string): Promise<void> {
    const config = this.configs.get(configId);
    const buf = this.buffer.get(configId);
    if (!config || !buf || buf.length === 0) return;

    const events = buf.splice(0, buf.length);

    try {
      switch (config.type) {
        case 'datadog':
          await this.sendDatadog(config, events);
          break;
        case 'splunk':
          await this.sendSplunk(config, events);
          break;
        case 'elastic':
          await this.sendElastic(config, events);
          break;
        case 'syslog':
          await this.sendSyslog(config, events);
          break;
        case 'webhook':
          await this.sendWebhook(config, events);
          break;
      }
    } catch (err) {
      console.error(`SIEM export to ${config.type} failed:`, err);
      // Re-queue events on failure (up to 2x batch size)
      if (buf.length < config.batchSize * 2) {
        buf.unshift(...events);
      }
    }
  }

  async flushAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.configs.keys()).map((id) => this.flush(id)),
    );
  }

  shutdown(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  private transformEvent(entry: AuditEntry): SiemEvent {
    const level = this.getLevel(entry);
    return {
      timestamp: entry.timestamp.toISOString(),
      source: 'keygate',
      service: 'keygate-broker',
      level,
      event: entry.action,
      agent_id: entry.agentId,
      connection_id: entry.connectionId,
      token_id: entry.tokenId,
      provider: entry.provider,
      resource: entry.resource,
      success: entry.success,
      ip: entry.ip,
      user_agent: entry.userAgent,
      framework_id: entry.frameworkId,
      session_id: entry.sessionId,
      latency_ms: entry.requestLatencyMs,
      error: entry.error,
      metadata: entry.metadata,
    };
  }

  private getLevel(entry: AuditEntry): SiemEvent['level'] {
    if (!entry.success) return 'error';
    if (entry.action === 'token.denied') return 'warn';
    if (entry.action.includes('revoked')) return 'warn';
    return 'info';
  }

  private async sendDatadog(config: SiemConfig, events: SiemEvent[]): Promise<void> {
    const logs = events.map((e) => ({
      ...e,
      ddsource: 'keygate',
      ddtags: `env:production,service:keygate,provider:${e.provider}`,
      hostname: 'keygate-broker',
      message: `${e.event} by ${e.agent_id} on ${e.provider}`,
    }));

    await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': config.apiKey ?? '',
      },
      body: JSON.stringify(logs),
    });
  }

  private async sendSplunk(config: SiemConfig, events: SiemEvent[]): Promise<void> {
    const payload = events
      .map((e) => JSON.stringify({ event: e, sourcetype: 'keygate', index: config.index ?? 'main' }))
      .join('\n');

    await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Splunk ${config.apiKey ?? ''}`,
      },
      body: payload,
    });
  }

  private async sendElastic(config: SiemConfig, events: SiemEvent[]): Promise<void> {
    const index = config.index ?? 'keygate-events';
    const lines = events.flatMap((e) => [
      JSON.stringify({ index: { _index: index } }),
      JSON.stringify(e),
    ]);

    await fetch(`${config.endpoint}/_bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
        ...(config.apiKey ? { Authorization: `ApiKey ${config.apiKey}` } : {}),
      },
      body: lines.join('\n') + '\n',
    });
  }

  private async sendSyslog(config: SiemConfig, events: SiemEvent[]): Promise<void> {
    const messages = events.map((e) => {
      const pri = e.level === 'critical' ? 2 : e.level === 'error' ? 3 : e.level === 'warn' ? 4 : 6;
      return `<${pri}>1 ${e.timestamp} keygate-broker keygate - - - ${JSON.stringify(e)}`;
    });

    await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  }

  private async sendWebhook(config: SiemConfig, events: SiemEvent[]): Promise<void> {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
      },
      body: JSON.stringify({ source: 'keygate', events }),
    });
  }
}
