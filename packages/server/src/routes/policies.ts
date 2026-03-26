import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Policy, PolicyCondition } from '@keygate/core';

const router = Router();

// In-memory store (replaced by DB in production)
const policies: Map<string, Policy & { userId: string }> = new Map();

const ConditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('agent'), agentIds: z.array(z.string()) }),
  z.object({ type: z.literal('provider'), providers: z.array(z.string()) }),
  z.object({ type: z.literal('scope_action'), actions: z.array(z.enum(['read', 'write', 'delete', 'admin'])) }),
  z.object({ type: z.literal('time_window'), startHour: z.number().min(0).max(23), endHour: z.number().min(0).max(23), days: z.array(z.number().min(0).max(6)) }),
  z.object({ type: z.literal('max_ttl'), maxSeconds: z.number().min(60) }),
  z.object({ type: z.literal('max_usage'), maxUsage: z.number().min(1) }),
  z.object({ type: z.literal('resource'), resources: z.array(z.string()) }),
]);

const CreatePolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().min(0).default(100),
  conditions: z.array(ConditionSchema),
  effect: z.enum(['allow', 'deny', 'require_approval']),
});

router.get('/', (req: Request, res: Response) => {
  const auth = (req as any).auth;
  const userPolicies = Array.from(policies.values())
    .filter((p) => p.userId === auth.userId)
    .map(({ userId, ...p }) => p);
  res.json({ policies: userPolicies });
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = (req as any).auth;
    const body = CreatePolicySchema.parse(req.body);
    const id = `pol_${nanoid(24)}`;
    const policy = { id, ...body, description: body.description ?? '', createdAt: new Date(), userId: auth.userId };
    policies.set(id, policy);
    const { userId, ...result } = policy;
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const auth = (req as any).auth;
  const policy = policies.get(req.params.id);
  if (!policy || policy.userId !== auth.userId) {
    res.status(404).json({ error: 'Policy not found' });
    return;
  }
  policies.delete(req.params.id);
  res.json({ deleted: true });
});

router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = (req as any).auth;
    const policy = policies.get(req.params.id);
    if (!policy || policy.userId !== auth.userId) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    const updates = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      enabled: z.boolean().optional(),
      priority: z.number().optional(),
      conditions: z.array(ConditionSchema).optional(),
      effect: z.enum(['allow', 'deny', 'require_approval']).optional(),
    }).parse(req.body);
    Object.assign(policy, updates);
    const { userId, ...result } = policy;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as policiesRouter };
