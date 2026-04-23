import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/live-trades', label: 'Live Trades', pulse: true },
  { href: '/simulate', label: 'Simulate Hike' },
  { href: '/history', label: 'History' },
];

export default function Layout({ children }) {
  const { pathname } = useRouter();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-1)', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.7); }
        }
        .nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 20px;
          font-family: var(--font-body); font-size: 13px;
          color: var(--text-3);
          text-decoration: none;
          border-left: 3px solid transparent;
          transition: color 0.15s, background 0.15s;
          position: relative;
          cursor: pointer;
        }
        .nav-link:hover { color: var(--text-2); background: rgba(255,255,255,0.02); }
        .nav-link.active {
          color: var(--text-1);
          background: var(--surface-2);
          border-left-color: var(--indigo);
        }
        .pulse-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--red);
          flex-shrink: 0;
          animation: pulse-dot 1.4s ease-in-out infinite;
        }
        .signout-btn {
          margin: 0 14px 4px;
          padding: 9px 14px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-3);
          cursor: pointer;
          font-size: 12px;
          font-family: var(--font-body);
          text-align: left;
          transition: color 0.15s, border-color 0.15s;
          width: calc(100% - 28px);
        }
        .signout-btn:hover { color: var(--text-2); border-color: var(--border-2); }
      `}</style>

      {/* Sidebar */}
      <div style={{
        width: '224px',
        minWidth: '224px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 0 20px',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 28px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: 800,
            color: 'var(--indigo)',
            letterSpacing: '-0.02em',
          }}>
            VIXit
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px', fontFamily: 'var(--font-body)' }}>
            Volatility intelligence
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {NAV.map(({ href, label, pulse }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`nav-link${active ? ' active' : ''}`}>
                {pulse && !active && <span className="pulse-dot" />}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <button className="signout-btn" onClick={() => signOut({ callbackUrl: '/login' })}>
          Sign out
        </button>
      </div>

      {/* Page content */}
      <div style={{ marginLeft: '224px', flex: 1, minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  );
}
