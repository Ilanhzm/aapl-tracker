import { getSession, signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

export default function Dashboard() {
  const [price, setPrice] = useState(null);
  const [openPrice, setOpenPrice] = useState(null);
  const [chartPoints, setChartPoints] = useState([]);
  const [message, setMessage] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const canvasRef = useRef(null);

  async function fetchPrice() {
    try {
      const res = await fetch('/api/price');
      if (!res.ok) return;
      const data = await res.json();
      setPrice(data.price);
      setOpenPrice(data.openPrice);
      setChartPoints(data.chartPoints || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {}
  }

  useEffect(() => {
    fetchPrice();
    const id = setInterval(fetchPrice, 30000);
    return () => clearInterval(id);
  }, []);

  // Draw intraday chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartPoints.length < 2) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 36, left: 64 };

    ctx.clearRect(0, 0, W, H);

    const prices = chartPoints.map((p) => p.price);
    const times = chartPoints.map((p) => p.time);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pRange = maxP - minP || 1;
    const minT = times[0];
    const maxT = times[times.length - 1];
    const tRange = maxT - minT || 1;

    const toX = (t) =>
      pad.left + ((t - minT) / tRange) * (W - pad.left - pad.right);
    const toY = (p) =>
      H - pad.bottom - ((p - minP) / pRange) * (H - pad.top - pad.bottom);

    // Background
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    // Horizontal grid lines + price labels
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (i / gridLines) * (H - pad.top - pad.bottom);
      const pVal = maxP - (i / gridLines) * pRange;

      ctx.strokeStyle = '#1e1e3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = '#666';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('$' + pVal.toFixed(2), pad.left - 6, y + 4);
    }

    // Gradient fill under the line
    const isPositive =
      chartPoints[chartPoints.length - 1].price >= chartPoints[0].price;
    const fillColor = isPositive ? '99,102,241' : '239,68,68';
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, `rgba(${fillColor},0.35)`);
    grad.addColorStop(1, `rgba(${fillColor},0.0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    chartPoints.forEach((p, i) => {
      const x = toX(p.time);
      const y = toY(p.price);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(maxT), H - pad.bottom);
    ctx.lineTo(toX(minT), H - pad.bottom);
    ctx.closePath();
    ctx.fill();

    // Price line
    ctx.strokeStyle = isPositive ? '#6366f1' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    chartPoints.forEach((p, i) => {
      const x = toX(p.time);
      const y = toY(p.price);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Latest price dot
    const lastPt = chartPoints[chartPoints.length - 1];
    ctx.fillStyle = isPositive ? '#818cf8' : '#f87171';
    ctx.beginPath();
    ctx.arc(toX(lastPt.time), toY(lastPt.price), 4, 0, Math.PI * 2);
    ctx.fill();

    // Time axis labels
    const labelCount = 5;
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= labelCount; i++) {
      const t = minT + (i / labelCount) * tRange;
      const x = toX(t);
      const label = new Date(t).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/New_York',
      });
      ctx.fillText(label + ' ET', x, H - 8);
    }
  }, [chartPoints]);

  async function sendTelegram() {
    if (!message.trim()) return;
    setSendStatus('Sending…');
    try {
      const res = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        setSendStatus('✓ Sent');
        setMessage('');
      } else {
        setSendStatus('Error sending');
      }
    } catch {
      setSendStatus('Error sending');
    }
    setTimeout(() => setSendStatus(''), 3000);
  }

  const changeVal =
    price && openPrice ? ((price - openPrice) / openPrice) * 100 : null;
  const isUp = changeVal !== null && changeVal >= 0;

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
          <h1 style={{ margin: 0, fontSize: '22px', color: '#a5b4fc' }}>
            AAPL Market Dashboard
          </h1>
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

        {/* Price card */}
        <div
          style={{
            background: '#1a1a2e',
            borderRadius: '14px',
            padding: '28px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '6px' }}>
              AAPL — Live Price
            </div>
            <div style={{ fontSize: '52px', fontWeight: 'bold', lineHeight: 1 }}>
              {price != null ? `$${price.toFixed(2)}` : '—'}
            </div>
          </div>
          {changeVal !== null && (
            <div
              style={{
                fontSize: '20px',
                color: isUp ? '#4ade80' : '#f87171',
                paddingBottom: '6px',
              }}
            >
              {isUp ? '▲' : '▼'} {Math.abs(changeVal).toFixed(2)}% today
            </div>
          )}
          {openPrice != null && (
            <div style={{ fontSize: '13px', color: '#555', paddingBottom: '8px' }}>
              Open: ${openPrice.toFixed(2)}
            </div>
          )}
          <div
            style={{
              marginLeft: 'auto',
              fontSize: '12px',
              color: '#333',
              paddingBottom: '8px',
            }}
          >
            {lastUpdated ? `Updated ${lastUpdated}` : 'Loading…'}
            <br />
            Refreshes every 30s
          </div>
        </div>

        {/* Chart */}
        <div
          style={{
            background: '#1a1a2e',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
            Intraday Chart — 5-minute bars (Eastern Time)
          </div>
          {chartPoints.length < 2 ? (
            <div
              style={{
                height: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#333',
                fontSize: '14px',
              }}
            >
              {chartPoints.length === 0
                ? 'Loading chart data…'
                : 'Not enough data points yet'}
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={880}
              height={280}
              style={{ width: '100%', display: 'block', borderRadius: '8px' }}
            />
          )}
        </div>

        {/* Telegram */}
        <div
          style={{
            background: '#1a1a2e',
            borderRadius: '14px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
            Send Telegram Message
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTelegram()}
              placeholder="Type a message and press Enter or Send…"
              style={{
                flex: 1,
                padding: '10px 14px',
                background: '#0f0f1a',
                border: '1px solid #2a2a4a',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button
              onClick={sendTelegram}
              style={{
                padding: '10px 20px',
                background: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            >
              Send
            </button>
          </div>
          {sendStatus && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#888' }}>
              {sendStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
