'use client';

import { useState, useEffect } from 'react';
import {
  Github,
  Mail,
  MessageSquare,
  FileText,
  HardDrive,
  Calendar,
  Layout,
  Cloud,
  Users,
  CreditCard,
  MoreVertical,
} from 'lucide-react';
import { api } from '@/lib/api';

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  github: Github,
  gmail: Mail,
  slack: MessageSquare,
  notion: FileText,
  google_drive: HardDrive,
  calendar: Calendar,
  jira: Layout,
  salesforce: Cloud,
  hubspot: Users,
  stripe: CreditCard,
};

const statusColors: Record<string, string> = {
  active: 'var(--success)',
  expired: 'var(--text-muted)',
  revoked: 'var(--danger)',
};

interface ConnectionData {
  id: string;
  provider: string;
  status: string;
  scopes: string[];
  lastUsedAt?: string | null;
}

export function ConnectionsGrid() {
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getConnections()
      .then((data) => setConnections(data.connections))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRevoke(id: string) {
    try {
      await api.revokeConnection(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // handle error
    }
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '20px' }}>
        Loading connections...
      </div>
    );
  }

  if (connections.length === 0) {
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
        <p style={{ marginBottom: '8px', fontSize: '15px' }}>
          No connections yet
        </p>
        <p style={{ fontSize: '13px' }}>
          Connect a service to start managing agent access
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '12px',
      }}
    >
      {connections.map((conn) => {
        const IconComponent = iconMap[conn.provider] ?? FileText;
        const statusColor = statusColors[conn.status] ?? 'var(--text-muted)';

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
                    {conn.provider.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: statusColor,
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
                        background: statusColor,
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
              <span>{conn.id.slice(0, 12)}...</span>
              {conn.lastUsedAt && (
                <span>Last used {new Date(conn.lastUsedAt).toLocaleDateString()}</span>
              )}
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
                onClick={() => handleRevoke(conn.id)}
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
