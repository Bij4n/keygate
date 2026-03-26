'use client';

import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { ConnectionsGrid } from '@/components/connections-grid';
import { ActivityFeed } from '@/components/activity-feed';
import { StatsBar } from '@/components/stats-bar';
import { useEffect } from 'react';

export default function Dashboard() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', marginLeft: '240px' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1
            style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}
          >
            Connections
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage service access for your AI agents
          </p>
        </header>

        <StatsBar />

        <section style={{ marginBottom: '40px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 500 }}>
              Active Connections
            </h2>
            <button
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Connect Service
            </button>
          </div>
          <ConnectionsGrid />
        </section>

        <section>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 500,
              marginBottom: '16px',
            }}
          >
            Recent Activity
          </h2>
          <ActivityFeed />
        </section>
      </main>
    </div>
  );
}
