/**
 * Real OAuth provider configurations.
 *
 * Each provider defines how to:
 * 1. Build the authorization URL
 * 2. Exchange the code for tokens
 * 3. Refresh expired tokens
 * 4. Revoke tokens
 *
 * Client IDs and secrets come from environment variables:
 *   OAUTH_GITHUB_CLIENT_ID, OAUTH_GITHUB_CLIENT_SECRET, etc.
 */

export interface OAuthProviderConfig {
  id: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  revokeUrl?: string;
  userInfoUrl?: string;
  scopeSeparator: string;
  defaultScopes: string[];
  envPrefix: string;
  extraAuthParams?: Record<string, string>;
  extraTokenParams?: Record<string, string>;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  github: {
    id: 'github',
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopeSeparator: ' ',
    defaultScopes: ['read:user', 'repo'],
    envPrefix: 'OAUTH_GITHUB',
  },
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    refreshUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopeSeparator: ' ',
    defaultScopes: ['https://www.googleapis.com/auth/gmail.readonly', 'openid', 'email'],
    envPrefix: 'OAUTH_GOOGLE',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },
  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    refreshUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopeSeparator: ' ',
    defaultScopes: ['https://www.googleapis.com/auth/drive.readonly'],
    envPrefix: 'OAUTH_GOOGLE',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },
  calendar: {
    id: 'calendar',
    name: 'Google Calendar',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    refreshUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopeSeparator: ' ',
    defaultScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    envPrefix: 'OAUTH_GOOGLE',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    revokeUrl: 'https://slack.com/api/auth.revoke',
    scopeSeparator: ',',
    defaultScopes: ['channels:read', 'chat:write'],
    envPrefix: 'OAUTH_SLACK',
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopeSeparator: ' ',
    defaultScopes: [],
    envPrefix: 'OAUTH_NOTION',
    extraAuthParams: { owner: 'user' },
  },
  jira: {
    id: 'jira',
    name: 'Jira',
    authUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    refreshUrl: 'https://auth.atlassian.com/oauth/token',
    scopeSeparator: ' ',
    defaultScopes: ['read:jira-work', 'write:jira-work'],
    envPrefix: 'OAUTH_ATLASSIAN',
    extraAuthParams: { audience: 'api.atlassian.com', prompt: 'consent' },
  },
  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
    scopeSeparator: ' ',
    defaultScopes: ['api', 'refresh_token'],
    envPrefix: 'OAUTH_SALESFORCE',
  },
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopeSeparator: ' ',
    defaultScopes: ['crm.objects.contacts.read'],
    envPrefix: 'OAUTH_HUBSPOT',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
    scopeSeparator: ' ',
    defaultScopes: ['read_only'],
    envPrefix: 'OAUTH_STRIPE',
    extraAuthParams: { response_type: 'code' },
  },
};

export function getOAuthProvider(id: string): OAuthProviderConfig | undefined {
  return OAUTH_PROVIDERS[id];
}

export function getClientCredentials(provider: OAuthProviderConfig): { clientId: string; clientSecret: string } | null {
  const clientId = process.env[`${provider.envPrefix}_CLIENT_ID`];
  const clientSecret = process.env[`${provider.envPrefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function buildAuthUrl(
  provider: OAuthProviderConfig,
  clientId: string,
  redirectUri: string,
  state: string,
  scopes?: string[],
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: (scopes ?? provider.defaultScopes).join(provider.scopeSeparator),
    state,
    response_type: 'code',
    ...provider.extraAuthParams,
  });
  return `${provider.authUrl}?${params}`;
}

export async function exchangeCode(
  provider: OAuthProviderConfig,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<Record<string, any>> {
  const body: Record<string, string> = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    ...provider.extraTokenParams,
  };

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body),
  });

  return response.json();
}

export async function refreshToken(
  provider: OAuthProviderConfig,
  clientId: string,
  clientSecret: string,
  refreshTokenValue: string,
): Promise<Record<string, any>> {
  const url = provider.refreshUrl ?? provider.tokenUrl;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshTokenValue,
      grant_type: 'refresh_token',
    }),
  });

  return response.json();
}

export async function revokeToken(
  provider: OAuthProviderConfig,
  token: string,
  clientId?: string,
  clientSecret?: string,
): Promise<boolean> {
  if (!provider.revokeUrl) return false;

  const body: Record<string, string> = { token };
  if (clientId) body.client_id = clientId;
  if (clientSecret) body.client_secret = clientSecret;

  const response = await fetch(provider.revokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });

  return response.ok;
}
