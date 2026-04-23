import { getSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';

function MatrixYoga() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 260, H = 300;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Render yoga emoji to offscreen canvas to get silhouette mask
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const offCtx = off.getContext('2d');
    offCtx.font = `${H * 0.78}px serif`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = 'white';
    offCtx.fillText('🧘', W / 2, H / 2 + 10);
    const imgData = offCtx.getImageData(0, 0, W, H);

    function alpha(x, y) {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || xi >= W || yi < 0 || yi >= H) return 0;
      return imgData.data[(yi * W + xi) * 4 + 3];
    }

    const chars = 'アイウエオカキクサシスタチツテ01234567ナニヌ9#@';
    const fs = 11;
    const cols = Math.floor(W / fs);
    const drops = Array.from({ length: cols }, () => -Math.random() * H * 1.5);

    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.045)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = `${fs}px monospace`;

      for (let i = 0; i < cols; i++) {
        const x = i * fs + fs / 2;
        const y = drops[i];
        const a = alpha(x, y);
        const inBody = a > 80;
        const char = chars[Math.floor(Math.random() * chars.length)];

        if (inBody) {
          // Head of column inside silhouette → white
          ctx.fillStyle = `rgba(220,255,220,${0.6 + (a / 255) * 0.4})`;
          ctx.fillText(char, x, y);
          // Bright leading dot
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fillText(char, x, y);
        } else {
          ctx.fillStyle = 'rgba(0,140,0,0.45)';
          ctx.fillText(char, x, y);
        }

        drops[i] += fs * 0.65;
        if (drops[i] > H + fs * 3) drops[i] = -fs * (5 + Math.random() * 15);
      }
    }

    const id = setInterval(draw, 55);
    return () => clearInterval(id);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '260px', height: '300px', borderRadius: '12px', opacity: 0.9 }}
    />
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
            <MatrixYoga />
            <div style={{ fontSize: '22px', color: '#4ade80', fontWeight: 'bold', letterSpacing: '0.08em', marginTop: '8px' }}>
              VIX IS CHILLING
            </div>
            <div style={{ fontSize: '13px', color: '#555', textAlign: 'center', lineHeight: 1.6 }}>
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
