import { createHmac } from 'node:crypto';
import type { Alert } from './anomaly.js';

export interface WebhookConfig {
  id: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  format: 'json' | 'slack' | 'discord';
  enabled: boolean;
  createdAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

export type WebhookEvent =
  | 'anomaly.detected'
  | 'token.issued'
  | 'token.revoked'
  | 'token.denied'
  | 'agent.suspended'
  | 'policy.violated'
  | 'connection.revoked';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  alert?: Alert;
  data: Record<string, unknown>;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🚨',
  high: '⚠️',
  medium: '🔔',
  low: 'ℹ️',
};

export class WebhookDispatcher {
  private configs: Map<string, WebhookConfig> = new Map();
  private retryDelay = 5000;
  private maxRetries = 3;

  addWebhook(config: WebhookConfig): void {
    this.configs.set(config.id, config);
  }

  removeWebhook(id: string): void {
    this.configs.delete(id);
  }

  getWebhook(id: string): WebhookConfig | undefined {
    return this.configs.get(id);
  }

  listWebhooks(): WebhookConfig[] {
    return Array.from(this.configs.values());
  }

  updateWebhook(id: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
    const config = this.configs.get(id);
    if (!config) return null;
    Object.assign(config, updates);
    return config;
  }

  async dispatch(event: WebhookEvent, payload: WebhookPayload): Promise<void> {
    const matching = Array.from(this.configs.values()).filter(
      (c) => c.enabled && c.events.includes(event),
    );

    await Promise.allSettled(
      matching.map((config) => this.send(config, payload)),
    );
  }

  private async send(
    config: WebhookConfig,
    payload: WebhookPayload,
    attempt = 1,
  ): Promise<void> {
    const body = this.formatPayload(config.format, payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Keygate-Webhook/1.0',
    };

    if (config.secret) {
      const signature = createHmac('sha256', config.secret)
        .update(JSON.stringify(body))
        .digest('hex');
      headers['X-Keygate-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok && attempt < this.maxRetries) {
        await new Promise((r) => setTimeout(r, this.retryDelay * attempt));
        return this.send(config, payload, attempt + 1);
      }

      if (response.ok) {
        config.lastTriggeredAt = new Date();
        config.failureCount = 0;
      } else {
        config.failureCount++;
      }
    } catch {
      config.failureCount++;
      if (attempt < this.maxRetries) {
        await new Promise((r) => setTimeout(r, this.retryDelay * attempt));
        return this.send(config, payload, attempt + 1);
      }
    }
  }

  private formatPayload(
    format: WebhookConfig['format'],
    payload: WebhookPayload,
  ): Record<string, unknown> {
    switch (format) {
      case 'slack':
        return this.formatSlack(payload);
      case 'discord':
        return this.formatDiscord(payload);
      case 'json':
      default:
        return payload as unknown as Record<string, unknown>;
    }
  }

  private formatSlack(payload: WebhookPayload): Record<string, unknown> {
    const severity = payload.alert?.severity ?? 'low';
    const emoji = SEVERITY_EMOJI[severity] ?? 'ℹ️';
    const color = SEVERITY_COLORS[severity] ?? '#3b82f6';

    return {
      text: `${emoji} Keygate Alert: ${payload.alert?.title ?? payload.event}`,
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${payload.alert?.title ?? payload.event}*\n${payload.alert?.message ?? JSON.stringify(payload.data)}`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Severity:* ${severity} | *Agent:* ${payload.alert?.agentId ?? 'N/A'} | *Time:* ${payload.timestamp}`,
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private formatDiscord(payload: WebhookPayload): Record<string, unknown> {
    const severity = payload.alert?.severity ?? 'low';
    const color = parseInt(
      (SEVERITY_COLORS[severity] ?? '#3b82f6').replace('#', ''),
      16,
    );

    return {
      embeds: [
        {
          title: `${SEVERITY_EMOJI[severity] ?? 'ℹ️'} ${payload.alert?.title ?? payload.event}`,
          description:
            payload.alert?.message ?? JSON.stringify(payload.data),
          color,
          fields: [
            { name: 'Severity', value: severity, inline: true },
            {
              name: 'Agent',
              value: payload.alert?.agentId ?? 'N/A',
              inline: true,
            },
            { name: 'Event', value: payload.event, inline: true },
          ],
          timestamp: payload.timestamp,
          footer: { text: 'Keygate' },
        },
      ],
    };
  }
}
