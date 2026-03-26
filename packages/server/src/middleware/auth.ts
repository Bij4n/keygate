import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

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

    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    query(
      `SELECT ak.id, ak.user_id, ak.team_id, ak.scopes, ak.expires_at, u.email, u.role
       FROM api_keys ak JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1`,
      [keyHash],
    )
      .then(({ rows }) => {
        if (rows.length === 0) {
          res.status(401).json({ error: 'Invalid API key' });
          return;
        }

        const row = rows[0];

        if (row.expires_at && new Date(row.expires_at) < new Date()) {
          res.status(401).json({ error: 'API key expired' });
          return;
        }

        query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]).catch(() => {});

        req.auth = {
          userId: row.user_id,
          email: row.email,
          teamId: row.team_id,
          role: row.role,
        };
        next();
      })
      .catch(() => {
        res.status(500).json({ error: 'Authentication error' });
      });
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
