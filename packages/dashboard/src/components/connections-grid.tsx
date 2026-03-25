import {
  Github,
  Mail,
  MessageSquare,
  FileText,
  HardDrive,
  Calendar,
  MoreVertical,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  github: Github,
  mail: Mail,
  'message-square': MessageSquare,
  'file-text': FileText,
  'hard-drive': HardDrive,
  calendar: Calendar,
};

const MOCK_CONNECTIONS = [
  {
    id: 'conn_1',
    provider: 'GitHub',
    icon: 'github',
    status: 'active' as const,
    scopes: ['repo:read', 'read:user'],
    activeTokens: 2,
    lastUsed: '3 min ago',
  },
  {
    id: 'conn_2',
    provider: 'Gmail',
    icon: 'mail',
    status: 'active' as const,
    scopes: ['gmail.readonly'],
    activeTokens: 1,
    lastUsed: '12 min ago',
  },
  {
    id: 'conn_3',
    provider: 'Slack',
    icon: 'message-square',
    status: 'active' as const,
    scopes: ['channels:read', 'chat:write'],
    activeTokens: 0,
    lastUsed: '2 hours ago',
  },
  {
    id: 'conn_4',
    provider: 'Notion',
    icon: 'file-text',
    status: 'active' as const,
    scopes: ['read_content'],
    activeTokens: 1,
    lastUsed: '1 hour ago',
  },
  {
    id: 'conn_5',
    provider: 'Google Drive',
    icon: 'hard-drive',
    status: 'expired' as const,
    scopes: ['drive.readonly'],
    activeTokens: 0,
    lastUsed: '3 days ago',
  },
  {
    id: 'conn_6',
    provider: 'Calendar',
    icon: 'calendar',
    status: 'active' as const,
    scopes: ['calendar.readonly'],
    activeTokens: 1,
    lastUsed: '30 min ago',
  },
];

const statusColors: Record<string, string> = {
  active: 'var(--success)',
  expired: 'var(--text-muted)',
  revoked: 'var(--danger)',
};

export function ConnectionsGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '12px',
      }}
    >
      {MOCK_CONNECTIONS.map((conn) => {
        const IconComponent = iconMap[conn.icon] ?? FileText;
        return (
          <div
            key={conn.id}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent size={20} color="var(--text-secondary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '15px' }}>
                    {conn.provider}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: statusColors[conn.status],
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: statusColors[conn.status],
                        display: 'inline-block',
                      }}
                    />
                    {conn.status}
                  </div>
                </div>
              </div>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <MoreVertical size={16} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginBottom: '12px',
              }}
            >
              {conn.scopes.map((scope) => (
                <span
                  key={scope}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {scope}
                </span>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                {conn.activeTokens} active token
                {conn.activeTokens !== 1 ? 's' : ''}
              </span>
              <span>Last used {conn.lastUsed}</span>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Manage
              </button>
              <button
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--danger)',
                  background: 'transparent',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                }}
              >
                Revoke
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
