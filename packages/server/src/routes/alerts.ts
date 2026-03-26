import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Alert } from '@keygate/core';
import { nanoid } from 'nanoid';

const router = Router();

// In-memory alert store
const alerts: Alert[] = [];

export function addAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>): Alert {
  const full: Alert = {
    id: `alert_${nanoid(24)}`,
    ...alert,
    acknowledged: false,
    createdAt: new Date(),
  };
  alerts.unshift(full);
  // Keep last 1000 alerts
  if (alerts.length > 1000) alerts.pop();
  return full;
}

export function getUnacknowledgedCount(): number {
  return alerts.filter((a) => !a.acknowledged).length;
}

router.get('/', (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit as string) ?? '50', 10);
  const unacknowledgedOnly = req.query.unacknowledged === 'true';

  let filtered = alerts;
  if (unacknowledgedOnly) {
    filtered = alerts.filter((a) => !a.acknowledged);
  }

  res.json({
    alerts: filtered.slice(0, limit),
    total: filtered.length,
    unacknowledged: alerts.filter((a) => !a.acknowledged).length,
  });
});

router.post('/:id/acknowledge', (req: Request, res: Response) => {
  const alert = alerts.find((a) => a.id === req.params.id);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  alert.acknowledged = true;
  alert.acknowledgedAt = new Date();
  res.json(alert);
});

router.post('/acknowledge-all', (_req: Request, res: Response) => {
  const now = new Date();
  let count = 0;
  for (const alert of alerts) {
    if (!alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedAt = now;
      count++;
    }
  }
  res.json({ acknowledged: count });
});

export { router as alertsRouter };
