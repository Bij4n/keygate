import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { AgentRegistry, DEFAULT_PERMISSION_BOUNDARY } from '@keygate/core';
import type { RegisteredAgent, AgentPermissionBoundary } from '@keygate/core';

const router = Router();

// Shared agent registry (in production, backed by DB)
export const agentRegistry = new AgentRegistry();

const PermissionBoundarySchema = z.object({
  allowedProviders: z.array(z.string()).default([]),
  maxTokenTTL: z.number().min(60).default(3600),
  maxConcurrentTokens: z.number().min(1).default(10),
  allowedActions: z.array(z.enum(['read', 'write', 'delete', 'admin'])).default(['read']),
  requireApproval: z.boolean().default(false),
});

const RegisterAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionBoundary: PermissionBoundarySchema.optional(),
});

router.get('/', (req: Request, res: Response) => {
  const auth = (req as any).auth;
  const agents = agentRegistry.getByOwner(auth.userId);
  res.json({ agents });
});

router.get('/:id', (req: Request, res: Response) => {
  const agent = agentRegistry.get(req.params.id);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  res.json(agent);
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = (req as any).auth;
    const body = RegisterAgentSchema.parse(req.body);
    const agentId = `agent_${nanoid(24)}`;

    const agent: RegisteredAgent = {
      id: agentId,
      name: body.name,
      description: body.description ?? '',
      ownerId: auth.userId,
      teamId: auth.teamId,
      status: 'active',
      trustScore: 50,
      permissionBoundary: body.permissionBoundary ?? DEFAULT_PERMISSION_BOUNDARY,
      stats: {
        totalTokensIssued: 0,
        totalTokensRevoked: 0,
        totalRequests: 0,
        failedRequests: 0,
        anomaliesDetected: 0,
      },
      registeredAt: new Date(),
    };

    agentRegistry.register(agent);
    res.status(201).json(agent);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = (req as any).auth;
    const agent = agentRegistry.get(req.params.id);
    if (!agent || agent.ownerId !== auth.userId) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const updates = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      permissionBoundary: PermissionBoundarySchema.optional(),
    }).parse(req.body);

    const result = agentRegistry.update(req.params.id, updates);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/suspend', (req: Request, res: Response) => {
  const auth = (req as any).auth;
  const agent = agentRegistry.get(req.params.id);
  if (!agent || agent.ownerId !== auth.userId) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  agentRegistry.suspend(req.params.id);
  res.json({ id: req.params.id, status: 'suspended' });
});

router.post('/:id/activate', (req: Request, res: Response) => {
  const auth = (req as any).auth;
  const agent = agentRegistry.get(req.params.id);
  if (!agent || agent.ownerId !== auth.userId) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  agentRegistry.activate(req.params.id);
  res.json({ id: req.params.id, status: 'active' });
});

router.delete('/:id', (req: Request, res: Response) => {
  const auth = (req as any).auth;
  const agent = agentRegistry.get(req.params.id);
  if (!agent || agent.ownerId !== auth.userId) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  agentRegistry.revoke(req.params.id);
  res.json({ id: req.params.id, status: 'revoked' });
});

export { router as agentsRouter };
