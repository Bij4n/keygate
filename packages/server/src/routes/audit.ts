import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

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
    const query = AuditQuerySchema.parse(req.query);

    // TODO: query from database with filters
    res.json({
      entries: [],
      total: 0,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/summary',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: aggregate stats from database
      res.json({
        totalRequests: 0,
        uniqueAgents: 0,
        activeConnections: 0,
        tokensIssued: 0,
        tokensRevoked: 0,
        last24h: {
          requests: 0,
          uniqueAgents: 0,
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
      AuditQuerySchema.parse(req.query);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="keygate-audit-export.json"',
      );
      res.json({ entries: [], exported_at: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

export { router as auditRouter };
