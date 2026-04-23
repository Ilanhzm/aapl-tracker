import { signIn, getSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/router';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (session) return { redirect: { destination: '/', permanent: false } };
  return { props: {} };
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { username, password, redirect: false });
    setLoading(false);
    if (result?.ok) {
      router.push('/');
    } else {
      setError('Invalid username or password');
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font-body)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes orb-drift-a {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, -30px) scale(1.08); }
        }
        @keyframes orb-drift-b {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-30px, 25px) scale(1.05); }
        }
        @keyframes card-enter {
          from { opacity: 0; transform: scale(0.94) translateY(18px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .login-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          color: var(--text-1);
          font-family: var(--font-body);
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s;
        }
        .login-input:focus { border-color: var(--border-2); }
        .login-input::placeholder { color: var(--text-3); }
        .login-btn {
          width: 100%;
          padding: 13px;
          background: var(--indigo);
          color: #fff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.03em;
          transition: filter 0.2s, box-shadow 0.2s, transform 0.12s;
        }
        .login-btn:hover:not(:disabled) {
          filter: brightness(1.2);
          box-shadow: 0 0 22px rgba(108,126,248,0.4);
        }
        .login-btn:active:not(:disabled) { transform: scale(0.96); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* Background orbs */}
      <div style={{
        position: 'absolute', top: '15%', left: '20%',
        width: '480px', height: '480px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,126,248,0.09) 0%, transparent 70%)',
        animation: 'orb-drift-a 14s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '15%',
        width: '380px', height: '380px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,212,123,0.07) 0%, transparent 70%)',
        animation: 'orb-drift-b 18s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-2)',
        borderRadius: '20px',
        padding: '44px 40px',
        width: '400px',
        position: 'relative',
        zIndex: 1,
        animation: 'card-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 800,
            color: 'var(--text-1)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            marginBottom: '8px',
          }}>
            VIXit
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
            Volatility intelligence, simplified.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            className="login-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ marginBottom: '8px' }}
          />

          {error && (
            <div style={{ fontSize: '13px', color: 'var(--red)', textAlign: 'center', marginBottom: '4px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
