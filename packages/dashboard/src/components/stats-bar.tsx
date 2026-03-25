import { Link2, Key, Shield, AlertTriangle } from 'lucide-react';

const stats = [
  {
    label: 'Active Connections',
    value: '5',
    icon: Link2,
    color: 'var(--accent)',
  },
  {
    label: 'Tokens Issued (24h)',
    value: '23',
    icon: Key,
    color: 'var(--success)',
  },
  {
    label: 'Access Events (24h)',
    value: '147',
    icon: Shield,
    color: 'var(--text-secondary)',
  },
  {
    label: 'Anomalies',
    value: '0',
    icon: AlertTriangle,
    color: 'var(--warning)',
  },
];

export function StatsBar() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '32px',
      }}
    >
      {stats.map((stat) => (
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
