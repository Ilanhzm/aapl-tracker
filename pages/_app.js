import { SessionProvider } from 'next-auth/react';

const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #07080f;
    --surface:   #0d0e1c;
    --surface-2: #131525;
    --surface-3: #1a1d35;
    --border:    rgba(255,255,255,0.07);
    --border-2:  rgba(255,255,255,0.13);
    --text-1:    #edf0f7;
    --text-2:    #8892a4;
    --text-3:    #404659;
    --green:     #22d47b;
    --red:       #f0515e;
    --indigo:    #6c7ef8;
    --yellow:    #f5c118;
    --font-display: 'Syne', sans-serif;
    --font-body:    'DM Sans', sans-serif;
    --font-mono:    'DM Mono', monospace;
  }

  html, body {
    background: var(--bg);
    color: var(--text-1);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a    { color: inherit; text-decoration: none; }
  button, input, select, textarea { font-family: var(--font-body); }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
  ::selection { background: rgba(108,126,248,0.25); }

  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity: 0.025;
    pointer-events: none;
    z-index: 9999;
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
