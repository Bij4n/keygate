import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      telemetry?: {
        ip: string;
        userAgent: string;
        frameworkId: string;
        sessionId: string;
        requestStart: number;
      };
    }
  }
}

export function telemetry(req: Request, _res: Response, next: NextFunction): void {
  req.telemetry = {
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown',
    userAgent: (req.headers['user-agent'] as string) || 'unknown',
    frameworkId: (req.headers['x-agent-framework'] as string) || (req.headers['x-agent-id'] as string) || 'unknown',
    sessionId: (req.headers['x-session-id'] as string) || `sess_${randomBytes(8).toString('hex')}`,
    requestStart: Date.now(),
  };
  next();
}

export function getLatency(req: Request): number {
  return req.telemetry ? Date.now() - req.telemetry.requestStart : 0;
}
