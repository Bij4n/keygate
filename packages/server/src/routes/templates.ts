import { Router, Request, Response } from 'express';
import {
  AGENT_ROLE_TEMPLATES,
  POLICY_TEMPLATES,
  MCP_SECURITY_PROFILES,
  THREAT_SCENARIOS,
  WEBHOOK_TEMPLATES,
} from '@keygate/core';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    agents: AGENT_ROLE_TEMPLATES,
    policies: POLICY_TEMPLATES,
    mcpProfiles: MCP_SECURITY_PROFILES,
    threats: THREAT_SCENARIOS,
    webhooks: WEBHOOK_TEMPLATES,
  });
});

router.get('/agents', (_req: Request, res: Response) => {
  res.json({ templates: AGENT_ROLE_TEMPLATES });
});

router.get('/policies', (_req: Request, res: Response) => {
  res.json({ templates: POLICY_TEMPLATES });
});

router.get('/mcp-profiles', (_req: Request, res: Response) => {
  res.json({ profiles: MCP_SECURITY_PROFILES });
});

router.get('/threats', (_req: Request, res: Response) => {
  res.json({ scenarios: THREAT_SCENARIOS });
});

router.get('/webhooks', (_req: Request, res: Response) => {
  res.json({ templates: WEBHOOK_TEMPLATES });
});

export { router as templatesRouter };
