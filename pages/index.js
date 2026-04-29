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
  const [priceFontSize, setPriceFontSize] = useState(88);
  const [changeFontSize, setChangeFontSize] = useState(56);

  const isUp = change2d !== null && change2d >= 0;
  const spikeActive = spikeData?.alerted;

  async function fetchPrice() {
    try {
      const res = await fetch('/api/price?range=2d');
      if (!res.ok) return;
      const data = await res.json();
      setPrice(data.price);
      setChange2d(data.change2d);
      setOpen2d(data.open2d);
      const allPoints = data.chartPoints || [];
      if (allPoints.length >= 2) {
        const lastDate = new Date(allPoints[allPoints.length - 1].time)
          .toLocaleDateString('en-US', { timeZone: 'America/New_York' });
        const lastSession = allPoints.filter(p =>
          new Date(p.time).toLocaleDateString('en-US', { timeZone: 'America/New_York' }) === lastDate
        );
        setChartPoints(lastSession.length >= 2 ? lastSession : allPoints);
      } else {
        setChartPoints(allPoints);
      }
      if (data.tickerDisplay) setTickerDisplay(data.tickerDisplay);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
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
    fetchPrice(); fetchLog(); fetchSpikeStatus();
    const id = setInterval(fetchPrice, 30000);
    const spikeId = setInterval(fetchSpikeStatus, 60000);
    return () => { clearInterval(id); clearInterval(spikeId); };
  }, []);

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth <= 768;
      setPriceFontSize(mobile ? 56 : 88);
      setChangeFontSize(mobile ? 34 : 56);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartPoints.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 900;
    const cssH = canvas.clientHeight || 320;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = cssW, H = cssH;
    const pad = { top: 20, right: 24, bottom: 40, left: 68 };

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, W, H);

    const prices = chartPoints.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pRange = maxP - minP || 1;
    // Anchor left edge to 9:30 AM ET of the session date
    const tMin = (() => {
      const et = new Date(new Date(chartPoints[0].time).toLocaleString('en-US', { timeZone: 'America/New_York' }));
      et.setHours(9, 30, 0, 0);
      return et.getTime();
    })();

    // Anchor right edge to 4:00 PM ET of the session date
    const tMax = (() => {
      const et = new Date(new Date(chartPoints[0].time).toLocaleString('en-US', { timeZone: 'America/New_York' }));
      et.setHours(16, 0, 0, 0);
      return Math.max(et.getTime(), chartPoints[chartPoints.length - 1].time);
    })();
    const tRange = tMax - tMin || 1;

    const toX = (t) => pad.left + ((t - tMin) / tRange) * (W - pad.left - pad.right);
    const toY = (p) => H - pad.bottom - ((p - minP) / pRange) * (H - pad.top - pad.bottom);

    const lineRgb = isUp ? '0,232,122' : '255,51,86';

    // Split data into continuous segments — break when gap > 45 min (overnight)
    const GAP = 45 * 60 * 1000;
    const segments = [];
    let seg = [chartPoints[0]];
    for (let i = 1; i < chartPoints.length; i++) {
      if (chartPoints[i].time - chartPoints[i - 1].time > GAP) {
        segments.push(seg);
        seg = [chartPoints[i]];
      } else {
        seg.push(chartPoints[i]);
      }
    }
    segments.push(seg);

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * (H - pad.top - pad.bottom);
      const pVal = maxP - (i / 4) * pRange;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#3d4255';
      ctx.font = '11px "DM Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(pVal.toFixed(2), pad.left - 8, y + 4);
    }


    // Gradient fill — drawn per segment so overnight gap is not filled
    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, `rgba(${lineRgb},0.22)`);
    grad.addColorStop(0.7, `rgba(${lineRgb},0.04)`);
    grad.addColorStop(1, `rgba(${lineRgb},0.0)`);
    ctx.fillStyle = grad;
    segments.forEach((s) => {
      const lastSPt = s[s.length - 1];
      ctx.beginPath();
      s.forEach((p, i) => {
        const x = toX(p.time), y = toY(p.price);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.lineTo(toX(lastSPt.time), H - pad.bottom);
      ctx.lineTo(toX(s[0].time), H - pad.bottom);
      ctx.closePath();
      ctx.fill();
    });

    // Line — lift pen at overnight gaps
    const lastPt = chartPoints[chartPoints.length - 1];
    ctx.strokeStyle = `rgba(${lineRgb},1)`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = `rgba(${lineRgb},0.5)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    chartPoints.forEach((p, i) => {
      const x = toX(p.time), y = toY(p.price);
      const isGap = i > 0 && chartPoints[i].time - chartPoints[i - 1].time > GAP;
      (i === 0 || isGap) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    lastPointRef.current = { x: toX(lastPt.time), y: toY(lastPt.price), color: lineRgb };

    // Time labels — show market open/close anchors + intermediate points
    ctx.fillStyle = '#3d4255';
    ctx.font = '11px "DM Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const t = tMin + (i / 5) * tRange;
      const x = toX(t);
      const label = new Date(t).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'America/New_York',
      });
      ctx.fillText(label, x, H - 10);
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
        const pulse = (Math.sin(Date.now() / 480) + 1) / 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10 + pulse * 14, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pt.color}, ${0.5 - pulse * 0.5})`;
        ctx.fill();
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pt.color}, 1)`; ctx.fill();
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
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
      if (res.ok) { setSendStatus('✓ Sent'); setMessage(''); fetchLog(); }
      else setSendStatus('Error sending');
    } catch { setSendStatus('Error sending'); }
    setTimeout(() => setSendStatus(''), 3000);
  }

  const accentColor = isUp ? 'var(--green)' : 'var(--red)';
  const accentRgb = isUp ? '0,232,122' : '255,51,86';

  return (
    <Layout>
      <style>{`
        .hero-section { padding: 52px 48px 48px; }
        .hero-inner { display: flex; align-items: flex-end; gap: 60px; flex-wrap: wrap; }
        .price-block { flex-shrink: 0; }
        .change-block { flex-shrink: 0; padding-bottom: 6px; }
        .hero-meta { margin-left: auto; padding-bottom: 6px; text-align: right; }
        .spike-label { margin-bottom: 16px; }
        .spike-text { display: block; }
        .pct-sign { font-size: 42px; font-weight: 700; line-height: 1; }
        .chart-canvas { height: 320px; }
        .chart-header { padding: 20px 48px 6px; max-width: 1400px; margin: 0 auto; }
        .bottom-section { padding: 32px 48px 48px; max-width: 1400px; margin: 0 auto; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 20px; align-items: start; }
        @media (max-width: 768px) {
          .hero-section { padding: 18px 20px 14px; }
          .hero-inner { flex-direction: row; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
          .price-block { flex: 1; min-width: 0; }
          .change-block { flex: 1; min-width: 0; padding-bottom: 0; }
          .hero-meta { flex: 0 0 100%; margin-left: 0; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
          .spike-label { margin-bottom: 0; }
          .spike-text { display: none; }
          .pct-sign { font-size: 24px; }
          .chart-canvas { height: 250px; }
          .chart-header { padding: 10px 16px 4px; }
          .bottom-section { padding: 16px 16px 32px; }
          .bottom-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={{ minHeight: '100vh' }}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="hero-section" style={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: `1px solid rgba(${accentRgb},0.1)`,
          animation: spikeActive ? 'spike-pulse 2.2s ease-in-out infinite' : 'none',
        }}>
          {/* Background gradient blob */}
          <div style={{
            position: 'absolute', top: '-80px', left: '-60px',
            width: '600px', height: '600px', borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${accentRgb},0.07) 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />
          {/* Bull/bear watermark */}
          <div style={{
            position: 'absolute', right: '48px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '140px', opacity: 0.04, userSelect: 'none', pointerEvents: 'none',
          }}>
            {isUp ? '🐂' : '🐻'}
          </div>

          <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            <div className="hero-inner">

              {/* Price block */}
              <div className="price-block">
                <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.14em', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                  PRICE
                </div>
                <div className="glow-white">
                  <Odometer value={price != null ? price.toFixed(2) : null} fontSize={priceFontSize} color="var(--text-1)" />
                </div>
              </div>

              {/* Change block */}
              <div className="change-block">
                <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.12em', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                  2-DAY CHANGE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', color: accentColor, fontFamily: 'var(--font-display)' }}>
                    {isUp ? '▲' : '▼'}
                  </span>
                  <div className={isUp ? 'glow-green' : 'glow-red'}>
                    <Odometer
                      value={change2d !== null ? Math.abs(change2d).toFixed(2) : null}
                      fontSize={changeFontSize}
                      color={isUp ? '#00e87a' : '#ff3356'}
                    />
                  </div>
                  <span className="pct-sign" style={{ color: accentColor, fontFamily: 'var(--font-display)' }}>%</span>
                </div>
              </div>

              {/* Status + meta — pushed right */}
              <div className="hero-meta">
                {/* Spike indicator */}
                <div className="spike-label">
                  {spikeActive ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(255,51,86,0.08)', border: '1px solid rgba(255,51,86,0.25)',
                      borderRadius: '8px', padding: '6px 14px',
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'blink-spike 1s ease-in-out infinite' }} />
                      <span style={{ fontSize: '13px', color: 'var(--red)', fontWeight: 700, fontFamily: 'var(--font-display)', animation: 'blink-spike 1s ease-in-out infinite' }}>
                        SPIKE +{spikeData.pctMove}%
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(0,232,122,0.05)', border: '1px solid rgba(0,232,122,0.12)',
                      borderRadius: '8px', padding: '6px 14px',
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                      <span style={{ fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)' }}>All clear</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  {lastUpdated || '—'}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── CHART ────────────────────────────────────────── */}
        <section style={{ padding: '0', borderBottom: '1px solid var(--border)' }}>
          <div className="chart-header">
            <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>
              {chartPoints.length > 0
                ? new Date(chartPoints[chartPoints.length - 1].time)
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })
                    .toUpperCase() + ' — ' + tickerDisplay
                : '—'}
            </div>
          </div>
          {chartPoints.length < 2 ? (
            <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
              {chartPoints.length === 0 ? 'Loading chart…' : 'Not enough data'}
            </div>
          ) : (
            <div style={{ position: 'relative', padding: '0 0 0 0' }}>
              <canvas ref={canvasRef} className="chart-canvas" style={{ width: '100%', display: 'block' }} />
              <canvas ref={dotCanvasRef} className="chart-canvas" style={{ width: '100%', display: 'block', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
            </div>
          )}
        </section>

        {/* ── BOTTOM TWO-COLUMN ────────────────────────────── */}
        <section className="bottom-section">
          <div className="bottom-grid">

            {/* Telegram send */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
                SEND TELEGRAM MESSAGE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  className="text-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendTelegram()}
                  placeholder="Type a message…"
                  style={{ padding: '11px 14px', width: '100%' }}
                />
                <button
                  className="btn-primary"
                  onClick={sendTelegram}
                  style={{ padding: '11px', fontSize: '13px' }}
                >
                  Send to Telegram
                </button>
              </div>
              {sendStatus && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
                  {sendStatus}
                </div>
              )}
            </div>

            {/* Message log */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>
                  TELEGRAM MESSAGE LOG
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  {logEntries.length} msg{logEntries.length !== 1 ? 's' : ''}
                </div>
              </div>

              {logEntries.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', padding: '28px 0', fontFamily: 'var(--font-body)' }}>
                  No messages yet
                </div>
              ) : (
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
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
                      <div key={group.date} style={{ marginBottom: '14px' }}>
                        <div style={{
                          fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase',
                          letterSpacing: '0.1em', marginBottom: '8px',
                          borderBottom: '1px solid var(--border)', paddingBottom: '5px',
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
                              padding: '7px 10px', borderRadius: '8px', marginBottom: '3px',
                              background: 'rgba(255,255,255,0.02)',
                            }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-3)', minWidth: '38px', paddingTop: '1px', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                                {time}
                              </span>
                              <span style={{
                                fontSize: '10px', padding: '2px 7px', borderRadius: '5px',
                                background: isScheduled ? 'rgba(124,140,248,0.1)' : 'rgba(0,232,122,0.08)',
                                color: isScheduled ? 'var(--indigo)' : 'var(--green)',
                                whiteSpace: 'nowrap', minWidth: '88px', textAlign: 'center',
                                fontFamily: 'var(--font-mono)', flexShrink: 0,
                              }}>
                                {entry.source}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.55', whiteSpace: 'pre-line', fontFamily: 'var(--font-body)' }}>
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
        </section>
      </div>
    </Layout>
  );
}
