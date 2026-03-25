import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { signToken } from '../middleware/auth.js';

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
      const { email } = LoginSchema.parse(req.body);

      // TODO: verify credentials against database
      const token = signToken({
        userId: 'user_placeholder',
        email,
        role: 'owner',
      });

      res.json({ token, expiresIn: 86400 });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = RegisterSchema.parse(req.body);

      // TODO: create user in database with hashed password
      const token = signToken({
        userId: 'user_placeholder',
        email,
        role: 'owner',
      });

      res.status(201).json({ token, expiresIn: 86400 });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/api-keys',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, scopes } = z
        .object({
          name: z.string(),
          scopes: z.array(z.string()).optional(),
        })
        .parse(req.body);

      // TODO: generate and store hashed API key in database
      res.status(201).json({
        name,
        key: 'kg_key_placeholder_shown_once',
        prefix: 'kg_key_p',
        scopes: scopes ?? ['*'],
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export { router as authRouter };
