import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { EncryptionService } from '@keygate/core';
import { signToken, authenticate } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = LoginSchema.parse(req.body);

      const { rows } = await query(
        'SELECT id, email, password_hash, salt, role, team_id, name FROM users WHERE email = $1',
        [email],
      );

      if (rows.length === 0) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const user = rows[0];
      const hash = scryptSync(password, user.salt, 64).toString('hex');

      if (!timingSafeEqual(Buffer.from(hash), Buffer.from(user.password_hash))) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        teamId: user.team_id,
        role: user.role,
      });

      res.json({
        token,
        expiresIn: 86400,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = RegisterSchema.parse(req.body);

      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const userId = `usr_${nanoid(24)}`;
      const teamId = `team_${nanoid(24)}`;
      const salt = EncryptionService.generateSalt();
      const passwordHash = scryptSync(password, salt, 64).toString('hex');
      const teamSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');

      await query(
        'INSERT INTO teams (id, name, slug) VALUES ($1, $2, $3)',
        [teamId, name ?? `${email}'s Team`, teamSlug],
      );

      await query(
        'INSERT INTO users (id, email, password_hash, name, team_id, role, salt) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, email, passwordHash, name ?? null, teamId, 'owner', salt],
      );

      const token = signToken({
        userId,
        email,
        teamId,
        role: 'owner',
      });

      res.status(201).json({
        token,
        expiresIn: 86400,
        user: { id: userId, email, name, role: 'owner' },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/api-keys',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, scopes } = z
        .object({
          name: z.string(),
          scopes: z.array(z.string()).optional(),
        })
        .parse(req.body);

      const keyId = `key_${nanoid(24)}`;
      const rawKey = `kg_key_${randomBytes(32).toString('base64url')}`;
      const keyHash = createHash('sha256').update(rawKey).digest('hex');
      const prefix = rawKey.substring(0, 12);

      await query(
        'INSERT INTO api_keys (id, user_id, team_id, name, key_hash, prefix, scopes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          keyId,
          req.auth!.userId,
          req.auth!.teamId ?? null,
          name,
          keyHash,
          prefix,
          scopes ?? ['*'],
        ],
      );

      res.status(201).json({
        id: keyId,
        name,
        key: rawKey,
        prefix,
        scopes: scopes ?? ['*'],
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export { router as authRouter };
