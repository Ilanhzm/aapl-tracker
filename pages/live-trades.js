import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

function FloatingYogi() {
  return (
    <>
      <style>{`
        @keyframes yogi-float {
          0%, 100% { transform: translateY(0px); filter: drop-shadow(0 0 10px rgba(74,222,128,0.35)); }
          50%       { transform: translateY(-22px); filter: drop-shadow(0 0 22px rgba(74,222,128,0.6)); }
        }
        @keyframes yogi-aura {
          0%, 100% { opacity: 0.12; }
          50%       { opacity: 0.28; }
        }
        .yogi-body { animation: yogi-float 4s ease-in-out infinite; }
        .yogi-aura { animation: yogi-aura 4s ease-in-out infinite; }
      `}</style>
      <div className="yogi-body">
        <svg width="150" height="170" viewBox="0 0 150 170" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer aura rings */}
          <circle className="yogi-aura" cx="75" cy="34" r="44" stroke="#4ade80" strokeWidth="0.6" />
          <circle className="yogi-aura" cx="75" cy="34" r="34" stroke="#4ade80" strokeWidth="1" />

          {/* Head */}
          <circle cx="75" cy="34" r="17" stroke="#4ade80" strokeWidth="2.5" />

          {/* Neck */}
          <line x1="75" y1="51" x2="75" y2="62" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />

          {/* Torso */}
          <line x1="75" y1="62" x2="75" y2="104" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />

          {/* Left arm — angled out, hand resting on knee */}
          <line x1="75" y1="72" x2="34" y2="90" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="34" cy="90" r="4" fill="#4ade80" />

          {/* Right arm */}
          <line x1="75" y1="72" x2="116" y2="90" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="116" cy="90" r="4" fill="#4ade80" />

          {/* Left leg — curves down-left */}
          <path d="M 75 104 C 58 114 38 120 22 142" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
          {/* Left foot crosses to right side */}
          <path d="M 22 142 C 40 134 60 130 82 136" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />

          {/* Right leg — curves down-right */}
          <path d="M 75 104 C 92 114 112 120 128 142" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
          {/* Right foot crosses to left side */}
          <path d="M 128 142 C 110 134 90 130 68 136" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}

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
      <style>{`
        .trade-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-left: 3px solid var(--red);
          border-radius: 14px;
          padding: 20px 24px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .trade-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 24px rgba(240,81,94,0.12);
        }
      `}</style>

      <div style={{ padding: '32px 28px', minHeight: '100vh' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
          FIND LIVE TRADES
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '28px', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          Active Spike Trades
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-3)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Loading…</div>
        ) : openTrades.length === 0 ? (
          /* No active trades — calm state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '50vh', gap: '16px',
          }}>
            <FloatingYogi />
            <div style={{
              fontSize: '22px', color: 'var(--green)', fontWeight: 700,
              letterSpacing: '0.06em', marginTop: '8px',
              fontFamily: 'var(--font-display)',
            }}>
              VIX IS CHILLING
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
              No active spike trades detected.
              <br />Spike checks run every 15 min during market hours.
            </div>
          </div>
        ) : (
          /* Active trades */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '760px' }}>
            {openTrades.map((trade) => (
              <div key={trade.id} className="trade-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>
                      TRIGGERED {daysAgo(trade.triggerDate).toUpperCase()} · {trade.triggerDate} at {trade.triggerTime} ET
                    </div>
                    <div style={{
                      fontSize: '30px', fontWeight: 700, color: 'var(--red)',
                      fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
                      textShadow: '0 0 20px rgba(240,81,94,0.4)',
                    }}>
                      +{trade.pctMove}% spike
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(240,81,94,0.08)', border: '1px solid rgba(240,81,94,0.18)',
                    borderRadius: '8px', padding: '8px 14px', fontSize: '11px',
                    color: 'var(--red)', textAlign: 'center', fontFamily: 'var(--font-body)',
                  }}>
                    OPEN<br />
                    <span style={{ color: 'var(--text-3)' }}>{daysUntil(trade.expirationDate)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '32px', marginTop: '16px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'ENTRY VIX', value: trade.entryVIX, color: 'var(--text-1)' },
                    { label: 'REVERSION TARGET', value: trade.reversionTarget, color: 'var(--green)' },
                    { label: 'EXPIRES', value: trade.expirationDate, color: 'var(--text-1)' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '2px', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>{label}</div>
                      <div style={{ fontSize: '18px', color, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{value}</div>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '2px', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>OPTION P&amp;L</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>Phase 2</div>
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
