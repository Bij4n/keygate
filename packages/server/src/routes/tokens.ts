import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { vault, vaultStore } from '../services.js';

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
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ResolveTokenSchema = z.object({
  reference: z.string(),
});

router.post(
  '/issue',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = IssueTokenSchema.parse(req.body);

      const connection = await vaultStore.getConnection(body.connectionId);
      if (!connection || connection.userId !== req.auth!.userId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const result = await vault.issueToken({
        connectionId: body.connectionId,
        agentId: body.agentId,
        scopes: body.scopes,
        ttl: body.ttl,
        maxUsage: body.maxUsage,
        metadata: body.metadata,
      });

      res.status(201).json({
        tokenId: result.tokenId,
        reference: result.reference,
        expiresAt: result.expiresAt.toISOString(),
        scopes: result.scopes,
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
      const result = await vault.resolveToken(reference);

      res.json({
        accessToken: result.accessToken,
        scopes: result.scopes,
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
      await vault.revokeToken(tokenId, req.auth!.userId);
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

      const connection = await vaultStore.getConnection(connectionId);
      if (!connection || connection.userId !== req.auth!.userId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const tokens = await vaultStore.listTokensByConnection(connectionId);

      res.json({
        tokens: tokens.map((t) => ({
          id: t.id,
          agentId: t.agentId,
          scopes: t.scopes,
          issuedAt: t.issuedAt.toISOString(),
          expiresAt: t.expiresAt.toISOString(),
          usageCount: t.usageCount,
          maxUsage: t.maxUsage,
        })),
        connectionId,
      });
    } catch (err) {
      next(err);
    }
  },
);

export { router as tokensRouter };
