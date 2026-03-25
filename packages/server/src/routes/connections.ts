import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Provider } from '@keygate/core';

const router = Router();

const CreateConnectionSchema = z.object({
  provider: Provider,
  scopes: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: query from database filtered by req.auth.userId
    res.json({ connections: [], total: 0 });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // TODO: query from database
    res.json({ id, status: 'active' });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateConnectionSchema.parse(req.body);
    const connectionId = `conn_${nanoid(24)}`;

    // TODO: build OAuth URL and persist pending connection
    res.status(201).json({
      id: connectionId,
      provider: body.provider,
      status: 'pending',
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
      const { id } = req.params;
      // TODO: revoke connection and all associated tokens in database
      res.json({ id, status: 'revoked', revokedAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/scopes',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { scopes } = z
        .object({ scopes: z.array(z.string()) })
        .parse(req.body);
      // TODO: update scopes, may require re-authorization
      res.json({ id, scopes, updatedAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

export { router as connectionsRouter };
