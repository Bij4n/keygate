import { Router, Request, Response, NextFunction } from 'express';
import { createHmac } from 'node:crypto';
import { getProvider, EncryptionService } from '@keygate/core';
import { vaultStore, encryption } from '../services.js';

const router = Router();
const STATE_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

function signState(data: Record<string, string>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyState(state: string): Record<string, string> | null {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;

  const expected = createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;

  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

// Initiate OAuth flow — redirects user to the provider
router.get(
  '/start/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider: providerId } = req.params;
      const { connection_id, redirect_uri } = req.query;

      const provider = getProvider(providerId);
      if (!provider) {
        res.status(404).json({ error: 'Unknown provider' });
        return;
      }

      if (!connection_id || typeof connection_id !== 'string') {
        res.status(400).json({ error: 'Missing connection_id' });
        return;
      }

      const clientId = process.env[`OAUTH_${providerId.toUpperCase()}_CLIENT_ID`];
      if (!clientId) {
        res.status(500).json({ error: `OAuth not configured for ${providerId}` });
        return;
      }

      const callbackUrl = `${process.env.DASHBOARD_URL ?? 'http://localhost:3200'}/oauth/callback`;
      const state = signState({
        connectionId: connection_id,
        redirectUri: (redirect_uri as string) ?? callbackUrl,
      });

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        scope: provider.defaultScopes.join(' '),
        state,
        response_type: 'code',
      });

      res.json({
        url: `${provider.authUrl}?${params}`,
        state,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Handle OAuth callback from the provider
router.get(
  '/callback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        res.status(400).json({ error: `OAuth error: ${error}` });
        return;
      }

      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).json({ error: 'Missing code or state' });
        return;
      }

      const stateData = verifyState(state);
      if (!stateData) {
        res.status(400).json({ error: 'Invalid state parameter' });
        return;
      }

      const connection = await vaultStore.getConnection(stateData.connectionId);
      if (!connection) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const provider = getProvider(connection.provider);
      if (!provider) {
        res.status(500).json({ error: 'Unknown provider' });
        return;
      }

      const clientId = process.env[`OAUTH_${connection.provider.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`OAUTH_${connection.provider.toUpperCase()}_CLIENT_SECRET`];

      if (!clientId || !clientSecret) {
        res.status(500).json({ error: 'OAuth credentials not configured' });
        return;
      }

      // Exchange code for access token
      const tokenResponse = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: stateData.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json() as Record<string, any>;

      if (!tokenResponse.ok || tokenData.error) {
        res.status(400).json({
          error: 'Token exchange failed',
          detail: tokenData.error_description ?? tokenData.error,
        });
        return;
      }

      // Encrypt and store credentials
      const credentials = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? '',
        token_type: tokenData.token_type ?? 'bearer',
        scope: tokenData.scope ?? '',
        expires_in: String(tokenData.expires_in ?? ''),
      };

      const userSalt = connection.connectionKeyId;
      const encryptedCreds = encryption.encryptCredentials(
        credentials,
        connection.id,
        userSalt,
      );

      const scopes = tokenData.scope
        ? tokenData.scope.split(/[\s,]+/)
        : connection.scopes;

      await vaultStore.updateConnectionCredentials(
        connection.id,
        encryptedCreds,
        scopes,
      );

      // Redirect back to dashboard
      const dashboardUrl = stateData.redirectUri ?? `${process.env.DASHBOARD_URL ?? 'http://localhost:3200'}`;
      res.redirect(`${dashboardUrl}?connected=${connection.id}`);
    } catch (err) {
      next(err);
    }
  },
);

export { router as oauthRouter };
