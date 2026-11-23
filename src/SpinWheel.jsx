import { useState, useRef } from 'react';

// Forfeit wheel: spins over the winner's secret library and lands on one
// item at random. Slices show numbers only, so the list stays secret even
// if the loser is watching — only the winning forfeit is revealed.
const COLORS = ['#db2777', '#7c3aed', '#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#ea580c', '#dc2626'];

export default function SpinWheel({ items, onResult }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const pickRef = useRef(null);

  const n = items.length;
  const slice = 360 / n;
  const size = 260;
  const r = size / 2;

  const spin = () => {
    if (spinning || result || n === 0) return;
    const idx = Math.floor(Math.random() * n);
    pickRef.current = idx;
    // Land the middle of slice idx under the pointer at the top, with a
    // little wobble inside the slice so it doesn't look mechanical.
    const wobble = (Math.random() - 0.5) * slice * 0.6;
    const target = 360 * 7 + (360 - (idx * slice + slice / 2)) + wobble;
    setSpinning(true);
    setRotation(target);
  };

  const onEnd = () => {
    if (!spinning) return;
    setSpinning(false);
    const item = items[pickRef.current];
    setResult(item);
    if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
    // Give the reveal a few seconds on screen before it's saved and the
    // panel switches to "owes: …".
    setTimeout(() => onResult(item.text), 3500);
  };

  const path = (i) => {
    if (n === 1) return null;
    const a0 = (i * slice - 90) * Math.PI / 180;
    const a1 = ((i + 1) * slice - 90) * Math.PI / 180;
    const large = slice > 180 ? 1 : 0;
    return `M${r},${r} L${r + r * Math.cos(a0)},${r + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${r + r * Math.cos(a1)},${r + r * Math.sin(a1)} Z`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
      <div style={{ position: 'relative', width: size, height: size + 14, maxWidth: '100%' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '22px solid #f8fafc', zIndex: 2, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }} />
        <svg
          width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          onTransitionEnd={onEnd}
          style={{ marginTop: 14, transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none', borderRadius: '50%', boxShadow: '0 0 24px rgba(219,39,119,0.45)' }}
        >
          {n === 1 ? (
            <circle cx={r} cy={r} r={r} fill={COLORS[0]} />
          ) : items.map((it, i) => (
            <path key={it.id} d={path(i)} fill={COLORS[i % COLORS.length]} stroke="#000" strokeWidth="2" />
          ))}
          {items.map((it, i) => {
            const a = ((i + 0.5) * slice - 90) * Math.PI / 180;
            const tx = r + r * 0.68 * Math.cos(a);
            const ty = r + r * 0.68 * Math.sin(a);
            return <text key={'t' + it.id} x={tx} y={ty} fill="#fff" fontSize="20" fontWeight="900" textAnchor="middle" dominantBaseline="central">{n === 1 ? '?' : i + 1}</text>;
          })}
          <circle cx={r} cy={r} r={26} fill="#000" stroke="#f8fafc" strokeWidth="3" />
          <text x={r} y={r} fontSize="22" textAnchor="middle" dominantBaseline="central">😈</text>
        </svg>
      </div>
      {result ? (
        <div style={{ textAlign: 'center', animation: 'popIn 0.5s ease-out', background: '#111', border: '2px solid #f472b6', borderRadius: '14px', padding: '10px 14px', maxWidth: '92%' }}>
          <div style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 800, letterSpacing: '0.05em' }}>THE WHEEL HAS SPOKEN</div>
          <div style={{ fontSize: '1.1rem', color: '#f8fafc', fontWeight: 800, marginTop: '4px' }}>{result.text}</div>
        </div>
      ) : (
        <button onClick={spin} disabled={spinning}
          style={{ background: '#db2777', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 22px', fontSize: '1rem', fontWeight: 800, cursor: spinning ? 'default' : 'pointer', opacity: spinning ? 0.6 : 1 }}>
          {spinning ? 'Spinning…' : '🎡 Spin the wheel'}
        </button>
      )}
    </div>
  );
}
