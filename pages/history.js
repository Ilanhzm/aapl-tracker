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
  const winRate = closed.length > 0 ? ((reverted / closed.length) * 100).toFixed(0) : null;

  const statsConfig = [
    { label: 'TOTAL TRADES', value: closed.length, color: 'var(--text-1)', glow: 'rgba(237,240,247,0.08)' },
    { label: 'REVERTED', value: reverted, color: 'var(--green)', glow: 'rgba(34,212,123,0.15)' },
    { label: 'EXPIRED', value: expired, color: 'var(--red)', glow: 'rgba(240,81,94,0.15)' },
    {
      label: 'WIN RATE',
      value: winRate != null ? `${winRate}%` : '—',
      color: winRate != null && Number(winRate) >= 50 ? 'var(--green)' : 'var(--red)',
      glow: winRate != null && Number(winRate) >= 50 ? 'rgba(34,212,123,0.15)' : 'rgba(240,81,94,0.15)',
    },
  ];

  return (
    <Layout>
      <style>{`
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px 20px;
          min-width: 120px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .table-row:nth-child(even) { background: rgba(255,255,255,0.015); }
        .table-row:hover { background: rgba(255,255,255,0.03); }
      `}</style>

      <div style={{ padding: '32px 28px', minHeight: '100vh' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
          DID YOU MISS?
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '28px', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          Historical Trades
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-3)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Loading…</div>
        ) : closed.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: '14px', marginTop: '60px', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
            No closed trades yet. Check back after the first spike event.
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {statsConfig.map(({ label, value, color, glow }) => (
                <div
                  key={label}
                  className="stat-card"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 20px ${glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>{label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Trade table */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', maxWidth: '920px' }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '110px 80px 90px 130px 110px 100px 70px 100px',
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em',
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
              {[...closed].reverse().map((trade) => {
                const isReverted = trade.exitReason === 'Reverted';
                return (
                  <div key={trade.id} className="table-row" style={{
                    display: 'grid', gridTemplateColumns: '110px 80px 90px 130px 110px 100px 70px 100px',
                    padding: '13px 20px', borderBottom: '1px solid var(--border)',
                    fontSize: '13px', alignItems: 'center',
                  }}>
                    <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>{trade.triggerDate}</span>
                    <span style={{ color: 'var(--red)', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '13px' }}>+{trade.pctMove}%</span>
                    <span style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{trade.entryVIX}</span>
                    <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{trade.reversionTarget}</span>
                    <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>{trade.exitDate}</span>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                      background: isReverted ? 'rgba(34,212,123,0.08)' : 'rgba(240,81,94,0.08)',
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
