import {
  ArrowRight,
  Key,
  XCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

const MOCK_ACTIVITY = [
  {
    id: 'aud_1',
    timestamp: '2 min ago',
    action: 'token.issued',
    agentId: 'coding-assistant',
    provider: 'GitHub',
    detail: 'Issued read-only token for repo access',
    success: true,
  },
  {
    id: 'aud_2',
    timestamp: '5 min ago',
    action: 'token.resolved',
    agentId: 'coding-assistant',
    provider: 'GitHub',
    detail: 'Token resolved — accessed repos endpoint',
    success: true,
  },
  {
    id: 'aud_3',
    timestamp: '12 min ago',
    action: 'token.issued',
    agentId: 'email-summarizer',
    provider: 'Gmail',
    detail: 'Issued read-only token for inbox access',
    success: true,
  },
  {
    id: 'aud_4',
    timestamp: '18 min ago',
    action: 'token.denied',
    agentId: 'unknown-agent',
    provider: 'Slack',
    detail: 'Token request denied — agent not authorized',
    success: false,
  },
  {
    id: 'aud_5',
    timestamp: '45 min ago',
    action: 'token.expired',
    agentId: 'research-bot',
    provider: 'Notion',
    detail: 'Token expired after 1h TTL',
    success: true,
  },
  {
    id: 'aud_6',
    timestamp: '1 hour ago',
    action: 'token.revoked',
    agentId: 'coding-assistant',
    provider: 'GitHub',
    detail: 'Token manually revoked by user',
    success: true,
  },
  {
    id: 'aud_7',
    timestamp: '2 hours ago',
    action: 'connection.created',
    agentId: 'system',
    provider: 'Calendar',
    detail: 'New Google Calendar connection established',
    success: true,
  },
];

const actionIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'token.issued': Key,
  'token.resolved': ArrowRight,
  'token.denied': XCircle,
  'token.expired': AlertTriangle,
  'token.revoked': XCircle,
  'connection.created': CheckCircle,
};

const actionColors: Record<string, string> = {
  'token.issued': 'var(--accent)',
  'token.resolved': 'var(--success)',
  'token.denied': 'var(--danger)',
  'token.expired': 'var(--warning)',
  'token.revoked': 'var(--text-muted)',
  'connection.created': 'var(--success)',
};

export function ActivityFeed() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Event', 'Agent', 'Service', 'Detail', 'Time'].map(
              (header, i) => (
                <th
                  key={header}
                  style={{
                    textAlign: i === 4 ? 'right' : 'left',
                    padding: '12px 16px',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {MOCK_ACTIVITY.map((entry) => {
            const IconComponent = actionIcons[entry.action] ?? Key;
            const color = actionColors[entry.action] ?? 'var(--text-secondary)';
            return (
              <tr
                key={entry.id}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <IconComponent size={14} color={color} />
                    <span style={{ color }}>{entry.action}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <code
                    style={{
                      fontSize: '12px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {entry.agentId}
                  </code>
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {entry.provider}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {entry.detail}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                  }}
                >
                  {entry.timestamp}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
