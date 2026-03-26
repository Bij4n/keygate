import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { vaultStore } from '../services.js';

const router = Router();

const AuditQuerySchema = z.object({
  connectionId: z.string().optional(),
  agentId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(500).default(50),
  offset: z.coerce.number().min(0).default(0),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = AuditQuerySchema.parse(req.query);
    const result = await vaultStore.queryAuditLog(req.auth!.userId, filters);

    res.json({
      entries: result.entries.map((e) => ({
        id: e.id,
        timestamp: e.timestamp.toISOString(),
        connectionId: e.connectionId,
        tokenId: e.tokenId,
        agentId: e.agentId,
        action: e.action,
        resource: e.resource,
        provider: e.provider,
        metadata: e.metadata,
        success: e.success,
        error: e.error,
      })),
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await vaultStore.getAuditSummary(req.auth!.userId);
      res.json({
        totalRequests: summary.totalRequests,
        uniqueAgents: summary.uniqueAgents,
        activeConnections: summary.activeConnections,
        tokensIssued: summary.tokensIssued,
        tokensRevoked: summary.tokensRevoked,
        last24h: {
          requests: summary.last24hRequests,
          uniqueAgents: summary.last24hAgents,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/export',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = AuditQuerySchema.parse(req.query);
      const result = await vaultStore.queryAuditLog(req.auth!.userId, {
        ...filters,
        limit: 10000,
        offset: 0,
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="keygate-audit-export.json"',
      );
      res.json({
        entries: result.entries,
        total: result.total,
        exported_at: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export { router as auditRouter };
