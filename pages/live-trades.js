import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

function FloatingYogi() {
  return (
    <>
      <style>{`
        @keyframes yogi-float {
          0%, 100% { transform: translateY(0px); filter: drop-shadow(0 0 12px rgba(0,232,122,0.4)); }
          50%       { transform: translateY(-24px); filter: drop-shadow(0 0 26px rgba(0,232,122,0.65)); }
        }
        @keyframes yogi-aura {
          0%, 100% { opacity: 0.1; }
          50%       { opacity: 0.25; }
        }
        .yogi-body { animation: yogi-float 4s ease-in-out infinite; }
        .yogi-aura { animation: yogi-aura 4s ease-in-out infinite; }
      `}</style>
      <div className="yogi-body">
        <svg width="160" height="180" viewBox="0 0 150 170" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="yogi-aura" cx="75" cy="34" r="48" stroke="#00e87a" strokeWidth="0.5" />
          <circle className="yogi-aura" cx="75" cy="34" r="36" stroke="#00e87a" strokeWidth="0.8" />
          <circle cx="75" cy="34" r="17" stroke="#00e87a" strokeWidth="2.5" />
          <line x1="75" y1="51" x2="75" y2="62" stroke="#00e87a" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="75" y1="62" x2="75" y2="104" stroke="#00e87a" strokeWidth="3" strokeLinecap="round" />
          <line x1="75" y1="72" x2="34" y2="90" stroke="#00e87a" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="34" cy="90" r="4" fill="#00e87a" />
          <line x1="75" y1="72" x2="116" y2="90" stroke="#00e87a" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="116" cy="90" r="4" fill="#00e87a" />
          <path d="M 75 104 C 58 114 38 120 22 142" stroke="#00e87a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 22 142 C 40 134 60 130 82 136" stroke="#00e87a" strokeWidth="2" strokeLinecap="round" />
          <path d="M 75 104 C 92 114 112 120 128 142" stroke="#00e87a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 128 142 C 110 134 90 130 68 136" stroke="#00e87a" strokeWidth="2" strokeLinecap="round" />
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
  const diff = Math.floor((new Date() - new Date(dateStr + 'T00:00:00Z')) / 86400000);
  return diff === 0 ? 'today' : diff === 1 ? '1 day ago' : `${diff} days ago`;
}

function daysUntil(dateStr) {
  const diff = Math.ceil((new Date(dateStr + 'T00:00:00Z') - new Date()) / 86400000);
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
          background: rgba(11,13,26,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,51,86,0.15);
          border-left: 3px solid var(--red);
          border-radius: 16px;
          padding: 24px 28px;
          transition: transform 0.22s cubic-bezier(.2,.8,.4,1), box-shadow 0.22s;
        }
        .trade-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(255,51,86,0.12);
        }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.14em', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
          LIVE TRADES
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '36px', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
          Active Spike Trades
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-3)', fontSize: '14px', fontFamily: 'var(--font-body)' }}>Loading…</div>
        ) : openTrades.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '55vh', gap: '20px',
          }}>
            <FloatingYogi />
            <div style={{
              fontSize: '26px', fontWeight: 700, color: 'var(--green)',
              letterSpacing: '0.05em', marginTop: '10px',
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 28px rgba(0,232,122,0.45)',
            }}>
              VIX IS CHILLING
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.8, fontFamily: 'var(--font-body)', maxWidth: '320px' }}>
              No active spike trades.
              <br />Checks run every 15 min during market hours.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {openTrades.map((trade) => (
              <div key={trade.id} className="trade-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'var(--font-body)' }}>
                      TRIGGERED {daysAgo(trade.triggerDate).toUpperCase()} · {trade.triggerDate} at {trade.triggerTime} ET
                    </div>
                    <div style={{
                      fontSize: '36px', fontWeight: 700, color: 'var(--red)',
                      fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
                      textShadow: '0 0 24px rgba(255,51,86,0.45)',
                    }}>
                      +{trade.pctMove}% spike
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255,51,86,0.08)', border: '1px solid rgba(255,51,86,0.2)',
                    borderRadius: '10px', padding: '10px 18px',
                    textAlign: 'center', flexShrink: 0,
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--red)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em' }}>OPEN</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{daysUntil(trade.expirationDate)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '24px', marginTop: '20px' }}>
                  {[
                    { label: 'ENTRY VIX', value: trade.entryVIX, color: 'var(--text-1)' },
                    { label: 'REVERSION TARGET', value: trade.reversionTarget, color: 'var(--green)' },
                    { label: 'EXPIRES', value: trade.expirationDate, color: 'var(--text-1)' },
                    { label: 'OPTION P&L', value: 'Phase 2', color: 'var(--text-3)', italic: true },
                  ].map(({ label, value, color, italic }) => (
                    <div key={label}>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>{label}</div>
                      <div style={{ fontSize: '20px', color, fontWeight: 500, fontFamily: italic ? 'var(--font-body)' : 'var(--font-mono)', fontStyle: italic ? 'italic' : 'normal', fontSize: italic ? '13px' : '20px' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
