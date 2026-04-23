import { useRef, useEffect, useState } from 'react';

function OdometerDigit({ char, fontSize, color, delay = 0 }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!/\d/.test(char)) {
    return (
      <span style={{
        display: 'inline-block',
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color,
        fontFamily: '"DM Mono", monospace',
        lineHeight: 1,
        verticalAlign: 'bottom',
        background: 'transparent',
      }}>
        {char}
      </span>
    );
  }

  const d = parseInt(char, 10);
  const h = fontSize * 1.15;

  return (
    <span style={{
      display: 'inline-block',
      overflow: 'hidden',
      height: `${h}px`,
      verticalAlign: 'bottom',
      background: 'transparent',
    }}>
      <span style={{
        display: 'flex',
        flexDirection: 'column',
        transform: `translateY(${mounted ? -d * h : 0}px)`,
        transition: mounted ? `transform 0.55s cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms` : 'none',
        willChange: 'transform',
        background: 'transparent',
      }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} style={{
            display: 'block',
            height: `${h}px`,
            lineHeight: `${h}px`,
            fontSize: `${fontSize}px`,
            fontWeight: 'bold',
            color,
            fontFamily: '"DM Mono", monospace',
            textAlign: 'center',
            minWidth: `${fontSize * 0.62}px`,
            background: 'transparent',
          }}>
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function Odometer({ value, fontSize = 56, color = '#fff' }) {
  const prevRef = useRef(null);
  const str = value !== null && value !== undefined ? String(value) : null;

  if (!str) {
    return (
      <span style={{ fontSize: `${fontSize}px`, color, fontFamily: 'monospace', fontWeight: 'bold' }}>
        —
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end' }}>
      {str.split('').map((char, i) => (
        <OdometerDigit
          key={i}
          char={char}
          fontSize={fontSize}
          color={color}
          delay={i * 30}
        />
      ))}
    </span>
  );
}
