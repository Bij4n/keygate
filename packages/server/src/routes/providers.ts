import { Router, Request, Response } from 'express';
import { listProviders, getProvider } from '@keygate/core';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const providers = listProviders().map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    scopes: p.availableScopes,
  }));
  res.json({ providers });
});

router.get('/:id', (req: Request, res: Response) => {
  const provider = getProvider(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }
  res.json(provider);
});

export { router as providersRouter };
