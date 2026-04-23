import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

function daysAgo(dateStr) {
  const start = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return diff === 0 ? 'today' : diff === 1 ? '1 day ago' : `${diff} days ago`;
}

function daysUntil(dateStr) {
  const end = new Date(dateStr + 'T00:00:00Z');
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'expired';
  return diff === 1 ? '1 day left' : `${diff} days left`;
}

export default function LiveTrades() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trades')
      .then((r) => r.json())
      .then((d) => { setTrades(d.trades || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openTrades = trades.filter((t) => t.status === 'OPEN');

  return (
    <Layout>
      <div style={{ padding: '32px 28px', minHeight: '100vh' }}>
        <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', marginBottom: '8px' }}>
          FIND LIVE TRADES
        </div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', marginBottom: '28px' }}>
          Active Spike Trades
        </div>

        {loading ? (
          <div style={{ color: '#555', fontSize: '13px' }}>Loading…</div>
        ) : openTrades.length === 0 ? (
          /* No active trades — calm state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '50vh', gap: '16px',
          }}>
            <div style={{ fontSize: '64px', opacity: 0.4 }}>🧘</div>
            <div style={{ fontSize: '22px', color: '#555', fontWeight: 'bold', letterSpacing: '0.06em' }}>
              VIX IS CHILLING
            </div>
            <div style={{ fontSize: '13px', color: '#444', textAlign: 'center', lineHeight: 1.6 }}>
              No active spike trades detected.
              <br />Spike checks run every 15 min during market hours.
            </div>
          </div>
        ) : (
          /* Active trades */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '760px' }}>
            {openTrades.map((trade) => (
              <div key={trade.id} style={{
                background: '#0f0f1a',
                border: '1px solid rgba(248,113,113,0.25)',
                borderLeft: '3px solid #f87171',
                borderRadius: '12px',
                padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      TRIGGERED {daysAgo(trade.triggerDate).toUpperCase()} · {trade.triggerDate} at {trade.triggerTime} ET
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f87171' }}>
                      +{trade.pctMove}% spike
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: '#f87171', textAlign: 'center',
                  }}>
                    OPEN<br />
                    <span style={{ fontSize: '11px', color: '#888' }}>{daysUntil(trade.expirationDate)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '32px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>ENTRY VIX</div>
                    <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>{trade.entryVIX}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>REVERSION TARGET</div>
                    <div style={{ fontSize: '18px', color: '#4ade80', fontWeight: 'bold' }}>{trade.reversionTarget}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>EXPIRES</div>
                    <div style={{ fontSize: '18px', color: '#fff' }}>{trade.expirationDate}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>OPTION P&amp;L</div>
                    <div style={{ fontSize: '14px', color: '#333' }}>Available in Phase 2</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
