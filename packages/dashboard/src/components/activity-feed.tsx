'use client';

import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Key,
  XCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

const actionIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'token.issued': Key,
  'token.resolved': ArrowRight,
  'token.denied': XCircle,
  'token.expired': AlertTriangle,
  'token.revoked': XCircle,
  'tokens.revoked_all': XCircle,
  'connection.created': CheckCircle,
};

const actionColors: Record<string, string> = {
  'token.issued': 'var(--accent)',
  'token.resolved': 'var(--success)',
  'token.denied': 'var(--danger)',
  'token.expired': 'var(--warning)',
  'token.revoked': 'var(--text-muted)',
  'tokens.revoked_all': 'var(--danger)',
  'connection.created': 'var(--success)',
};

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  agentId: string;
  provider: string;
  connectionId: string;
  success: boolean;
}

export function ActivityFeed() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAuditLog({ limit: '20' })
      .then((data) => setEntries(data.entries))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '20px' }}>
        Loading activity...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <p style={{ fontSize: '15px', marginBottom: '8px' }}>No activity yet</p>
        <p style={{ fontSize: '13px' }}>
          Token requests and access events will appear here
        </p>
      </div>
    );
  }

  function formatTime(ts: string): string {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  }

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
            {['Event', 'Agent', 'Service', 'Status', 'Time'].map(
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
          {entries.map((entry) => {
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
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      color: entry.success
                        ? 'var(--success)'
                        : 'var(--danger)',
                      fontSize: '12px',
                    }}
                  >
                    {entry.success ? 'success' : 'failed'}
                  </span>
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                  }}
                >
                  {formatTime(entry.timestamp)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
