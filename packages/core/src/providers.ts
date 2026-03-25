import type { Provider } from './types.js';

export interface ProviderConfig {
  id: Provider;
  name: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  defaultScopes: string[];
  availableScopes: ProviderScope[];
  icon: string;
}

export interface ProviderScope {
  value: string;
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  github: {
    id: 'github',
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['read:user'],
    availableScopes: [
      { value: 'read:user', label: 'Read profile', description: 'Read user profile data', risk: 'low' },
      { value: 'repo', label: 'Repositories', description: 'Full access to repositories', risk: 'high' },
      { value: 'repo:status', label: 'Repo status', description: 'Read commit status', risk: 'low' },
      { value: 'public_repo', label: 'Public repos', description: 'Access public repositories only', risk: 'medium' },
      { value: 'read:org', label: 'Read org', description: 'Read organization membership', risk: 'low' },
      { value: 'gist', label: 'Gists', description: 'Create and read gists', risk: 'medium' },
    ],
    icon: 'github',
  },
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    defaultScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    availableScopes: [
      { value: 'https://www.googleapis.com/auth/gmail.readonly', label: 'Read only', description: 'Read email messages and labels', risk: 'medium' },
      { value: 'https://www.googleapis.com/auth/gmail.send', label: 'Send email', description: 'Send email on your behalf', risk: 'high' },
      { value: 'https://www.googleapis.com/auth/gmail.labels', label: 'Manage labels', description: 'Create and manage labels', risk: 'low' },
      { value: 'https://www.googleapis.com/auth/gmail.modify', label: 'Modify', description: 'Read, send, delete, and manage email', risk: 'high' },
    ],
    icon: 'mail',
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    revokeUrl: 'https://slack.com/api/auth.revoke',
    defaultScopes: ['channels:read'],
    availableScopes: [
      { value: 'channels:read', label: 'Read channels', description: 'View channel info', risk: 'low' },
      { value: 'channels:history', label: 'Read messages', description: 'Read message history', risk: 'medium' },
      { value: 'chat:write', label: 'Send messages', description: 'Post messages to channels', risk: 'high' },
      { value: 'files:read', label: 'Read files', description: 'Access shared files', risk: 'medium' },
      { value: 'users:read', label: 'Read users', description: 'View workspace members', risk: 'low' },
    ],
    icon: 'message-square',
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    defaultScopes: [],
    availableScopes: [
      { value: 'read_content', label: 'Read content', description: 'Read pages and databases', risk: 'medium' },
      { value: 'insert_content', label: 'Insert content', description: 'Create new pages and content', risk: 'medium' },
      { value: 'update_content', label: 'Update content', description: 'Modify existing content', risk: 'high' },
      { value: 'read_user', label: 'Read users', description: 'View workspace members', risk: 'low' },
    ],
    icon: 'file-text',
  },
  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    defaultScopes: ['https://www.googleapis.com/auth/drive.readonly'],
    availableScopes: [
      { value: 'https://www.googleapis.com/auth/drive.readonly', label: 'Read only', description: 'View files and folders', risk: 'medium' },
      { value: 'https://www.googleapis.com/auth/drive.file', label: 'File access', description: 'Access files created by this app', risk: 'medium' },
      { value: 'https://www.googleapis.com/auth/drive', label: 'Full access', description: 'Full access to all Drive files', risk: 'high' },
    ],
    icon: 'hard-drive',
  },
  jira: {
    id: 'jira',
    name: 'Jira',
    authUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    defaultScopes: ['read:jira-work'],
    availableScopes: [
      { value: 'read:jira-work', label: 'Read issues', description: 'View issues and projects', risk: 'low' },
      { value: 'write:jira-work', label: 'Write issues', description: 'Create and edit issues', risk: 'medium' },
      { value: 'manage:jira-project', label: 'Manage projects', description: 'Manage project settings', risk: 'high' },
    ],
    icon: 'layout',
  },
  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
    defaultScopes: ['api'],
    availableScopes: [
      { value: 'api', label: 'API access', description: 'Access Salesforce data via API', risk: 'medium' },
      { value: 'full', label: 'Full access', description: 'Full access to your account', risk: 'high' },
      { value: 'chatter_api', label: 'Chatter', description: 'Access Chatter feeds', risk: 'low' },
    ],
    icon: 'cloud',
  },
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    defaultScopes: ['crm.objects.contacts.read'],
    availableScopes: [
      { value: 'crm.objects.contacts.read', label: 'Read contacts', description: 'View contact records', risk: 'medium' },
      { value: 'crm.objects.contacts.write', label: 'Write contacts', description: 'Create and edit contacts', risk: 'high' },
      { value: 'crm.objects.deals.read', label: 'Read deals', description: 'View deal records', risk: 'medium' },
    ],
    icon: 'users',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
    defaultScopes: ['read_only'],
    availableScopes: [
      { value: 'read_only', label: 'Read only', description: 'View payment data', risk: 'medium' },
      { value: 'read_write', label: 'Read & write', description: 'Manage payments and subscriptions', risk: 'high' },
    ],
    icon: 'credit-card',
  },
  calendar: {
    id: 'calendar',
    name: 'Google Calendar',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    defaultScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    availableScopes: [
      { value: 'https://www.googleapis.com/auth/calendar.readonly', label: 'Read only', description: 'View calendar events', risk: 'low' },
      { value: 'https://www.googleapis.com/auth/calendar.events', label: 'Manage events', description: 'Create and edit events', risk: 'medium' },
      { value: 'https://www.googleapis.com/auth/calendar', label: 'Full access', description: 'Full calendar management', risk: 'high' },
    ],
    icon: 'calendar',
  },
};

export function getProvider(id: string): ProviderConfig | undefined {
  return PROVIDERS[id];
}

export function listProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS);
}
