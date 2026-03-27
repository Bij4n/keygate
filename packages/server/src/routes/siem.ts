import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { SiemExporter } from '@keygate/core';
import type { SiemConfig } from '@keygate/core';

const router = Router();
export const siemExporter = new SiemExporter();

const CreateSiemSchema = z.object({
  type: z.enum(['datadog', 'splunk', 'elastic', 'syslog', 'webhook']),
  endpoint: z.string().url(),
  apiKey: z.string().optional(),
  index: z.string().optional(),
  enabled: z.boolean().default(true),
  batchSize: z.number().min(1).max(1000).default(50),
  flushIntervalMs: z.number().min(1000).max(300000).default(30000),
});

router.get('/', (_req: Request, res: Response) => {
  const configs = siemExporter.getConfigs().map((c) => ({
    id: c.id,
    type: c.type,
    endpoint: c.endpoint,
    index: c.index,
    enabled: c.enabled,
    batchSize: c.batchSize,
    flushIntervalMs: c.flushIntervalMs,
  }));
  res.json({ integrations: configs });
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateSiemSchema.parse(req.body);
    const id = `siem_${nanoid(24)}`;
    const config: SiemConfig = { id, ...body };
    siemExporter.addConfig(config);
    res.status(201).json({
      id,
      type: body.type,
      endpoint: body.endpoint,
      enabled: body.enabled,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  siemExporter.removeConfig(req.params.id);
  res.json({ deleted: true });
});

router.post('/flush', async (_req: Request, res: Response) => {
  await siemExporter.flushAll();
  res.json({ flushed: true });
});

export { router as siemRouter };
