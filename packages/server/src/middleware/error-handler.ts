import { Request, Response, NextFunction } from 'express';
import { VaultError } from '@keygate/core';

const ERROR_STATUS_MAP: Record<string, number> = {
  CONNECTION_NOT_FOUND: 404,
  CONNECTION_INACTIVE: 403,
  TOKEN_NOT_FOUND: 404,
  TOKEN_REVOKED: 403,
  TOKEN_EXPIRED: 403,
  TOKEN_EXHAUSTED: 429,
  VALIDATION_ERROR: 400,
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof VaultError) {
    const status = ERROR_STATUS_MAP[err.code] ?? 400;
    res.status(status).json({ error: err.code, message: err.message });
    return;
  }

  console.error('Unhandled error:', err);
  res
    .status(500)
    .json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
}
