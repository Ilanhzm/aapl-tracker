import { getSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import Layout from '../components/Layout';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

// Slot machine number animation
function useSMN(target, duration = 1200) {
  const [display, setDisplay] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === null) { setDisplay(null); return; }
    const start = Date.now();
    const startVal = 0;
    const endVal = target;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;
      setDisplay(current.toFixed(1));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export default function SimulateHike() {
  const [startPrice, setStartPrice] = useState(15);
  const [endPrice, setEndPrice] = useState(25);
  const [step, setStep] = useState(1); // 1=picking start, 2=picking end, 3=ready, 4=results
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [gaugeAngle, setGaugeAngle] = useState(-90);
  const canvasRef = useRef(null);

  const jumpPct = endPrice > startPrice ? (((endPrice - startPrice) / startPrice) * 100) : 0;
  const animJump = useSMN(step >= 3 ? jumpPct : null);
  const animProb = useSMN(step === 4 && result ? result.probability : null, 1800);
  const animFreq = useSMN(step === 4 && result ? (result.instances > 0 ? Math.round(result.totalDays / result.instances) : 0) : null, 1800);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 600;
    const cssH = canvas.clientHeight || 240;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = cssW;
    const H = cssH;
    ctx.clearRect(0, 0, W, H);

    // Dark background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (step < 3) return;

    // Climbing curve
    const padX = 40;
    const padY = 20;
    const plotH = H - padY * 2;

    const minY = Math.min(startPrice, endPrice) - 3;
    const maxY = Math.max(startPrice, endPrice) + 3;
    const range = maxY - minY || 1;

    const toY = (p) => padY + (1 - (p - minY) / range) * plotH;
    const startY = toY(startPrice);
    const endY = toY(endPrice);
    const startX = padX;
    const endX = W - padX;
    const midX = (startX + endX) / 2;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, endY, 0, startY + 20);
    grad.addColorStop(0, 'rgba(74, 222, 128, 0.3)');
    grad.addColorStop(1, 'rgba(74, 222, 128, 0.02)');

    // Bezier curve
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fill under
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
    ctx.lineTo(endX, H);
    ctx.lineTo(startX, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Start dot
    ctx.beginPath();
    ctx.arc(startX, startY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();

    // End dot
    ctx.beginPath();
    ctx.arc(endX, endY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Price labels
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(startPrice.toFixed(1), startX + 8, startY - 8);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(endPrice.toFixed(1), endX - 8, endY - 8);
  }, [startPrice, endPrice, step]);

  // Gauge animation
  useEffect(() => {
    if (step !== 4 || !result) return;
    const target = -90 + (result.probability / 100) * 180;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1800, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setGaugeAngle(-90 + eased * (result.probability / 100) * 180);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [step, result]);

  async function calculate() {
    if (jumpPct <= 0) return;
    setCalculating(true);
    try {
      const res = await fetch(`/api/algorithm?jump=${jumpPct.toFixed(2)}`);
      const data = await res.json();
      setResult(data);
      setStep(4);
      setGaugeAngle(-90);
    } catch {}
    setCalculating(false);
  }

  function reset() {
    setStep(1);
    setResult(null);
    setStartPrice(15);
    setEndPrice(25);
    setGaugeAngle(-90);
  }

  const gaugeColor =
    result == null ? '#6366f1'
    : result.probability >= 60 ? '#4ade80'
    : result.probability >= 30 ? '#facc15'
    : '#f87171';

  return (
    <Layout>
      <div style={{ padding: '32px 28px', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#fff', letterSpacing: '0.05em' }}>
            SIMULATE <span style={{ color: '#e53e3e' }}>HIKE</span>
          </h1>
          <div style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>
            Set a two-day VIX move · see the reversion probability
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {['Set start price', 'Set end price', 'Review hike', 'Results'].map((label, i) => {
            const s = i + 1;
            const done = step > s;
            const active = step === s;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: done ? '#4ade80' : active ? '#e53e3e' : '#1a1a2e',
                  color: done || active ? '#000' : '#444',
                  fontSize: '11px', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done ? '✓' : s}
                </div>
                <span style={{ fontSize: '11px', color: active ? '#fff' : done ? '#4ade80' : '#444' }}>
                  {label}
                </span>
                {i < 3 && <div style={{ width: '20px', height: '1px', background: '#1e1e3a' }} />}
              </div>
            );
          })}
        </div>

        {/* Main interaction area */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>

          {/* Left scrollbar — start price */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '10px', color: step === 1 ? '#e53e3e' : '#444', textAlign: 'center', letterSpacing: '0.05em' }}>
              START
            </div>
            <div style={{
              fontSize: '16px', fontWeight: 'bold',
              color: step >= 1 ? '#fff' : '#333',
              minWidth: '36px', textAlign: 'center',
            }}>
              {startPrice.toFixed(0)}
            </div>
            <input
              type="range" min="5" max="80" step="1"
              value={startPrice}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setStartPrice(v);
                if (endPrice <= v) setEndPrice(v + 5);
                if (step === 1) setStep(2);
                if (step >= 3) setStep(3);
                setResult(null);
              }}
              style={{
                writingMode: 'vertical-lr',
                direction: 'rtl',
                height: '240px',
                accentColor: '#e53e3e',
                cursor: 'pointer',
                opacity: step === 4 ? 0.4 : 1,
              }}
              disabled={step === 4}
            />
            <div style={{ fontSize: '10px', color: '#333' }}>VIX</div>
          </div>

          {/* Chart area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Tooltip */}
            {step === 1 && (
              <div style={{
                background: '#1a1a2e', border: '1px solid #e53e3e',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '12px', color: '#ccc', textAlign: 'center',
              }}>
                Drag the <span style={{ color: '#e53e3e' }}>left bar</span> to set the VIX starting price
              </div>
            )}
            {step === 2 && (
              <div style={{
                background: '#1a1a2e', border: '1px solid #e53e3e',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '12px', color: '#ccc', textAlign: 'center',
              }}>
                Now drag the <span style={{ color: '#fff' }}>right bar</span> to set the ending price
              </div>
            )}
            {step >= 3 && step < 4 && (
              <div style={{
                background: '#0f1a0f', border: '1px solid #4ade80',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '12px', color: '#4ade80', textAlign: 'center',
              }}>
                2-day hike:&nbsp;
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  +{animJump}%
                </span>
              </div>
            )}
            {step === 4 && (
              <div style={{
                background: '#0f1a0f', border: '1px solid #4ade80',
                borderRadius: '8px', padding: '6px 14px',
                fontSize: '12px', color: '#4ade80', textAlign: 'center',
              }}>
                Simulated hike: <strong>+{jumpPct.toFixed(1)}%</strong> (from {startPrice} → {endPrice})
              </div>
            )}

            <canvas
              ref={canvasRef}
              style={{
                width: '100%', height: '240px', borderRadius: '10px',
                border: '1px solid #1a1a2e', display: 'block',
              }}
            />

            {/* Results panel */}
            {step === 4 && result && (
              <div style={{
                background: '#0f0f1a', border: '1px solid #1a1a2e',
                borderRadius: '12px', padding: '20px',
                display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap',
              }}>
                {/* Gauge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#555' }}>Your reversion probability</div>
                  <svg width="140" height="80" viewBox="0 0 140 80">
                    {/* Background arc */}
                    <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="#1e1e3a" strokeWidth="10" strokeLinecap="round" />
                    {/* Colored arc */}
                    <path
                      d="M 10 75 A 60 60 0 0 1 130 75"
                      fill="none"
                      stroke={gaugeColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.PI * 60 * (result.probability / 100)} ${Math.PI * 60}`}
                    />
                    {/* Needle */}
                    <line
                      x1="70" y1="75"
                      x2={70 + 48 * Math.cos((gaugeAngle * Math.PI) / 180)}
                      y2={75 + 48 * Math.sin((gaugeAngle * Math.PI) / 180)}
                      stroke="#fff" strokeWidth="2" strokeLinecap="round"
                    />
                    <circle cx="70" cy="75" r="4" fill="#fff" />
                    <text x="70" y="68" textAnchor="middle" fill={gaugeColor} fontSize="15" fontWeight="bold" fontFamily="monospace">
                      {animProb}%
                    </text>
                  </svg>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#444', marginBottom: '4px' }}>Happens once every</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#a5b4fc' }}>
                      {animFreq} <span style={{ fontSize: '14px', color: '#555' }}>trading days</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '10px 14px', flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#444' }}>Spike instances</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{result.instances}</div>
                    </div>
                    <div style={{ background: '#1a1a2e', borderRadius: '8px', padding: '10px 14px', flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#444' }}>Reverted</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4ade80' }}>{result.reversions}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right scrollbar — end price */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '10px', color: step === 2 ? '#fff' : '#444', textAlign: 'center', letterSpacing: '0.05em' }}>
              END
            </div>
            <div style={{
              fontSize: '16px', fontWeight: 'bold',
              color: step >= 2 ? '#fff' : '#333',
              minWidth: '36px', textAlign: 'center',
            }}>
              {endPrice.toFixed(0)}
            </div>
            <input
              type="range" min="5" max="80" step="1"
              value={endPrice}
              onChange={(e) => {
                const v = Math.max(parseFloat(e.target.value), startPrice + 1);
                setEndPrice(v);
                if (step === 2) setStep(3);
                if (step >= 3) setStep(3);
                setResult(null);
              }}
              style={{
                writingMode: 'vertical-lr',
                direction: 'rtl',
                height: '240px',
                accentColor: '#fff',
                cursor: step < 2 ? 'not-allowed' : 'pointer',
                opacity: step < 2 ? 0.2 : step === 4 ? 0.4 : 1,
              }}
              disabled={step < 2 || step === 4}
            />
            <div style={{ fontSize: '10px', color: '#333' }}>VIX</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <div style={{ fontSize: '12px', color: '#333' }}>
            {step >= 3 && step < 4 && `+${jumpPct.toFixed(1)}% hike · ${startPrice} → ${endPrice}`}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {step === 4 && (
              <button onClick={reset} style={{
                padding: '12px 24px', background: 'transparent',
                border: '1px solid #333', borderRadius: '8px',
                color: '#666', cursor: 'pointer', fontSize: '13px',
                fontFamily: 'monospace',
              }}>
                RESET
              </button>
            )}
            {step >= 3 && step < 4 && (
              <button
                onClick={calculate}
                disabled={calculating}
                style={{
                  padding: '14px 32px',
                  background: calculating ? '#1a2e1a' : '#22c55e',
                  border: 'none', borderRadius: '8px',
                  color: calculating ? '#4ade80' : '#000',
                  cursor: calculating ? 'wait' : 'pointer',
                  fontSize: '14px', fontWeight: 'bold',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  boxShadow: calculating ? 'none' : '0 0 20px rgba(34,197,94,0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {calculating ? 'CALCULATING…' : 'CALCULATE NOW'}
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '24px', fontSize: '11px', color: '#444', textAlign: 'center', lineHeight: 1.8 }}>
          Based on daily VIX closing prices · Jan 1990 – Apr 2026 · reversion window: 10 trading days
          <br />
          <span style={{ color: '#2a2a4a' }}>VIX typical range: 10–30 · Stressed markets: 30–50 · Crisis peaks (2008, COVID): 50–89</span>
        </div>
      </div>
    </Layout>
  );
}
