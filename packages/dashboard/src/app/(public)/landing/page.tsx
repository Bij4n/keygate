'use client';

import {
  Shield,
  Lock,
  Eye,
  Clock,
  Zap,
  Users,
  ArrowRight,
  Github,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  CreditCard,
} from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: 'Scoped Tokens',
    description:
      'Issue short-lived, narrowly-scoped credentials for each agent and tool. No more master keys floating in context windows.',
  },
  {
    icon: Eye,
    title: 'Full Visibility',
    description:
      'See exactly which agent accessed which service, when, and with what permissions. Real-time audit logging.',
  },
  {
    icon: Clock,
    title: 'Auto-Expiring Access',
    description:
      'Every token has a TTL. Access expires automatically — no stale credentials sitting in agent memory.',
  },
  {
    icon: Shield,
    title: 'Opaque References',
    description:
      'Agents never see actual credentials. They receive opaque references that the broker resolves at execution time.',
  },
  {
    icon: Zap,
    title: 'One-Click Revocation',
    description:
      'Instantly kill any agent\'s access to any service. Suspected compromise? Revoke everything in one click.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description:
      'Shared credential vaults with role-based access control. Set policies for which agents can access what.',
  },
];

const providers = [
  { icon: Github, name: 'GitHub' },
  { icon: Mail, name: 'Gmail' },
  { icon: MessageSquare, name: 'Slack' },
  { icon: FileText, name: 'Notion' },
  { icon: Calendar, name: 'Calendar' },
  { icon: CreditCard, name: 'Stripe' },
];

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 48px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={24} color="var(--accent)" />
          <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Keygate
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Features</a>
          <a href="#how-it-works" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>How It Works</a>
          <a href="#integrations" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Integrations</a>
          <a
            href="/login"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          textAlign: 'center',
          padding: '80px 48px 60px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--accent)',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '24px',
          }}
        >
          Open Source Credential Broker for AI Agents
        </div>
        <h1
          style={{
            fontSize: '52px',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
          }}
        >
          Your agents need access.
          <br />
          <span style={{ color: 'var(--accent)' }}>You need control.</span>
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto 40px',
          }}
        >
          Keygate sits between your AI agents and the services they access — issuing scoped, short-lived tokens with full audit trails and instant revocation.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a
            href="/login"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Start for Free <ArrowRight size={18} />
          </a>
          <a
            href="https://github.com"
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Github size={18} /> View on GitHub
          </a>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section
        style={{
          maxWidth: '700px',
          margin: '0 auto 80px',
          padding: '0 48px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '32px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            textAlign: 'center',
          }}
        >
          <pre style={{ margin: 0 }}>
{`┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Your Agent  │────>│   Keygate    │────>│   Services   │
│              │     │   Broker     │     │              │
│  Claude, GPT │<────│  Scoped      │<────│  Gmail, Slack│
│  Custom, ... │     │  Tokens      │     │  GitHub, ... │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                     ┌─────v─────┐
                     │ Dashboard │
                     │ Audit Log │
                     │ Controls  │
                     └───────────┘`}
          </pre>
        </div>
      </section>

      {/* The Problem */}
      <section
        id="how-it-works"
        style={{
          maxWidth: '800px',
          margin: '0 auto 80px',
          padding: '0 48px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          The problem with agent credentials today
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 40px' }}>
          When you give an AI agent access to Gmail, GitHub, or Slack, you hand over
          a broad, persistent token. If any tool in the chain is compromised, the attacker gets everything.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            textAlign: 'left',
          }}
        >
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--danger)' }}>Without Keygate</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 2 }}>
              <li>Broad, persistent OAuth tokens</li>
              <li>Tokens visible in agent context window</li>
              <li>No audit trail of credential usage</li>
              <li>Revoking = re-authenticating everything</li>
              <li>One compromised tool = full account access</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--success)' }}>With Keygate</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 2 }}>
              <li>Scoped, short-lived tokens per tool</li>
              <li>Opaque references — agents never see real tokens</li>
              <li>Every access logged with agent + action + time</li>
              <li>One-click revocation, zero downtime</li>
              <li>Compromised tool? That token already expired</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        style={{
          maxWidth: '1000px',
          margin: '0 auto 80px',
          padding: '0 48px',
        }}
      >
        <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', marginBottom: '48px', letterSpacing: '-0.02em' }}>
          Built for the agent era
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '28px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <f.icon size={20} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section
        id="integrations"
        style={{
          maxWidth: '800px',
          margin: '0 auto 80px',
          padding: '0 48px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Works with your stack
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '40px' }}>
          Connect any service your agents need. OAuth setup takes 30 seconds.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          {providers.map((p) => (
            <div
              key={p.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <p.icon size={24} color="var(--text-secondary)" />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          maxWidth: '800px',
          margin: '0 auto 80px',
          padding: '0 48px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '48px',
          }}
        >
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Stop giving agents your master keys
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Free for individuals. Team plans for growing organizations.
          </p>
          <a
            href="/login"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '14px 40px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Get Started <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '32px 48px',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Keygate &copy; 2026
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="https://github.com" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>GitHub</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>Docs</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}
