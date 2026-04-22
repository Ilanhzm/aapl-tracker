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
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push('/');
    } else {
      setError('Invalid username or password');
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f0f1a',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          background: '#1a1a2e',
          padding: '40px',
          borderRadius: '16px',
          width: '360px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <h2
          style={{
            color: '#a5b4fc',
            textAlign: 'center',
            marginTop: 0,
            marginBottom: '8px',
            fontSize: '20px',
          }}
        >
          AAPL Market Dashboard
        </h2>
        <p style={{ color: '#555', textAlign: 'center', marginBottom: '28px', fontSize: '13px' }}>
          Sign in to continue
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              marginBottom: '12px',
              borderRadius: '8px',
              border: '1px solid #2a2a4a',
              background: '#0f0f1a',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              marginBottom: '20px',
              borderRadius: '8px',
              border: '1px solid #2a2a4a',
              background: '#0f0f1a',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {error && (
            <p
              style={{
                color: '#f87171',
                marginBottom: '14px',
                textAlign: 'center',
                fontSize: '13px',
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#3730a3' : '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
