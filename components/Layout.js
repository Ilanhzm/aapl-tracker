import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/live-trades', label: 'Live Trades', pulse: true },
  { href: '/simulate', label: 'Simulate' },
  { href: '/history', label: 'History' },
];

export default function Layout({ children }) {
  const { pathname } = useRouter();

  return (
    <div style={{ minHeight: '100vh', color: 'var(--text-1)', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.2; transform:scale(0.5); }
        }
        .topnav {
          position: fixed; top: 0; left: 0; right: 0; height: var(--nav-h);
          z-index: 200;
          background: rgba(4,5,9,0.82);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          padding: 0 32px; gap: 0;
        }
        .nav-logo {
          display: flex; align-items: center;
          user-select: none; flex-shrink: 0; margin-right: 40px;
          text-decoration: none;
        }
        .nav-logo img {
          height: 50px; width: auto; display: block;
        }
        .nav-links {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 2px;
        }
        .nav-item {
          position: relative; display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 15px;
          font-family: var(--font-body); font-size: 18px; font-weight: 500;
          color: var(--text-3); text-decoration: none;
          border-radius: 8px; border: 1px solid transparent;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .nav-item:hover { color: var(--text-2); background: rgba(255,255,255,0.03); }
        .nav-item.active {
          color: var(--text-1);
          background: var(--surface-2);
          border-color: var(--border);
        }
        .live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--red); flex-shrink: 0;
          animation: pulse-dot 1.4s ease-in-out infinite;
        }
        .nav-signout {
          padding: 7px 14px; flex-shrink: 0; margin-left: 24px;
          font-size: 12px;
        }
        .bottom-nav { display: none; }
        .bottom-nav-item-dot { display: none; }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-signout { display: none; }
          .content-wrapper { padding-bottom: 64px; }
          .bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0;
            height: 60px; z-index: 200;
            background: rgba(4,5,9,0.88);
            backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
            border-top: 1px solid var(--border);
            justify-content: space-around; align-items: center;
          }
          .bottom-nav-item {
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            text-decoration: none; font-family: var(--font-body);
            font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
            color: var(--text-3); padding: 6px 12px;
            text-transform: uppercase; transition: color 0.15s;
          }
          .bottom-nav-item.active { color: var(--text-1); }
          .bottom-nav-item-dot {
            display: block; width: 16px; height: 2px; border-radius: 1px;
            background: currentColor; opacity: 0; transition: opacity 0.15s;
          }
          .bottom-nav-item.active .bottom-nav-item-dot { opacity: 1; }
        }
      `}</style>

      <nav className="topnav">
        <a href="/" className="nav-logo">
          <img src="/logo.png" alt="VIXit" />
        </a>

        <div className="nav-links">
          {NAV.map(({ href, label, pulse }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
                {pulse && !active && <span className="live-dot" />}
                {label}
              </Link>
            );
          })}
        </div>

        <button
          className="btn-ghost nav-signout"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Sign out
        </button>
      </nav>

      <div className="content-wrapper" style={{ paddingTop: 'var(--nav-h)' }}>
        {children}
      </div>

      <nav className="bottom-nav">
        {NAV.map(({ href, label, pulse }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`bottom-nav-item${active ? ' active' : ''}`}>
              {pulse && !active && <span className="live-dot" />}
              <span>{label}</span>
              <span className="bottom-nav-item-dot" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
