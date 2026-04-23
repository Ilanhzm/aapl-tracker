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

  return (
    <Layout>
      <div style={{ padding: '32px 28px', minHeight: '100vh' }}>
        <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', marginBottom: '8px' }}>
          DID YOU MISS?
        </div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', marginBottom: '28px' }}>
          Historical Trades
        </div>

        {loading ? (
          <div style={{ color: '#555', fontSize: '13px' }}>Loading…</div>
        ) : closed.length === 0 ? (
          <div style={{ color: '#444', fontSize: '14px', marginTop: '60px', textAlign: 'center' }}>
            No closed trades yet. Check back after the first spike event.
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {[
                { label: 'TOTAL TRADES', value: closed.length, color: '#fff' },
                { label: 'REVERTED', value: reverted, color: '#4ade80' },
                { label: 'EXPIRED', value: expired, color: '#f87171' },
                { label: 'WIN RATE', value: winRate != null ? `${winRate}%` : '—', color: winRate >= 50 ? '#4ade80' : '#f87171' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: '#0f0f1a', border: '1px solid #1a1a2e',
                  borderRadius: '10px', padding: '16px 20px', minWidth: '120px',
                }}>
                  <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Trade table */}
            <div style={{ background: '#0f0f1a', border: '1px solid #1a1a2e', borderRadius: '12px', overflow: 'hidden', maxWidth: '900px' }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '110px 80px 90px 120px 100px 90px 70px 100px',
                padding: '12px 20px', borderBottom: '1px solid #1a1a2e',
                fontSize: '10px', color: '#555', letterSpacing: '0.06em',
              }}>
                <span>DATE</span>
                <span>% SPIKE</span>
                <span>ENTRY VIX</span>
                <span>REVERSION TARGET</span>
                <span>EXIT DATE</span>
                <span>REASON</span>
                <span>DAYS</span>
                <span>P&amp;L</span>
              </div>

              {/* Rows */}
              {[...closed].reverse().map((trade) => {
                const isReverted = trade.exitReason === 'Reverted';
                return (
                  <div key={trade.id} style={{
                    display: 'grid', gridTemplateColumns: '110px 80px 90px 120px 100px 90px 70px 100px',
                    padding: '14px 20px', borderBottom: '1px solid #0f0f1a',
                    fontSize: '13px', alignItems: 'center',
                    background: 'transparent',
                  }}>
                    <span style={{ color: '#888' }}>{trade.triggerDate}</span>
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>+{trade.pctMove}%</span>
                    <span style={{ color: '#fff' }}>{trade.entryVIX}</span>
                    <span style={{ color: '#4ade80' }}>{trade.reversionTarget}</span>
                    <span style={{ color: '#888' }}>{trade.exitDate}</span>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                      background: isReverted ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                      color: isReverted ? '#4ade80' : '#f87171',
                    }}>
                      {trade.exitReason}
                    </span>
                    <span style={{ color: '#777' }}>{trade.daysHeld ?? '—'}</span>
                    <span style={{ color: '#333', fontSize: '11px' }}>Phase 2</span>
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
