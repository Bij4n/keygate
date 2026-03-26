import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Provider, EncryptionService } from '@keygate/core';
import { vaultStore, vault } from '../services.js';

const router = Router();

const CreateConnectionSchema = z.object({
  provider: Provider,
  scopes: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connections = await vaultStore.getConnectionsByUser(req.auth!.userId);

    res.json({
      connections: connections.map((c) => ({
        id: c.id,
        provider: c.provider,
        status: c.status,
        scopes: c.scopes,
        metadata: c.metadata,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
      })),
      total: connections.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connection = await vaultStore.getConnection(req.params.id);
    if (!connection || connection.userId !== req.auth!.userId) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    res.json({
      id: connection.id,
      provider: connection.provider,
      status: connection.status,
      scopes: connection.scopes,
      metadata: connection.metadata,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      lastUsedAt: connection.lastUsedAt?.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateConnectionSchema.parse(req.body);
    const connectionId = `conn_${nanoid(24)}`;
    const connectionKeyId = `ck_${nanoid(24)}`;

    await vaultStore.createConnection({
      id: connectionId,
      userId: req.auth!.userId,
      teamId: req.auth!.teamId,
      provider: body.provider,
      status: 'active',
      scopes: body.scopes,
      encryptedCredentials: Buffer.alloc(0),
      connectionKeyId,
      metadata: body.metadata ?? {},
    });

    res.status(201).json({
      id: connectionId,
      provider: body.provider,
      status: 'active',
      scopes: body.scopes,
      oauthUrl: `/oauth/${body.provider}?connection=${connectionId}`,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connection = await vaultStore.getConnection(req.params.id);
      if (!connection || connection.userId !== req.auth!.userId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      await vault.revokeAllTokens(req.params.id);
      await vaultStore.deleteConnection(req.params.id);

      res.json({
        id: req.params.id,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/scopes',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connection = await vaultStore.getConnection(req.params.id);
      if (!connection || connection.userId !== req.auth!.userId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const { scopes } = z
        .object({ scopes: z.array(z.string()) })
        .parse(req.body);

      await vaultStore.updateConnectionCredentials(
        req.params.id,
        connection.encryptedCredentials,
        scopes,
      );

      res.json({
        id: req.params.id,
        scopes,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export { router as connectionsRouter };
