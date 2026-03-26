'use client';

import { useState, useEffect } from 'react';
import { Link2, Key, Shield, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface Stats {
  activeConnections: number;
  tokensIssued: number;
  last24hRequests: number;
  anomalies: number;
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats>({
    activeConnections: 0,
    tokensIssued: 0,
    last24hRequests: 0,
    anomalies: 0,
  });

  useEffect(() => {
    api
      .getAuditSummary()
      .then((data) => {
        setStats({
          activeConnections: data.activeConnections ?? 0,
          tokensIssued: data.tokensIssued ?? 0,
          last24hRequests: data.last24h?.requests ?? 0,
          anomalies: 0,
        });
      })
      .catch(() => {});
  }, []);

  const items = [
    { label: 'Active Connections', value: String(stats.activeConnections), icon: Link2, color: 'var(--accent)' },
    { label: 'Tokens Issued', value: String(stats.tokensIssued), icon: Key, color: 'var(--success)' },
    { label: 'Events (24h)', value: String(stats.last24hRequests), icon: Shield, color: 'var(--text-secondary)' },
    { label: 'Anomalies', value: String(stats.anomalies), icon: AlertTriangle, color: 'var(--warning)' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '32px',
      }}
    >
      {items.map((stat) => (
        <div
          key={stat.label}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {stat.label}
            </span>
            <stat.icon size={16} color={stat.color} />
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
