import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export interface AuthPayload {
  userId: string;
  email: string;
  teamId?: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  if (header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      req.auth = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
    return;
  }

  if (header.startsWith('ApiKey ')) {
    const apiKey = header.slice(7);
    if (!apiKey.startsWith('kg_key_')) {
      res.status(401).json({ error: 'Invalid API key format' });
      return;
    }
    // TODO: implement API key lookup against database
    req.auth = { userId: 'api-key-user', email: '', role: 'member' };
    next();
    return;
  }

  res.status(401).json({ error: 'Unsupported authorization scheme' });
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
