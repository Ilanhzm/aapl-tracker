import { getSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

export default function SimulateHike() {
  const [jump, setJump] = useState(10);
  const [inputVal, setInputVal] = useState('10');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  function fetchResult(value) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/algorithm?jump=${value}`);
        if (res.ok) setResult(await res.json());
      } catch {}
      setLoading(false);
    }, 300);
  }

  useEffect(() => {
    fetchResult(jump);
  }, [jump]);

  function handleSlider(e) {
    const v = parseFloat(e.target.value);
    setJump(v);
    setInputVal(String(v));
  }

  function handleInput(e) {
    setInputVal(e.target.value);
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0 && v <= 200) {
      setJump(v);
    }
  }

  const probabilityColor =
    result == null
      ? '#6366f1'
      : result.probability >= 30
      ? '#4ade80'
      : result.probability >= 10
      ? '#facc15'
      : '#f87171';

  return (
    <div
      style={{
        background: '#0f0f1a',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: 'monospace',
        padding: '28px 20px',
      }}
    >
      <div style={{ maxWidth: '920px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', color: '#a5b4fc' }}>
              VIXit — Simulate Hike
            </h1>
            <Link
              href="/"
              style={{
                fontSize: '13px',
                color: '#555',
                textDecoration: 'none',
                borderBottom: '1px solid #333',
              }}
            >
              ← Dashboard
            </Link>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              background: '#1e1e3a',
              color: '#888',
              border: '1px solid #2a2a4a',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '13px',
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Explainer */}
        <div
          style={{
            background: '#1a1a2e',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#555',
            lineHeight: '1.7',
          }}
        >
          Enter a VIX single-day jump percentage. The algorithm scans{' '}
          <span style={{ color: '#888' }}>35+ years</span> of historical VIX data
          and tells you how often a move of that size has happened.
        </div>

        {/* Input card */}
        <div
          style={{
            background: '#1a1a2e',
            borderRadius: '14px',
            padding: '28px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>
            VIX single-day jump threshold
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="range"
              min="1"
              max="80"
              step="0.5"
              value={Math.min(jump, 80)}
              onChange={handleSlider}
              style={{
                flex: 1,
                minWidth: '200px',
                accentColor: '#6366f1',
                height: '6px',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                value={inputVal}
                onChange={handleInput}
                min="0.1"
                max="200"
                step="0.5"
                style={{
                  width: '80px',
                  padding: '8px 12px',
                  background: '#0f0f1a',
                  border: '1px solid #2a2a4a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '18px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '18px', color: '#6366f1' }}>%</span>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#333' }}>
            Drag the slider or type any value. Updates instantly.
          </div>
        </div>

        {/* Result card */}
        <div
          style={{
            background: '#1a1a2e',
            borderRadius: '14px',
            padding: '28px',
            marginBottom: '20px',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>
            Historical probability
          </div>

          {result && (
            <>
              {/* Big probability number */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '12px',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    fontSize: '72px',
                    fontWeight: 'bold',
                    lineHeight: 1,
                    color: probabilityColor,
                  }}
                >
                  {result.probability}%
                </div>
                <div style={{ paddingBottom: '10px', color: '#555', fontSize: '14px' }}>
                  of trading days saw a
                  <br />
                  jump of ≥ {result.jump}%
                </div>
              </div>

              {/* Probability bar */}
              <div
                style={{
                  height: '8px',
                  background: '#0f0f1a',
                  borderRadius: '4px',
                  marginBottom: '24px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(result.probability, 100)}%`,
                    background: probabilityColor,
                    borderRadius: '4px',
                    transition: 'width 0.4s ease, background 0.3s',
                  }}
                />
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <StatBox
                  label="Matching days"
                  value={result.matchingDays.toLocaleString()}
                />
                <StatBox
                  label="Total days"
                  value={result.totalDays.toLocaleString()}
                />
                <StatBox
                  label="Likelihood"
                  value={
                    result.probability >= 30
                      ? 'Common'
                      : result.probability >= 10
                      ? 'Moderate'
                      : result.probability >= 3
                      ? 'Rare'
                      : 'Very rare'
                  }
                  valueColor={probabilityColor}
                />
              </div>
            </>
          )}

          {!result && !loading && (
            <div style={{ color: '#333', fontSize: '14px' }}>
              Adjust the slider to run the simulation.
            </div>
          )}
        </div>

        {/* Data note */}
        <div style={{ fontSize: '12px', color: '#2a2a4a', textAlign: 'center' }}>
          Based on daily VIX closing prices · Jan 1990 – Apr 2026 · {result ? result.totalDays.toLocaleString() : '~9,130'} trading days
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, valueColor }) {
  return (
    <div
      style={{
        background: '#0f0f1a',
        borderRadius: '10px',
        padding: '14px 18px',
        flex: '1',
        minWidth: '120px',
      }}
    >
      <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: valueColor || '#a5b4fc',
        }}
      >
        {value}
      </div>
    </div>
  );
}
