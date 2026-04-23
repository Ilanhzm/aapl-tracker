import { getSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Odometer from '../components/Odometer';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

function useSMN(target, duration = 1000) {
  const [display, setDisplay] = useState('—');
  const rafRef = useRef(null);
  const prevTarget = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined) return;
    cancelAnimationFrame(rafRef.current);
    const start = Date.now();
    const from = prevTarget.current ?? 0;
    const to = target;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay((from + (to - from) * eased).toFixed(2));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else prevTarget.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export default function Dashboard() {
  const [price, setPrice] = useState(null);
  const [change2d, setChange2d] = useState(null);
  const [open2d, setOpen2d] = useState(null);
  const [tickerDisplay, setTickerDisplay] = useState('VIX');
  const [spikeData, setSpikeData] = useState(null);
  const [chartPoints, setChartPoints] = useState([]);
  const [message, setMessage] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [logEntries, setLogEntries] = useState([]);
  const canvasRef = useRef(null);
  const dotCanvasRef = useRef(null);
  const lastPointRef = useRef(null);

  const animChange = useSMN(change2d !== null ? Math.abs(change2d) : null);
  const isUp = change2d !== null && change2d >= 0;

  async function fetchPrice() {
    try {
      const res = await fetch('/api/price?range=2d');
      if (!res.ok) return;
      const data = await res.json();
      setPrice(data.price);
      setChange2d(data.change2d);
      setOpen2d(data.open2d);
      setChartPoints(data.chartPoints || []);
      if (data.tickerDisplay) setTickerDisplay(data.tickerDisplay);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {}
  }

  async function fetchLog() {
    try {
      const res = await fetch('/api/log');
      if (!res.ok) return;
      const data = await res.json();
      setLogEntries(data.entries || []);
    } catch {}
  }

  async function fetchSpikeStatus() {
    try {
      const res = await fetch('/api/spike-status');
      if (!res.ok) return;
      const data = await res.json();
      setSpikeData(data);
    } catch {}
  }

  useEffect(() => {
    fetchPrice();
    fetchLog();
    fetchSpikeStatus();
    const id = setInterval(fetchPrice, 30000);
    const spikeId = setInterval(fetchSpikeStatus, 60000);
    return () => { clearInterval(id); clearInterval(spikeId); };
  }, []);

  // Draw 2-day chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartPoints.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 860;
    const cssH = canvas.clientHeight || 260;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = cssW;
    const H = cssH;
    const pad = { top: 20, right: 20, bottom: 36, left: 64 };

    ctx.clearRect(0, 0, W, H);

    const prices = chartPoints.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pRange = maxP - minP || 1;

    const tMin = chartPoints[0].time;
    const tMax = chartPoints[chartPoints.length - 1].time;
    const tRange = tMax - tMin || 1;

    const toX = (t) => pad.left + ((t - tMin) / tRange) * (W - pad.left - pad.right);
    const toY = (p) => H - pad.bottom - ((p - minP) / pRange) * (H - pad.top - pad.bottom);

    ctx.fillStyle = '#07080f';
    ctx.fillRect(0, 0, W, H);

    const lineColor = isUp ? '34,212,123' : '240,81,94';

    // Grid lines
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (i / 5) * (H - pad.top - pad.bottom);
      const pVal = maxP - (i / 5) * pRange;
      ctx.strokeStyle = '#1a1d35';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#404659';
      ctx.font = '11px "DM Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(pVal.toFixed(2), pad.left - 6, y + 4);
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, `rgba(${lineColor},0.25)`);
    grad.addColorStop(1, `rgba(${lineColor},0.0)`);

    const lastPt = chartPoints[chartPoints.length - 1];

    ctx.fillStyle = grad;
    ctx.beginPath();
    chartPoints.forEach((p, i) => {
      const x = toX(p.time); const y = toY(p.price);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(lastPt.time), H - pad.bottom);
    ctx.lineTo(toX(tMin), H - pad.bottom);
    ctx.closePath(); ctx.fill();

    // Line
    ctx.strokeStyle = `rgba(${lineColor},1)`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    chartPoints.forEach((p, i) => {
      const x = toX(p.time); const y = toY(p.price);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    lastPointRef.current = { x: toX(lastPt.time), y: toY(lastPt.price), color: lineColor };

    // Time labels
    ctx.fillStyle = '#404659';
    ctx.font = '11px "DM Mono", monospace';
    ctx.textAlign = 'center';
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const t = tMin + (i / labelCount) * tRange;
      const x = toX(t);
      const label = new Date(t).toLocaleString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'America/New_York', month: 'short', day: 'numeric',
      });
      ctx.fillText(label, x, H - 8);
    }
  }, [chartPoints, isUp]);

  // Blinking dot
  useEffect(() => {
    if (chartPoints.length < 2) return;
    let animFrame;
    const animate = () => {
      const dotCanvas = dotCanvasRef.current;
      if (!dotCanvas) { animFrame = requestAnimationFrame(animate); return; }
      const dpr = window.devicePixelRatio || 1;
      const pt = lastPointRef.current;
      const ctx = dotCanvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, dotCanvas.width, dotCanvas.height);
      if (pt) {
        const pulse = (Math.sin(Date.now() / 500) + 1) / 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8 + pulse * 12, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pt.color}, ${0.6 - pulse * 0.6})`;
        ctx.fill();
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pt.color}, 1)`; ctx.fill();
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
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
        fetchLog();
      } else {
        setSendStatus('Error sending');
      }
    } catch { setSendStatus('Error sending'); }
    setTimeout(() => setSendStatus(''), 3000);
  }

  const themeAccent = isUp ? 'var(--green)' : 'var(--red)';
  const themeGlowRgb = isUp ? '34,212,123' : '240,81,94';
  const spikeActive = spikeData?.alerted;

  return (
    <Layout>
      <style>{`
        @keyframes blink-spike { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spike-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(240,81,94,0); }
          50%      { box-shadow: 0 0 32px 4px rgba(240,81,94,0.18); }
        }
        .panel-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .tg-send-btn {
          padding: 10px 22px;
          background: var(--indigo);
          border: none; border-radius: 8px;
          color: #fff; cursor: pointer;
          font-family: var(--font-display); font-size: 13px; font-weight: 700;
          transition: filter 0.2s, box-shadow 0.2s, transform 0.12s;
          white-space: nowrap;
        }
        .tg-send-btn:hover { filter: brightness(1.15); box-shadow: 0 0 18px rgba(108,126,248,0.35); }
        .tg-send-btn:active { transform: scale(0.96); }
        .tg-input {
          flex: 1; padding: 10px 14px;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-1);
          font-family: var(--font-body); font-size: 14px; outline: none;
          transition: border-color 0.15s;
        }
        .tg-input:focus { border-color: var(--border-2); }
        .tg-input::placeholder { color: var(--text-3); }
      `}</style>

      <div style={{ padding: '0', minHeight: '100vh' }}>

        {/* Hero section */}
        <div style={{
          background: `radial-gradient(ellipse at 70% 40%, rgba(${themeGlowRgb},0.06) 0%, transparent 70%), var(--bg)`,
          padding: '32px 28px 28px',
          borderBottom: `1px solid rgba(${themeGlowRgb},0.1)`,
          position: 'relative',
          overflow: 'hidden',
          animation: spikeActive ? 'spike-glow 2s ease-in-out infinite' : 'none',
        }}>
          {/* Bull / Bear watermark */}
          <div style={{
            position: 'absolute', right: '20px', top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '120px', opacity: 0.06,
            userSelect: 'none', pointerEvents: 'none',
          }}>
            {isUp ? '🐂' : '🐻'}
          </div>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '36px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>
                {tickerDisplay} — LIVE PRICE
              </div>
              <Odometer value={price != null ? price.toFixed(2) : null} fontSize={56} color="var(--text-1)" />
            </div>

            <div style={{ paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>
                {isUp ? 'HIKE' : 'DROP'} · LAST 2 DAYS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: themeAccent }}>{isUp ? '▲' : '▼'}</span>
                <Odometer
                  value={change2d !== null ? Math.abs(change2d).toFixed(2) : null}
                  fontSize={40}
                  color={isUp ? '#22d47b' : '#f0515e'}
                />
                <span style={{
                  fontSize: '32px', fontWeight: 700,
                  color: themeAccent,
                  fontFamily: 'var(--font-display)',
                }}>%</span>
              </div>
              {open2d != null && (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
                  2-day open: {open2d.toFixed(2)}
                </div>
              )}
            </div>

            {/* Spike indicator */}
            <div style={{ paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>
                SPIKE ALERT
              </div>
              {spikeActive ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'blink-spike 1s ease-in-out infinite' }} />
                  <span style={{
                    fontSize: '13px', color: 'var(--red)', fontWeight: 700,
                    animation: 'blink-spike 1s ease-in-out infinite',
                    fontFamily: 'var(--font-display)',
                  }}>
                    SPIKE TODAY +{spikeData.pctMove}%
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--surface-3)', display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>No spike today</span>
                </div>
              )}
            </div>

            <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-3)', textAlign: 'right', paddingTop: '8px', fontFamily: 'var(--font-mono)' }}>
              {lastUpdated ? `Updated ${lastUpdated}` : 'Loading…'}
              <br />Refreshes every 30s
            </div>
          </div>

          {/* Chart */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid rgba(${themeGlowRgb},0.12)`,
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>
              2-DAY CHART · 15-MIN BARS · EASTERN TIME
            </div>
            {chartPoints.length < 2 ? (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
                {chartPoints.length === 0 ? 'Loading…' : 'Not enough data'}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <canvas ref={canvasRef}
                  style={{ width: '100%', height: '260px', display: 'block', borderRadius: '8px' }} />
                <canvas ref={dotCanvasRef}
                  style={{ width: '100%', height: '260px', display: 'block', borderRadius: '8px', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
              </div>
            )}
          </div>
        </div>

        {/* Telegram + Log section */}
        <div style={{ padding: '24px 28px', maxWidth: '900px' }}>

          {/* Telegram send */}
          <div className="panel-card" style={{ padding: '20px', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '12px', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>
              SEND TELEGRAM MESSAGE
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="tg-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTelegram()}
                placeholder="Type a message and press Enter or Send…"
              />
              <button className="tg-send-btn" onClick={sendTelegram}>Send</button>
            </div>
            {sendStatus && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>{sendStatus}</div>
            )}
          </div>

          {/* Message log */}
          <div className="panel-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>
                TELEGRAM MESSAGE LOG
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {logEntries.length} message{logEntries.length !== 1 ? 's' : ''}
              </div>
            </div>

            {logEntries.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', padding: '24px 0', fontFamily: 'var(--font-body)' }}>
                No messages yet
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {(() => {
                  const groups = [];
                  let lastDate = null;
                  logEntries.forEach((entry) => {
                    const dateKey = new Date(entry.timestamp).toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                      timeZone: 'Asia/Jerusalem',
                    });
                    if (dateKey !== lastDate) { groups.push({ date: dateKey, entries: [] }); lastDate = dateKey; }
                    groups[groups.length - 1].entries.push(entry);
                  });
                  return groups.map((group) => (
                    <div key={group.date} style={{ marginBottom: '16px' }}>
                      <div style={{
                        fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase',
                        letterSpacing: '0.08em', marginBottom: '8px',
                        borderBottom: '1px solid var(--border)', paddingBottom: '4px',
                        fontFamily: 'var(--font-body)',
                      }}>
                        {group.date}
                      </div>
                      {group.entries.map((entry) => {
                        const isScheduled = entry.type === 'scheduled';
                        const time = new Date(entry.timestamp).toLocaleTimeString('en-GB', {
                          hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem',
                        });
                        return (
                          <div key={entry.id} style={{
                            display: 'flex', gap: '10px', alignItems: 'flex-start',
                            padding: '8px 10px', borderRadius: '8px',
                            marginBottom: '4px', background: 'var(--bg)',
                          }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-3)', minWidth: '40px', paddingTop: '1px', fontFamily: 'var(--font-mono)' }}>{time}</span>
                            <span style={{
                              fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
                              background: isScheduled ? 'rgba(108,126,248,0.1)' : 'rgba(34,212,123,0.08)',
                              color: isScheduled ? 'var(--indigo)' : 'var(--green)',
                              whiteSpace: 'nowrap', minWidth: '90px', textAlign: 'center',
                              fontFamily: 'var(--font-mono)',
                            }}>
                              {entry.source}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.5', whiteSpace: 'pre-line', fontFamily: 'var(--font-body)' }}>
                              {entry.message}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
