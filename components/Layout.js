import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/', label: 'Main' },
  { href: '/live-trades', label: 'Find Live Trades' },
  { href: '/simulate', label: 'Simulate Hike' },
  { href: '/history', label: 'Did You Miss?' },
];

export default function Layout({ children }) {
  const { pathname } = useRouter();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a12', fontFamily: 'monospace', color: '#fff' }}>
      <style>{`
        @keyframes pulse-red {
          0%, 100% { color: #ff6b6b; }
          50% { color: #7a1a1a; }
        }
        .nav-blink { animation: pulse-red 1.4s ease-in-out infinite; }
      `}</style>
      {/* Left sidebar */}
      <div style={{
        width: '160px',
        minWidth: '160px',
        background: '#0f0f1a',
        borderRight: '1px solid #1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100,
      }}>
        <div style={{ padding: '0 16px 24px', fontSize: '13px', color: '#6366f1', fontWeight: 'bold', letterSpacing: '0.05em' }}>
          VIXit
        </div>
        <nav style={{ flex: 1 }}>
          {NAV.map(({ href, label }) => {
            const active = pathname === href;
            const isLiveTrades = href === '/live-trades';
            return (
              <Link key={href} href={href}
                className={!active && isLiveTrades ? 'nav-blink' : undefined}
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: active ? '#fff' : '#888',
                  textDecoration: 'none',
                  background: active ? '#1a1a2e' : 'transparent',
                  borderLeft: active ? '3px solid #e53e3e' : '3px solid transparent',
                  transition: 'color 0.15s',
                }}>
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            margin: '0 12px',
            padding: '8px',
            background: 'transparent',
            border: '1px solid #1e1e3a',
            borderRadius: '6px',
            color: '#444',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Page content */}
      <div style={{ marginLeft: '160px', flex: 1, minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  );
}
