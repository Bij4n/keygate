import {
  Shield,
  LayoutDashboard,
  Link2,
  Key,
  ScrollText,
  Users,
  Settings,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', active: true },
  { icon: Link2, label: 'Connections', href: '/connections' },
  { icon: Key, label: 'Tokens', href: '/tokens' },
  { icon: ScrollText, label: 'Audit Log', href: '/audit' },
  { icon: Users, label: 'Team', href: '/team' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  return (
    <aside
      style={{
        width: '240px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 12px',
          marginBottom: '32px',
        }}
      >
        <Shield size={22} color="var(--accent)" />
        <span
          style={{
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Keygate
        </span>
      </div>

      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          flex: 1,
        }}
      >
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              color: item.active
                ? 'var(--text-primary)'
                : 'var(--text-secondary)',
              background: item.active ? 'var(--bg-card)' : 'transparent',
              fontWeight: item.active ? 500 : 400,
              transition: 'background 0.15s',
            }}
          >
            <item.icon size={18} />
            {item.label}
          </a>
        ))}
      </nav>

      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
          marginTop: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 600,
              color: 'white',
            }}
          >
            JD
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>John Doe</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Personal
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
