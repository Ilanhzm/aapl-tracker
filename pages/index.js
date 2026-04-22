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
  const dotCanvasRef = useRef(null);
  const lastPointRef = useRef(null);

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

  // Draw static chart (redraws only when data changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartPoints.length < 2) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 36, left: 64 };

    ctx.clearRect(0, 0, W, H);

    const prices = chartPoints.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pRange = maxP - minP || 1;

    // Fixed X axis: 9:30 AM to 4:00 PM ET (6.5 hours)
    const marketOpenMs = chartPoints[0].time;
    const marketCloseMs = marketOpenMs + 6.5 * 60 * 60 * 1000;
    const tRange = marketCloseMs - marketOpenMs;

    const toX = (t) =>
      pad.left + ((t - marketOpenMs) / tRange) * (W - pad.left - pad.right);
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

    const lastPt = chartPoints[chartPoints.length - 1];

    ctx.fillStyle = grad;
    ctx.beginPath();
    chartPoints.forEach((p, i) => {
      const x = toX(p.time);
      const y = toY(p.price);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(lastPt.time), H - pad.bottom);
    ctx.lineTo(toX(marketOpenMs), H - pad.bottom);
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

    // Store last point position for the blinking dot animation
    lastPointRef.current = {
      x: toX(lastPt.time),
      y: toY(lastPt.price),
      color: isPositive ? '99,102,241' : '239,68,68',
    };

    // Time axis labels fixed from 9:30 to 16:00
    const timeLabels = [
      marketOpenMs,
      marketOpenMs + 1.5 * 60 * 60 * 1000,
      marketOpenMs + 3 * 60 * 60 * 1000,
      marketOpenMs + 4.5 * 60 * 60 * 1000,
      marketCloseMs,
    ];
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    timeLabels.forEach((t) => {
      const x = toX(t);
      const label = new Date(t).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/New_York',
      });
      ctx.fillText(label + ' ET', x, H - 8);
    });
  }, [chartPoints]);

  // Blinking dot animation on overlay canvas
  useEffect(() => {
    if (chartPoints.length < 2) return;
    let animFrame;
    const animate = () => {
      const dotCanvas = dotCanvasRef.current;
      if (!dotCanvas) { animFrame = requestAnimationFrame(animate); return; }
      const pt = lastPointRef.current;
      const ctx = dotCanvas.getContext('2d');
      ctx.clearRect(0, 0, dotCanvas.width, dotCanvas.height);
      if (pt) {
        const pulse = (Math.sin(Date.now() / 500) + 1) / 2;
        // Outer pulsing ring
        const outerRadius = 8 + pulse * 12;
        const outerOpacity = 0.6 - pulse * 0.6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, outerRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pt.color}, ${outerOpacity})`;
        ctx.fill();
        // Middle colored ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pt.color}, 1)`;
        ctx.fill();
        // White center dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
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
            <div style={{ position: 'relative' }}>
              <canvas
                ref={canvasRef}
                width={880}
                height={280}
                style={{ width: '100%', display: 'block', borderRadius: '8px' }}
              />
              <canvas
                ref={dotCanvasRef}
                width={880}
                height={280}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: '8px',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                }}
              />
            </div>
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
