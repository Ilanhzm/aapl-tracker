import { SessionProvider } from 'next-auth/react';

const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #040509;
    --surface:   #0b0d1a;
    --surface-2: #101323;
    --surface-3: #161929;
    --border:    rgba(255,255,255,0.07);
    --border-2:  rgba(255,255,255,0.13);
    --text-1:    #edf0f7;
    --text-2:    #8892a4;
    --text-3:    #3d4255;
    --green:     #00e87a;
    --red:       #ff3356;
    --indigo:    #7c8cf8;
    --yellow:    #f5c118;
    --font-display: 'Syne', sans-serif;
    --font-body:    'DM Sans', sans-serif;
    --font-mono:    'DM Mono', monospace;
    --nav-h:     91px;
  }

  html, body {
    background: var(--bg);
    color: var(--text-1);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-image: radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  a    { color: inherit; text-decoration: none; }
  button, input, select, textarea { font-family: var(--font-body); }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.13); }
  ::selection { background: rgba(124,140,248,0.28); }

  .glow-green { text-shadow: 0 0 28px rgba(0,232,122,0.55); }
  .glow-red   { text-shadow: 0 0 28px rgba(255,51,86,0.55); }
  .glow-white { text-shadow: 0 0 32px rgba(237,240,247,0.25); }

  .glass-card {
    background: rgba(11,13,26,0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border);
    border-radius: 16px;
  }

  .lift-card {
    transition: transform 0.22s cubic-bezier(.2,.8,.4,1), box-shadow 0.22s;
  }
  .lift-card:hover {
    transform: translateY(-3px);
  }

  .btn-primary {
    background: var(--indigo);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-family: var(--font-display);
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.18s, box-shadow 0.18s, transform 0.12s;
  }
  .btn-primary:hover { filter: brightness(1.18); box-shadow: 0 0 24px rgba(124,140,248,0.38); }
  .btn-primary:active { transform: scale(0.96); }

  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text-2);
    cursor: pointer;
    font-family: var(--font-body);
    transition: color 0.15s, border-color 0.15s, transform 0.12s;
  }
  .btn-ghost:hover { color: var(--text-1); border-color: var(--border-2); }
  .btn-ghost:active { transform: scale(0.96); }

  .text-input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text-1);
    font-family: var(--font-body);
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
  }
  .text-input:focus { border-color: var(--border-2); }
  .text-input::placeholder { color: var(--text-3); }

  @keyframes blink-spike { 0%,100%{opacity:1} 50%{opacity:0.15} }
  @keyframes spike-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,51,86,0); }
    50%      { box-shadow: 0 0 40px 6px rgba(255,51,86,0.16); }
  }
  @keyframes orb-drift-a {
    0%   { transform: translate(0,0) scale(1); }
    100% { transform: translate(50px,-35px) scale(1.1); }
  }
  @keyframes orb-drift-b {
    0%   { transform: translate(0,0) scale(1); }
    100% { transform: translate(-40px,30px) scale(1.06); }
  }
  @keyframes card-enter {
    from { opacity: 0; transform: scale(0.93) translateY(20px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes panel-reveal {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <Component {...pageProps} />
    </SessionProvider>
  );
}
