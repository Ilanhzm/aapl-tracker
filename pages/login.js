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
    if (result?.ok) router.push('/');
    else setError('Invalid username or password');
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', fontFamily: 'var(--font-body)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated orbs */}
      <div style={{
        position: 'absolute', top: '8%', left: '12%',
        width: '520px', height: '520px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,140,248,0.1) 0%, transparent 68%)',
        animation: 'orb-drift-a 16s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '6%', right: '10%',
        width: '420px', height: '420px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,232,122,0.07) 0%, transparent 68%)',
        animation: 'orb-drift-b 20s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: 'rgba(11,13,26,0.8)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid var(--border-2)',
        borderRadius: '22px',
        padding: '48px 44px',
        width: '420px',
        position: 'relative', zIndex: 1,
        animation: 'card-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img
            src="/logo.png"
            alt="VIXit"
            style={{ height: '56px', width: 'auto', marginBottom: '14px', filter: 'drop-shadow(0 0 20px rgba(0,232,122,0.2))' }}
          />
          <div style={{ fontSize: '14px', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
            Volatility intelligence, simplified.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            className="text-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ padding: '13px 15px', width: '100%' }}
          />
          <input
            type="password"
            className="text-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '13px 15px', width: '100%', marginBottom: '4px' }}
          />

          {error && (
            <div style={{ fontSize: '13px', color: 'var(--red)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ padding: '14px', fontSize: '14px', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
