import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApprovalManager } from '@keygate/core';
import type { ApprovalRequest } from '@keygate/core';

const router = Router();

// Shared approval manager (in production, backed by DB)
export const approvalManager = new ApprovalManager();

router.get('/', (req: Request, res: Response) => {
  const pending = approvalManager.getPendingRequests();
  res.json({ approvals: pending, stats: approvalManager.getStats() });
});

router.get('/:id', (req: Request, res: Response) => {
  const request = approvalManager.getRequest(req.params.id);
  if (!request) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  res.json(request);
});

router.post(
  '/:id/decide',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = (req as any).auth;
      const { decision, reason } = z
        .object({
          decision: z.enum(['approved', 'denied']),
          reason: z.string().optional(),
        })
        .parse(req.body);

      const result = approvalManager.decide({
        requestId: req.params.id,
        decision,
        decidedBy: auth.userId,
        reason,
      });

      if (!result) {
        res.status(404).json({ error: 'Request not found or already decided' });
        return;
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export { router as approvalsRouter };
