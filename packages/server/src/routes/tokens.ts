import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

const IssueTokenSchema = z.object({
  connectionId: z.string(),
  agentId: z.string(),
  scopes: z.array(
    z.object({
      resource: z.string(),
      actions: z.array(z.enum(['read', 'write', 'delete', 'admin'])),
      constraints: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  ttl: z.number().min(60).max(86400).optional(),
  maxUsage: z.number().min(1).optional(),
});

const ResolveTokenSchema = z.object({
  reference: z.string(),
});

router.post(
  '/issue',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = IssueTokenSchema.parse(req.body);

      // TODO: wire up Vault.issueToken()
      res.status(201).json({
        tokenId: 'tok_placeholder',
        reference: 'ref_placeholder',
        expiresAt: new Date(
          Date.now() + (body.ttl ?? 3600) * 1000,
        ).toISOString(),
        scopes: body.scopes,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/resolve',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference } = ResolveTokenSchema.parse(req.body);

      // TODO: wire up Vault.resolveToken()
      res.json({
        accessToken: 'resolved_token_placeholder',
        scopes: [],
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:tokenId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tokenId } = req.params;
      // TODO: wire up Vault.revokeToken()
      res.json({ tokenId, revokedAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/connection/:connectionId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { connectionId } = req.params;
      // TODO: query active tokens from database
      res.json({ tokens: [], connectionId });
    } catch (err) {
      next(err);
    }
  },
);

export { router as tokensRouter };
