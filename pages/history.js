import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

export default function History() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trades')
      .then((r) => r.json())
      .then((d) => { setTrades(d.trades || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const closed = trades.filter((t) => t.status === 'CLOSED');
  const reverted = closed.filter((t) => t.exitReason === 'Reverted').length;
  const expired = closed.filter((t) => t.exitReason === 'Expired').length;
  const winRate = closed.length > 0 ? Number(((reverted / closed.length) * 100).toFixed(0)) : null;

  const statsConfig = [
    { label: 'TOTAL TRADES', value: closed.length, color: 'var(--text-1)', glowRgb: '237,240,247' },
    { label: 'REVERTED', value: reverted, color: 'var(--green)', glowRgb: '0,232,122' },
    { label: 'EXPIRED', value: expired, color: 'var(--red)', glowRgb: '255,51,86' },
    {
      label: 'WIN RATE',
      value: winRate != null ? `${winRate}%` : '—',
      color: winRate != null && winRate >= 50 ? 'var(--green)' : 'var(--red)',
      glowRgb: winRate != null && winRate >= 50 ? '0,232,122' : '255,51,86',
    },
  ];

  return (
    <Layout>
      <style>{`
        .stat-card {
          background: rgba(11,13,26,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px 24px;
          transition: transform 0.22s cubic-bezier(.2,.8,.4,1), box-shadow 0.22s;
          cursor: default;
        }
        .history-row { transition: background 0.15s; }
        .history-row:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '48px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.14em', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
          HISTORY
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '36px', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
          Historical Trades
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-3)', fontSize: '14px', fontFamily: 'var(--font-body)' }}>Loading…</div>
        ) : closed.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: '14px', marginTop: '80px', textAlign: 'center', fontFamily: 'var(--font-body)', lineHeight: 1.8 }}>
            No closed trades yet.
            <br />Check back after the first spike event.
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '36px' }}>
              {statsConfig.map(({ label, value, color, glowRgb }) => (
                <div
                  key={label}
                  className="stat-card"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 8px 28px rgba(${glowRgb},0.14)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize: '32px', fontWeight: 700, color,
                    fontFamily: 'var(--font-mono)', lineHeight: 1,
                    textShadow: `0 0 20px rgba(${glowRgb},0.35)`,
                  }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{
              background: 'rgba(11,13,26,0.7)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '120px 90px 100px 140px 120px 110px 70px 110px',
                padding: '14px 24px',
                borderBottom: '1px solid var(--border)',
                fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.08em',
                fontFamily: 'var(--font-mono)',
              }}>
                <span>DATE</span>
                <span>% SPIKE</span>
                <span>ENTRY VIX</span>
                <span>REVERSION</span>
                <span>EXIT DATE</span>
                <span>REASON</span>
                <span>DAYS</span>
                <span>P&amp;L</span>
              </div>

              {/* Rows */}
              {[...closed].reverse().map((trade, idx) => {
                const isReverted = trade.exitReason === 'Reverted';
                return (
                  <div
                    key={trade.id}
                    className="history-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 90px 100px 140px 120px 110px 70px 110px',
                      padding: '14px 24px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '13px', alignItems: 'center',
                      background: idx % 2 === 1 ? 'rgba(255,255,255,0.012)' : 'transparent',
                    }}
                  >
                    <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>{trade.triggerDate}</span>
                    <span style={{
                      color: 'var(--red)', fontWeight: 700,
                      fontFamily: 'var(--font-display)', fontSize: '14px',
                      textShadow: '0 0 16px rgba(255,51,86,0.4)',
                    }}>
                      +{trade.pctMove}%
                    </span>
                    <span style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{trade.entryVIX}</span>
                    <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{trade.reversionTarget}</span>
                    <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>{trade.exitDate}</span>
                    <span style={{
                      fontSize: '11px', padding: '3px 10px', borderRadius: '6px', display: 'inline-block',
                      background: isReverted ? 'rgba(0,232,122,0.08)' : 'rgba(255,51,86,0.08)',
                      color: isReverted ? 'var(--green)' : 'var(--red)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {trade.exitReason}
                    </span>
                    <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{trade.daysHeld ?? '—'}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: '11px', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>Phase 2</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
