import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { WebhookDispatcher } from '@keygate/core';
import type { WebhookConfig, WebhookEvent } from '@keygate/core';

const router = Router();

export const webhookDispatcher = new WebhookDispatcher();

const VALID_EVENTS: WebhookEvent[] = [
  'anomaly.detected',
  'token.issued',
  'token.revoked',
  'token.denied',
  'agent.suspended',
  'policy.violated',
  'connection.revoked',
];

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.enum(VALID_EVENTS as [string, ...string[]])),
  format: z.enum(['json', 'slack', 'discord']).default('json'),
  enabled: z.boolean().default(true),
});

router.get('/', (_req: Request, res: Response) => {
  const webhooks = webhookDispatcher.listWebhooks().map((w) => ({
    id: w.id,
    url: w.url,
    events: w.events,
    format: w.format,
    enabled: w.enabled,
    failureCount: w.failureCount,
    lastTriggeredAt: w.lastTriggeredAt?.toISOString() ?? null,
    createdAt: w.createdAt.toISOString(),
  }));
  res.json({ webhooks });
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateWebhookSchema.parse(req.body);
    const id = `wh_${nanoid(24)}`;

    const config: WebhookConfig = {
      id,
      url: body.url,
      secret: body.secret,
      events: body.events as WebhookEvent[],
      format: body.format,
      enabled: body.enabled,
      createdAt: new Date(),
      failureCount: 0,
    };

    webhookDispatcher.addWebhook(config);

    res.status(201).json({
      id,
      url: body.url,
      events: body.events,
      format: body.format,
      enabled: body.enabled,
      createdAt: config.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = z
      .object({
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
        format: z.enum(['json', 'slack', 'discord']).optional(),
        enabled: z.boolean().optional(),
      })
      .parse(req.body);

    const result = webhookDispatcher.updateWebhook(req.params.id, updates);
    if (!result) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    res.json({
      id: result.id,
      url: result.url,
      events: result.events,
      format: result.format,
      enabled: result.enabled,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = webhookDispatcher.getWebhook(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }
  webhookDispatcher.removeWebhook(req.params.id);
  res.json({ deleted: true });
});

// Test a webhook by sending a sample payload
router.post('/:id/test', async (req: Request, res: Response) => {
  const config = webhookDispatcher.getWebhook(req.params.id);
  if (!config) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }

  await webhookDispatcher.dispatch('anomaly.detected', {
    event: 'anomaly.detected',
    timestamp: new Date().toISOString(),
    alert: {
      id: 'test_alert',
      type: 'anomaly',
      severity: 'medium',
      title: 'Test Alert',
      message: 'This is a test webhook from Keygate.',
      agentId: 'test-agent',
      metadata: {},
      acknowledged: false,
      createdAt: new Date(),
    },
    data: { test: true },
  });

  res.json({ sent: true });
});

export { router as webhooksRouter };
