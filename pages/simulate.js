import { getSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Odometer from '../components/Odometer';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

// Linear scale: slider 0–100 → VIX 10–30 (fine, even control)
// Extremes unlock turbo: hold at 0 → slowly dips to 5; hold at 100 → slowly climbs to 80
function sliderToVIX(s) { return 10 + Math.round(s * 0.2); }
function vixToSlider(vix) { return Math.round((Math.max(10, Math.min(30, vix)) - 10) * 5); }

// Slot machine animation for results panel
function useSMN(target, duration = 1200) {
  const [display, setDisplay] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === null) { setDisplay(null); return; }
    const start = Date.now();
    const endVal = target;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay((endVal * eased).toFixed(1));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export default function SimulateHike() {
  const [startSlider, setStartSlider] = useState(vixToSlider(15)); // 25
  const [endSlider, setEndSlider] = useState(vixToSlider(20));     // 50
  const [startTurboVIX, setStartTurboVIX] = useState(null);
  const [endTurboVIX, setEndTurboVIX] = useState(null);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [gaugeAngle, setGaugeAngle] = useState(-90);
  const [calcFlash, setCalcFlash] = useState(false);
  const canvasRef = useRef(null);

  // Turbo refs — interval IDs and current value trackers
  const startTurboRef = useRef(null);
  const endTurboRef   = useRef(null);
  const startTurboVal = useRef(30);
  const endTurboVal   = useRef(30);

  // Derived VIX prices (turbo overrides linear if active)
  const startPrice = startTurboVIX ?? sliderToVIX(startSlider);
  const endPrice   = endTurboVIX   ?? sliderToVIX(endSlider);
  const jumpPct    = endPrice > startPrice ? (((endPrice - startPrice) / startPrice) * 100) : 0;

  const animProb = useSMN(step === 4 && result ? result.probability : null, 1800);
  const animFreq = useSMN(step === 4 && result ? (result.instances > 0 ? Math.round(result.totalDays / result.instances) : 0) : null, 1800);

  // Cleanup on unmount
  useEffect(() => () => {
    if (startTurboRef.current) clearInterval(startTurboRef.current);
    if (endTurboRef.current)   clearInterval(endTurboRef.current);
  }, []);

  function launchTurbo(side, direction) {
    const ref    = side === 'start' ? startTurboRef : endTurboRef;
    const valRef = side === 'start' ? startTurboVal : endTurboVal;
    const setter = side === 'start' ? setStartTurboVIX : setEndTurboVIX;
    const floor  = 5, ceil = 80;
    const step   = direction === 'up' ? 0.4 : -0.25;
    if (ref.current) return;
    ref.current = setInterval(() => {
      valRef.current = direction === 'up'
        ? Math.min(ceil, valRef.current + step)
        : Math.max(floor, valRef.current + step);
      setter(Math.round(valRef.current));
      const done = direction === 'up' ? valRef.current >= ceil : valRef.current <= floor;
      if (done) { clearInterval(ref.current); ref.current = null; }
    }, 80);
  }

  function stopTurbo(side) {
    const ref = side === 'start' ? startTurboRef : endTurboRef;
    if (ref.current) { clearInterval(ref.current); ref.current = null; }
  }

  function clearTurbo(side) {
    stopTurbo(side);
    if (side === 'start') { setStartTurboVIX(null); startTurboVal.current = 30; }
    else                  { setEndTurboVIX(null);   endTurboVal.current   = 30; }
  }

  function handleStartPointerDown() {
    if (startSlider === 100) {
      startTurboVal.current = startTurboVIX ?? 30;
      launchTurbo('start', 'up');
    } else if (startSlider === 0) {
      startTurboVal.current = startTurboVIX ?? 10;
      launchTurbo('start', 'down');
    }
  }

  function handleEndPointerDown() {
    if (endSlider === 100) {
      endTurboVal.current = endTurboVIX ?? 30;
      launchTurbo('end', 'up');
    } else if (endSlider === 0) {
      endTurboVal.current = endTurboVIX ?? 10;
      launchTurbo('end', 'down');
    }
  }

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
    const W = cssW, H = cssH;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#07080f';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1a1d35';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    if (step < 3) return;

    const padX = 40, padY = 20, plotH = H - padY * 2;
    const minY = Math.min(startPrice, endPrice) - 3;
    const maxY = Math.max(startPrice, endPrice) + 3;
    const range = maxY - minY || 1;
    const toY = (p) => padY + (1 - (p - minY) / range) * plotH;
    const startY = toY(startPrice), endY = toY(endPrice);
    const startX = padX, endX = W - padX, midX = (startX + endX) / 2;

    const grad = ctx.createLinearGradient(0, endY, 0, startY + 20);
    grad.addColorStop(0, 'rgba(34,212,123,0.28)');
    grad.addColorStop(1, 'rgba(34,212,123,0.02)');

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
    ctx.strokeStyle = '#22d47b'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
    ctx.lineTo(endX, H); ctx.lineTo(startX, H); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath(); ctx.arc(startX, startY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22d47b'; ctx.fill();
    ctx.beginPath(); ctx.arc(endX, endY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    ctx.fillStyle = '#22d47b'; ctx.font = 'bold 12px "DM Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillText(startPrice.toFixed(1), startX + 8, startY - 8);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
    ctx.fillText(endPrice.toFixed(1), endX - 8, endY - 8);
  }, [startPrice, endPrice, step]);

  // Gauge animation
  useEffect(() => {
    if (step !== 4 || !result) return;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1800, 1);
      setGaugeAngle(-90 + (1 - Math.pow(1 - progress, 3)) * (result.probability / 100) * 180);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [step, result]);

  async function calculate() {
    if (jumpPct <= 0) return;
    setCalcFlash(true);
    setTimeout(() => setCalcFlash(false), 300);
    setCalculating(true);
    try {
      const res = await fetch(`/api/algorithm?jump=${jumpPct.toFixed(2)}`);
      const data = await res.json();
      setResult(data); setStep(4); setGaugeAngle(-90);
    } catch {}
    setCalculating(false);
  }

  function reset() {
    clearTurbo('start'); clearTurbo('end');
    setStep(1); setResult(null);
    setStartSlider(vixToSlider(15)); setEndSlider(vixToSlider(20));
    setGaugeAngle(-90);
  }

  const gaugeColor = result == null ? 'var(--indigo)'
    : result.probability >= 60 ? '#22d47b'
    : result.probability >= 30 ? '#f5c118' : '#f0515e';

  const startIsTurbo = startTurboVIX !== null;
  const endIsTurbo   = endTurboVIX   !== null;

  return (
    <Layout>
      <style>{`
        @keyframes panel-reveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes calc-flash {
          0%   { opacity: 1; }
          50%  { opacity: 0.45; }
          100% { opacity: 1; }
        }
        .calc-btn {
          padding: 14px 32px;
          background: var(--green);
          border: none; border-radius: 10px;
          color: #000; cursor: pointer;
          font-family: var(--font-display); font-size: 14px; font-weight: 700;
          letter-spacing: 0.04em;
          box-shadow: 0 0 24px rgba(34,212,123,0.35);
          transition: filter 0.2s, box-shadow 0.2s, transform 0.12s;
        }
        .calc-btn:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 0 32px rgba(34,212,123,0.5); }
        .calc-btn:active:not(:disabled) { transform: scale(0.96); }
        .calc-btn:disabled { background: var(--surface-2); color: var(--green); cursor: wait; box-shadow: none; }
        .reset-btn {
          padding: 12px 24px;
          background: var(--surface-2); border: 1px solid var(--border-2);
          border-radius: 10px; color: var(--text-2); cursor: pointer;
          font-family: var(--font-body); font-size: 13px;
          transition: color 0.15s, border-color 0.15s, transform 0.12s;
        }
        .reset-btn:hover { color: var(--text-1); border-color: var(--border-2); }
        .reset-btn:active { transform: scale(0.96); }
        .stat-mini {
          background: var(--surface-2); border-radius: 8px; padding: 10px 14px; flex: 1;
        }
      `}</style>

      <div style={{ padding: '32px 28px', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            SIMULATE <span style={{ color: 'var(--red)' }}>HIKE</span>
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
            Set a two-day VIX move · see the reversion probability
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {['Set start price', 'Set end price', 'Review hike', 'Results'].map((label, i) => {
            const s = i + 1;
            const done = step > s, active = step === s;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: done ? 'var(--green)' : active ? 'var(--red)' : 'var(--surface-3)',
                  color: done || active ? (done ? '#000' : '#fff') : 'var(--text-3)',
                  fontSize: '11px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {done ? '✓' : s}
                </div>
                <span style={{ fontSize: '11px', color: active ? 'var(--text-1)' : done ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
                  {label}
                </span>
                {i < 3 && <div style={{ width: '20px', height: '1px', background: 'var(--surface-3)' }} />}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>

          {/* Left slider — start price */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '10px', color: step === 1 ? 'var(--red)' : 'var(--text-3)', textAlign: 'center', letterSpacing: '0.05em', fontFamily: 'var(--font-body)' }}>
              START
            </div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: startIsTurbo ? 'var(--yellow)' : 'var(--text-1)', minWidth: '36px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {startPrice}
              {startIsTurbo && <span style={{ fontSize: '9px', color: 'var(--yellow)', display: 'block', marginTop: '-2px', letterSpacing: '0.06em' }}>TURBO</span>}
            </div>
            <input
              type="range" min="0" max="100" step="1"
              value={startSlider}
              onPointerDown={handleStartPointerDown}
              onPointerUp={() => stopTurbo('start')}
              onChange={(e) => {
                const s = parseInt(e.target.value);
                setStartSlider(s);
                if (s === 100) {
                  startTurboVal.current = startTurboVIX ?? 30;
                  launchTurbo('start', 'up');
                } else if (s === 0) {
                  startTurboVal.current = startTurboVIX ?? 10;
                  launchTurbo('start', 'down');
                } else {
                  clearTurbo('start');
                }
                const newStart = s === 100 ? (startTurboVIX ?? 30) : sliderToVIX(s);
                if (endPrice <= newStart) { clearTurbo('end'); setEndSlider(Math.min(100, s + 15)); }
                if (step === 1) setStep(2);
                if (step >= 3) setStep(3);
                setResult(null);
              }}
              style={{
                writingMode: 'vertical-lr', direction: 'rtl',
                height: '240px', accentColor: startIsTurbo ? '#f5c118' : '#f0515e',
                cursor: 'pointer', opacity: step === 4 ? 0.4 : 1,
              }}
              disabled={step === 4}
            />
            <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>VIX</div>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', textAlign: 'center', maxWidth: '44px', lineHeight: 1.3, fontFamily: 'var(--font-body)' }}>
              hold top for↑80
            </div>
          </div>

          {/* Chart area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {step === 1 && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-2)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                Drag the <span style={{ color: 'var(--red)' }}>left bar</span> to set the VIX starting price
              </div>
            )}
            {step === 2 && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-2)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                Now drag the <span style={{ color: 'var(--text-1)' }}>right bar</span> to set the ending price
              </div>
            )}
            {step >= 3 && step < 4 && (
              <div style={{
                background: 'rgba(34,212,123,0.05)', border: '1px solid rgba(34,212,123,0.25)',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '12px', color: 'var(--green)', textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                fontFamily: 'var(--font-body)',
              }}>
                2-day hike:&nbsp;
                <span style={{ fontWeight: 700 }}>+</span>
                <Odometer value={jumpPct.toFixed(1)} fontSize={18} color="#22d47b" />
                <span style={{ fontWeight: 700, fontSize: '18px', fontFamily: 'var(--font-display)' }}>%</span>
              </div>
            )}
            {step === 4 && (
              <div style={{ background: 'rgba(34,212,123,0.05)', border: '1px solid rgba(34,212,123,0.2)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', color: 'var(--green)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                Simulated hike: <strong>+{jumpPct.toFixed(1)}%</strong> (from {startPrice} → {endPrice})
              </div>
            )}

            <canvas ref={canvasRef} style={{
              width: '100%', height: '240px', borderRadius: '10px',
              border: '1px solid var(--border)', display: 'block',
            }} />

            {step === 4 && result && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '20px',
                display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap',
                animation: 'panel-reveal 0.5s ease-out both',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>Reversion probability</div>
                  <svg width="140" height="80" viewBox="0 0 140 80">
                    <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="var(--surface-3)" strokeWidth="10" strokeLinecap="round" />
                    <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={gaugeColor} strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${Math.PI * 60 * (result.probability / 100)} ${Math.PI * 60}`} />
                    <line x1="70" y1="75"
                      x2={70 + 48 * Math.cos((gaugeAngle * Math.PI) / 180)}
                      y2={75 + 48 * Math.sin((gaugeAngle * Math.PI) / 180)}
                      stroke="var(--text-1)" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="70" cy="75" r="4" fill="var(--text-1)" />
                    <text x="70" y="68" textAnchor="middle" fill={gaugeColor} fontSize="15" fontWeight="bold" fontFamily="DM Mono, monospace">
                      {animProb}%
                    </text>
                  </svg>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>Happens once every</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--indigo)', fontFamily: 'var(--font-mono)' }}>
                        {animFreq}
                      </span>
                      <span style={{ fontSize: '14px', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>trading days</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="stat-mini">
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>Spike instances</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{result.instances}</div>
                    </div>
                    <div className="stat-mini">
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>Reverted</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{result.reversions}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right slider — end price */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '10px', color: step === 2 ? 'var(--text-1)' : 'var(--text-3)', textAlign: 'center', letterSpacing: '0.05em', fontFamily: 'var(--font-body)' }}>
              END
            </div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: endIsTurbo ? 'var(--yellow)' : 'var(--text-1)', minWidth: '36px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {endPrice}
              {endIsTurbo && <span style={{ fontSize: '9px', color: 'var(--yellow)', display: 'block', marginTop: '-2px', letterSpacing: '0.06em' }}>TURBO</span>}
            </div>
            <input
              type="range" min="0" max="100" step="1"
              value={endSlider}
              onPointerDown={handleEndPointerDown}
              onPointerUp={() => stopTurbo('end')}
              onChange={(e) => {
                const s = parseInt(e.target.value);
                if (s === 100) {
                  setEndSlider(s);
                  endTurboVal.current = endTurboVIX ?? 30;
                  launchTurbo('end', 'up');
                } else if (s === 0) {
                  setEndSlider(s);
                  endTurboVal.current = endTurboVIX ?? 10;
                  launchTurbo('end', 'down');
                } else {
                  const newEnd = sliderToVIX(s);
                  if (newEnd <= startPrice) return;
                  setEndSlider(s);
                  clearTurbo('end');
                }
                if (step === 2) setStep(3);
                if (step >= 3) setStep(3);
                setResult(null);
              }}
              style={{
                writingMode: 'vertical-lr', direction: 'rtl',
                height: '240px', accentColor: endIsTurbo ? '#f5c118' : '#edf0f7',
                cursor: step < 2 ? 'not-allowed' : 'pointer',
                opacity: step < 2 ? 0.2 : step === 4 ? 0.4 : 1,
              }}
              disabled={step < 2 || step === 4}
            />
            <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>VIX</div>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', textAlign: 'center', maxWidth: '44px', lineHeight: 1.3, fontFamily: 'var(--font-body)' }}>
              hold top for↑80
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {step >= 3 && step < 4 && `+${jumpPct.toFixed(1)}% hike · ${startPrice} → ${endPrice}`}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {step === 4 && (
              <button className="reset-btn" onClick={reset}>RESET</button>
            )}
            {step >= 3 && step < 4 && (
              <button
                className="calc-btn"
                onClick={calculate}
                disabled={calculating}
                style={{ animation: calcFlash ? 'calc-flash 0.3s ease-out' : 'none' }}
              >
                {calculating ? 'CALCULATING…' : 'CALCULATE NOW'}
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.8, fontFamily: 'var(--font-body)' }}>
          Based on daily VIX closing prices · Jan 1990 – Apr 2026 · reversion window: 10 trading days
          <br />
          <span style={{ color: 'var(--surface-3)' }}>VIX typical range: 10–30 · Stressed markets: 30–50 · Crisis peaks (2008, COVID): 50–89</span>
        </div>
      </div>
    </Layout>
  );
}
