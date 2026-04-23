import { getSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Odometer from '../components/Odometer';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

function sliderToVIX(s) { return 10 + Math.round(s * 0.2); }
function vixToSlider(vix) { return Math.round((Math.max(10, Math.min(30, vix)) - 10) * 5); }

function useSMN(target, duration = 1200) {
  const [display, setDisplay] = useState(null);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target === null) { setDisplay(null); return; }
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setDisplay((target * (1 - Math.pow(1 - p, 3))).toFixed(1));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return display;
}

export default function SimulateHike() {
  const [startSlider, setStartSlider] = useState(vixToSlider(15));
  const [endSlider, setEndSlider] = useState(vixToSlider(20));
  const [startTurboVIX, setStartTurboVIX] = useState(null);
  const [endTurboVIX, setEndTurboVIX] = useState(null);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [gaugeAngle, setGaugeAngle] = useState(-90);
  const canvasRef = useRef(null);
  const startTurboRef = useRef(null);
  const endTurboRef = useRef(null);
  const startTurboVal = useRef(30);
  const endTurboVal = useRef(30);

  const startPrice = startTurboVIX ?? sliderToVIX(startSlider);
  const endPrice = endTurboVIX ?? sliderToVIX(endSlider);
  const jumpPct = endPrice > startPrice ? (((endPrice - startPrice) / startPrice) * 100) : 0;

  const animProb = useSMN(step === 4 && result ? result.probability : null, 1800);
  const animFreq = useSMN(step === 4 && result ? (result.instances > 0 ? Math.round(result.totalDays / result.instances) : 0) : null, 1800);

  useEffect(() => () => {
    if (startTurboRef.current) clearInterval(startTurboRef.current);
    if (endTurboRef.current) clearInterval(endTurboRef.current);
  }, []);

  function launchTurbo(side, direction) {
    const ref = side === 'start' ? startTurboRef : endTurboRef;
    const valRef = side === 'start' ? startTurboVal : endTurboVal;
    const setter = side === 'start' ? setStartTurboVIX : setEndTurboVIX;
    const inc = direction === 'up' ? 0.4 : -0.25;
    if (ref.current) return;
    ref.current = setInterval(() => {
      valRef.current = direction === 'up' ? Math.min(80, valRef.current + inc) : Math.max(5, valRef.current + inc);
      setter(Math.round(valRef.current));
      const done = direction === 'up' ? valRef.current >= 80 : valRef.current <= 5;
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
    else { setEndTurboVIX(null); endTurboVal.current = 30; }
  }

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 500;
    const cssH = canvas.clientHeight || 200;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = cssW, H = cssH;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#040509';
    ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    for (let i = 0; i <= 3; i++) {
      const y = (i / 3) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.setLineDash([]);
    if (step < 3) return;

    const padX = 32, padY = 16;
    const plotH = H - padY * 2;
    const minY = Math.min(startPrice, endPrice) - 3;
    const maxY = Math.max(startPrice, endPrice) + 3;
    const range = maxY - minY || 1;
    const toY = (p) => padY + (1 - (p - minY) / range) * plotH;
    const sX = padX, eX = W - padX, mX = (sX + eX) / 2;
    const sY = toY(startPrice), eY = toY(endPrice);

    const grad = ctx.createLinearGradient(0, eY, 0, H);
    grad.addColorStop(0, 'rgba(0,232,122,0.22)');
    grad.addColorStop(1, 'rgba(0,232,122,0)');

    ctx.beginPath();
    ctx.moveTo(sX, sY);
    ctx.bezierCurveTo(mX, sY, mX, eY, eX, eY);
    ctx.shadowColor = 'rgba(0,232,122,0.4)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#00e87a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(sX, sY);
    ctx.bezierCurveTo(mX, sY, mX, eY, eX, eY);
    ctx.lineTo(eX, H); ctx.lineTo(sX, H); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath(); ctx.arc(sX, sY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#00e87a'; ctx.fill();
    ctx.beginPath(); ctx.arc(eX, eY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    ctx.fillStyle = '#00e87a';
    ctx.font = 'bold 11px "DM Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(startPrice.toFixed(1), sX + 8, sY - 8);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(endPrice.toFixed(1), eX - 8, eY - 8);
  }, [startPrice, endPrice, step]);

  // Gauge
  useEffect(() => {
    if (step !== 4 || !result) return;
    let t0 = null;
    const animate = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / 1800, 1);
      setGaugeAngle(-90 + (1 - Math.pow(1 - p, 3)) * (result.probability / 100) * 180);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [step, result]);

  async function calculate() {
    if (jumpPct <= 0) return;
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

  const gaugeColor = result == null ? '#7c8cf8'
    : result.probability >= 60 ? '#00e87a'
    : result.probability >= 30 ? '#f5c118' : '#ff3356';

  const startIsTurbo = startTurboVIX !== null;
  const endIsTurbo = endTurboVIX !== null;

  const STEPS = ['Start price', 'End price', 'Review', 'Results'];

  return (
    <Layout>
      <style>{`
        @keyframes calc-flash { 0%{opacity:1} 50%{opacity:0.4} 100%{opacity:1} }
        .calc-btn {
          padding: 14px 28px; background: var(--green);
          border: none; border-radius: 12px; color: #000;
          font-family: var(--font-display); font-size: 14px; font-weight: 700;
          letter-spacing: 0.03em; cursor: pointer;
          box-shadow: 0 0 28px rgba(0,232,122,0.35);
          transition: filter 0.18s, box-shadow 0.18s, transform 0.12s;
          width: 100%;
        }
        .calc-btn:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 0 40px rgba(0,232,122,0.5); }
        .calc-btn:active:not(:disabled) { transform: scale(0.97); }
        .calc-btn:disabled { background: var(--surface-2); color: var(--green); cursor: wait; box-shadow: none; }
        .slider-vix {
          font-family: var(--font-mono); font-size: 22px; font-weight: 500;
          text-align: center; min-height: 32px; line-height: 1;
        }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '48px' }}>
        {/* Header */}
        <div style={{ maxWidth: '1200px', margin: '0 auto 36px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.03em', margin: 0 }}>
            SIMULATE <span style={{ color: 'var(--red)' }}>HIKE</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px', fontFamily: 'var(--font-body)' }}>
            Set a two-day VIX move and see the historical reversion probability
          </p>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '28px', alignItems: 'start' }}>

          {/* ── LEFT PANEL: Controls ── */}
          <div className="glass-card" style={{ padding: '28px' }}>
            {/* Steps */}
            <div style={{ marginBottom: '28px' }}>
              {STEPS.map((label, i) => {
                const s = i + 1;
                const done = step > s, active = step === s;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                      background: done ? 'var(--green)' : active ? 'var(--red)' : 'var(--surface-3)',
                      color: done ? '#000' : active ? '#fff' : 'var(--text-3)',
                      fontSize: '11px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {done ? '✓' : s}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: active ? 'var(--text-1)' : done ? 'var(--green)' : 'var(--text-3)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Sliders side by side */}
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '24px' }}>
              {/* Start slider */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '10px', color: step === 1 ? 'var(--red)' : 'var(--text-3)', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>START</div>
                <div className="slider-vix" style={{ color: startIsTurbo ? 'var(--yellow)' : 'var(--text-1)' }}>
                  {startPrice}
                  {startIsTurbo && <div style={{ fontSize: '9px', color: 'var(--yellow)', letterSpacing: '0.08em', marginTop: '2px' }}>TURBO</div>}
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  value={startSlider}
                  onPointerDown={() => {
                    if (startSlider === 100) { startTurboVal.current = startTurboVIX ?? 30; launchTurbo('start', 'up'); }
                    else if (startSlider === 0) { startTurboVal.current = startTurboVIX ?? 10; launchTurbo('start', 'down'); }
                  }}
                  onPointerUp={() => stopTurbo('start')}
                  onChange={(e) => {
                    const s = parseInt(e.target.value);
                    setStartSlider(s);
                    if (s === 100) { startTurboVal.current = startTurboVIX ?? 30; launchTurbo('start', 'up'); }
                    else if (s === 0) { startTurboVal.current = startTurboVIX ?? 10; launchTurbo('start', 'down'); }
                    else { clearTurbo('start'); }
                    const newStart = s === 100 ? (startTurboVIX ?? 30) : sliderToVIX(s);
                    if (endPrice <= newStart) { clearTurbo('end'); setEndSlider(Math.min(100, s + 15)); }
                    if (step === 1) setStep(2);
                    if (step >= 3) setStep(3);
                    setResult(null);
                  }}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '200px', accentColor: startIsTurbo ? '#f5c118' : '#ff3356', cursor: 'pointer', opacity: step === 4 ? 0.35 : 1 }}
                  disabled={step === 4}
                />
                <div style={{ fontSize: '9px', color: 'var(--text-3)', textAlign: 'center', maxWidth: '40px', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>
                  hold at top →80
                </div>
              </div>

              {/* End slider */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '10px', color: step === 2 ? 'var(--text-1)' : 'var(--text-3)', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>END</div>
                <div className="slider-vix" style={{ color: endIsTurbo ? 'var(--yellow)' : 'var(--text-1)' }}>
                  {endPrice}
                  {endIsTurbo && <div style={{ fontSize: '9px', color: 'var(--yellow)', letterSpacing: '0.08em', marginTop: '2px' }}>TURBO</div>}
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  value={endSlider}
                  onPointerDown={() => {
                    if (endSlider === 100) { endTurboVal.current = endTurboVIX ?? 30; launchTurbo('end', 'up'); }
                    else if (endSlider === 0) { endTurboVal.current = endTurboVIX ?? 10; launchTurbo('end', 'down'); }
                  }}
                  onPointerUp={() => stopTurbo('end')}
                  onChange={(e) => {
                    const s = parseInt(e.target.value);
                    if (s === 100) { setEndSlider(s); endTurboVal.current = endTurboVIX ?? 30; launchTurbo('end', 'up'); }
                    else if (s === 0) { setEndSlider(s); endTurboVal.current = endTurboVIX ?? 10; launchTurbo('end', 'down'); }
                    else { if (sliderToVIX(s) <= startPrice) return; setEndSlider(s); clearTurbo('end'); }
                    if (step === 2) setStep(3);
                    if (step >= 3) setStep(3);
                    setResult(null);
                  }}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '200px', accentColor: endIsTurbo ? '#f5c118' : '#edf0f7', cursor: step < 2 ? 'not-allowed' : 'pointer', opacity: step < 2 ? 0.15 : step === 4 ? 0.35 : 1 }}
                  disabled={step < 2 || step === 4}
                />
                <div style={{ fontSize: '9px', color: 'var(--text-3)', textAlign: 'center', maxWidth: '40px', lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>
                  hold at top →80
                </div>
              </div>
            </div>

            {/* Hike indicator */}
            {step >= 3 && step < 4 && (
              <div style={{
                background: 'rgba(0,232,122,0.06)', border: '1px solid rgba(0,232,122,0.2)',
                borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}>
                <span style={{ fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)' }}>2-day hike:</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>+</span>
                <Odometer value={jumpPct.toFixed(1)} fontSize={20} color="#00e87a" />
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>%</span>
              </div>
            )}
            {step === 4 && (
              <div style={{ background: 'rgba(0,232,122,0.06)', border: '1px solid rgba(0,232,122,0.15)', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '12px', color: 'var(--green)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                +{jumpPct.toFixed(1)}% hike · {startPrice} → {endPrice}
              </div>
            )}

            {/* Actions */}
            {step >= 3 && step < 4 && (
              <button className="calc-btn" onClick={calculate} disabled={calculating}>
                {calculating ? 'CALCULATING…' : 'CALCULATE NOW'}
              </button>
            )}
            {step === 4 && (
              <button className="btn-ghost" onClick={reset} style={{ padding: '12px', width: '100%', fontSize: '13px' }}>
                RESET
              </button>
            )}

            <div style={{ marginTop: '20px', fontSize: '10px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
              Jan 1990 – Apr 2026 · reversion window: 10 trading days
            </div>
          </div>

          {/* ── RIGHT PANEL: Chart + Results ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Instruction */}
            {step === 1 && (
              <div className="glass-card" style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
                Drag the <span style={{ color: 'var(--red)', fontWeight: 600 }}>Start</span> slider to set the VIX starting price
              </div>
            )}
            {step === 2 && (
              <div className="glass-card" style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
                Now drag the <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>End</span> slider to set the peak price
              </div>
            )}

            {/* Chart */}
            <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '14px 18px 8px', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>
                SIMULATED VIX MOVE
              </div>
              <canvas ref={canvasRef} style={{ width: '100%', height: '200px', display: 'block' }} />
            </div>

            {/* Results */}
            {step === 4 && result && (
              <div className="glass-card" style={{ padding: '28px', animation: 'panel-reveal 0.5s ease-out both' }}>
                <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Gauge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>Reversion probability</div>
                    <svg width="150" height="85" viewBox="0 0 140 80">
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

                  {/* Stats */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '14px 18px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>Happens once every</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--indigo)', fontFamily: 'var(--font-mono)' }}>{animFreq}</span>
                        <span style={{ fontSize: '14px', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>trading days</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[
                        { label: 'Spike instances', value: result.instances, color: 'var(--text-1)' },
                        { label: 'Reverted', value: result.reversions, color: 'var(--green)' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>{label}</div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
