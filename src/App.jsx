import React, { useState, useEffect } from 'react';

const TIERS = [
  { id: 'quick', label: 'Quick Burn', desc: '15-20 min mobility/core', pts: 25, icon: '⚡' },
  { id: 'standard', label: 'Full Session', desc: '30-45 min strength/cardio', pts: 50, icon: '🔥' },
  { id: 'beast', label: 'Beast Mode', desc: '60+ min intense training', pts: 100, icon: '💀' },
];

const INITIAL_CHALLENGES = [
  { id: 1, title: '4-Day Streak', desc: 'First to log 4 days in a row', reward: 150, stake: 'Winner picks dinner', completedBy: null },
  { id: 2, title: 'Weekend Warrior', desc: 'Log on Saturday & Sunday', reward: 120, stake: 'Loser makes morning coffee', completedBy: null },
  { id: 3, title: '500-Point Sprint', desc: 'First to reach 500 XP', reward: 200, stake: 'Dish duty pass (3 days)', completedBy: null },
];

const BADGES = [
  { id: 'first', title: 'First Blood', desc: 'Logged your first workout', icon: '🎯', check: (s, h) => h.length >= 1 },
  { id: 'beast', title: 'Beast Mode', desc: 'Completed a 100-pt session', icon: '🦍', check: (s, h) => h.some(i => i.pts >= 100) },
  { id: 'club500', title: '500 Club', desc: 'Reached 500 total XP', icon: '💎', check: (s) => s.Martin + s.Karine >= 500 },
  { id: 'couple', title: 'Power Couple', desc: 'Both logged on the same day', icon: '👑', check: (s, h) => {
    const d = {};
    h.forEach(i => { d[i.date] = d[i.date] || new Set(); d[i.date].add(i.person); });
    return Object.values(d).some(set => set.size >= 2);
  }},
];

function getLevel(pts) {
  if (pts >= 2000) return { lvl: 5, title: 'Titan Legend', next: 3000, prev: 2000 };
  if (pts >= 1200) return { lvl: 4, title: 'Iron Contender', next: 2000, prev: 1200 };
  if (pts >= 600) return { lvl: 3, title: 'Rivalry Warrior', next: 1200, prev: 600 };
  if (pts >= 250) return { lvl: 2, title: 'Active Challenger', next: 600, prev: 250 };
  return { lvl: 1, title: 'Rookie', next: 250, prev: 0 };
}

export default function App() {
  const [tab, setTab] = useState('arena');
  const [person, setPerson] = useState('Martin');
  const [scores, setScores] = useState(() => JSON.parse(localStorage.getItem('mk_scores')) || { Martin: 0, Karine: 0 });
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('mk_history')) || []);
  const [challenges, setChallenges] = useState(() => JSON.parse(localStorage.getItem('mk_chal')) || INITIAL_CHALLENGES);
  const [customPts, setCustomPts] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [taunt, setTaunt] = useState('');
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { localStorage.setItem('mk_scores', JSON.stringify(scores)); }, [scores]);
  useEffect(() => { localStorage.setItem('mk_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('mk_chal', JSON.stringify(challenges)); }, [challenges]);

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr === 12) setTaunt('🕛 Noon Check-in: Time to log some reps and pull the rope!');
    else if (hr === 18) setTaunt('🕕 6 PM Evening Showdown: Prime workout window is open!');
  }, []);

  const logSession = (who, pts, label) => {
    const num = Number(pts);
    if (!num || num <= 0) return;
    setScores(prev => ({ ...prev, [who]: prev[who] + num }));
    const now = new Date();
    const entry = {
      id: Date.now(),
      person: who,
      pts: num,
      label: label || 'Custom Workout',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setHistory(prev => [entry, ...prev]);
  };

  const martinTot = scores.Martin;
  const karineTot = scores.Karine;
  const total = martinTot + karineTot;
  const martinPct = total === 0 ? 50 : Math.round((martinTot / total) * 100);

  const mLevel = getLevel(martinTot);
  const kLevel = getLevel(karineTot);

  const yr = calDate.getFullYear();
  const mo = calDate.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const numDays = new Date(yr, mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) {
    cells.push({ day: d, dateStr: `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <header style={s.header}>
          <div>
            <span style={s.badge}>COUPLES FITNESS ARENA</span>
            <h1 style={s.title}>Martin vs. Karine</h1>
            <p style={s.subtitle}>Tug-of-War, Calendar &amp; Wagers</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ ...s.pCard, borderColor: martinTot >= karineTot ? '#38bdf8' : '#1e293b' }}>
              <div style={{ color: '#38bdf8', fontWeight: 700 }}>Martin {martinTot > karineTot && '👑'}</div>
              <div style={s.scoreNum}>{martinTot} XP</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lvl {mLevel.lvl} • {mLevel.title}</div>
            </div>
            <div style={{ ...s.pCard, borderColor: karineTot > martinTot ? '#f472b6' : '#1e293b' }}>
              <div style={{ color: '#f472b6', fontWeight: 700 }}>Karine {karineTot > martinTot && '👑'}</div>
              <div style={s.scoreNum}>{karineTot} XP</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lvl {kLevel.lvl} • {kLevel.title}</div>
            </div>
          </div>
        </header>

        {taunt && <div style={s.taunt}>📣 {taunt}</div>}

        <div style={s.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>
            <span>🪢 Tug-of-War</span>
            <span>{martinTot === karineTot ? 'Tie' : martinTot > karineTot ? `Martin leads (${martinPct}%)` : `Karine leads (${100 - martinPct}%)`}</span>
          </div>
          <div style={s.tugOuter}>
            <div style={{ ...s.tugM, width: `${martinPct}%` }}>{martinPct > 15 && `Martin`}</div>
            <div style={s.tugFlag}>🚩</div>
            <div style={{ ...s.tugK, width: `${100 - martinPct}%` }}>{100 - martinPct > 15 && `Karine`}</div>
          </div>
        </div>

        <div style={s.nav}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setTab('arena')} style={{ ...s.navBtn, background: tab === 'arena' ? '#1e293b' : 'transparent', color: tab === 'arena' ? '#38bdf8' : '#94a3b8' }}>⚡ Arena</button>
            <button onClick={() => setTab('cal')} style={{ ...s.navBtn, background: tab === 'cal' ? '#1e293b' : 'transparent', color: tab === 'cal' ? '#38bdf8' : '#94a3b8' }}>🗓️ Calendar</button>
            <button onClick={() => setTab('badges')} style={{ ...s.navBtn, background: tab === 'badges' ? '#1e293b' : 'transparent', color: tab === 'badges' ? '#38bdf8' : '#94a3b8' }}>🏆 Trophies</button>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Logging for:</span>
            <button onClick={() => setPerson('Martin')} style={{ ...s.toggleBtn, background: person === 'Martin' ? '#0284c7' : '#1e293b' }}>Martin</button>
            <button onClick={() => setPerson('Karine')} style={{ ...s.toggleBtn, background: person === 'Karine' ? '#db2777' : '#1e293b' }}>Karine</button>
          </div>
        </div>

        {tab === 'arena' && (
          <div style={s.grid2}>
            <div style={s.panel}>
              <h3 style={{ marginTop: 0 }}>Log Workout for <span style={{ color: person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{person}</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {TIERS.map(t => (
                  <button key={t.id} onClick={() => logSession(person, t.pts, t.label)} style={s.tierCard}>
                    <span style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                    <strong style={{ fontSize: '0.9rem', marginTop: '4px' }}>{t.label}</strong>
                    <span style={{ color: person === 'Martin' ? '#38bdf8' : '#f472b6', fontWeight: 800, marginTop: '4px' }}>+{t.pts} XP</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="Note (e.g. Run)" value={customNote} onChange={e => setCustomNote(e.target.value)} style={{ ...s.input, flex: 2 }} />
                <input type="number" placeholder="XP" value={customPts} onChange={e => setCustomPts(e.target.value)} style={{ ...s.input, flex: 1 }} />
                <button onClick={() => { logSession(person, customPts, customNote); setCustomPts(''); setCustomNote(''); }} style={{ ...s.btn, background: person === 'Martin' ? '#0284c7' : '#db2777' }}>Add</button>
              </div>

              <h3 style={{ marginTop: '24px', marginBottom: '10px' }}>Recent Activity</h3>
              {history.length === 0 ? <p style={{ color: '#64748b' }}>No workouts yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {history.slice(0, 5).map(i => (
                    <div key={i.id} style={s.feedItem}>
                      <span><strong style={{ color: i.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{i.person}</strong> — {i.label} (+{i.pts} XP)</span>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{i.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.panel}>
              <h3 style={{ marginTop: 0, color: '#fbbf24' }}>🎲 Couples Wagers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {challenges.map(c => (
                  <div key={c.id} style={s.chalCard}>
                    <div><strong>{c.title}</strong> (+{c.reward} XP)</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Stake: {c.stake}</div>
                    {c.completedBy ? <div style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 700 }}>Won by {c.completedBy}</div> : (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button onClick={() => { setChallenges(prev => prev.map(ch => ch.id === c.id ? { ...ch, completedBy: 'Martin' } : ch)); logSession('Martin', c.reward, `Won: ${c.title}`); }} style={s.winBtnM}>Martin Won</button>
                        <button onClick={() => { setChallenges(prev => prev.map(ch => ch.id === c.id ? { ...ch, completedBy: 'Karine' } : ch)); logSession('Karine', c.reward, `Won: ${c.title}`); }} style={s.winBtnK}>Karine Won</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'cal' && (
          <div style={s.grid2}>
            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <button onClick={() => setCalDate(new Date(yr, mo - 1, 1))} style={s.smallBtn}>◀</button>
                <h3 style={{ margin: 0 }}>{calDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setCalDate(new Date(yr, mo + 1, 1))} style={s.smallBtn}>▶</button>
              </div>
              <div style={s.calGrid}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{d}</div>)}
                {cells.map((c, idx) => {
                  if (!c) return <div key={idx} />;
                  const logs = history.filter(h => h.date === c.dateStr);
                  const m = logs.some(l => l.person === 'Martin');
                  const k = logs.some(l => l.person === 'Karine');
                  const sel = selectedDay === c.dateStr;
                  return (
                    <button key={c.dateStr} onClick={() => setSelectedDay(c.dateStr)} style={{ ...s.calCell, borderColor: sel ? '#fbbf24' : '#1e293b', background: sel ? '#1e293b' : '#090d16' }}>
                      <span style={{ fontWeight: 700 }}>{c.day}</span>
                      <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                        {m && k ? '👑' : <>{m && <span style={{ ...s.dot, background: '#38bdf8' }} />}{k && <span style={{ ...s.dot, background: '#f472b6' }} />}</>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={s.panel}>
              <h3 style={{ marginTop: 0 }}>Activity for {selectedDay}</h3>
              {history.filter(h => h.date === selectedDay).length === 0 ? <p style={{ color: '#64748b' }}>No workouts recorded.</p> : (
                history.filter(h => h.date === selectedDay).map(i => (
                  <div key={i.id} style={s.feedItem}>
                    <span><strong style={{ color: i.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{i.person}</strong> — {i.label} (+{i.pts} XP)</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'badges' && (
          <div style={s.panel}>
            <h3 style={{ marginTop: 0 }}>🏆 Trophy Room</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {BADGES.map(b => {
                const unlocked = b.check(scores, history, challenges);
                return (
                  <div key={b.id} style={{ ...s.badgeCard, opacity: unlocked ? 1 : 0.4 }}>
                    <span style={{ fontSize: '2rem' }}>{b.icon}</span>
                    <h4 style={{ margin: '6px 0 2px 0' }}>{b.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>{b.desc}</p>
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 800, color: unlocked ? '#fbbf24' : '#64748b' }}>{unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'sans-serif', padding: '20px', boxSizing: 'border-box' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' },
  badge: { fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '3px 8px', borderRadius: '99px' },
  title: { fontSize: '1.8rem', fontWeight: 800, margin: '4px 0' },
  subtitle: { fontSize: '0.9rem', color: '#94a3b8', margin: 0 },
  pCard: { background: '#111827', border: '2px solid', borderRadius: '12px', padding: '10px 16px', minWidth: '140px' },
  scoreNum: { fontSize: '1.4rem', fontWeight: 800 },
  taunt: { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fde047', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.9rem' },
  panel: { background: '#111827', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px', marginBottom: '16px' },
  tugOuter: { display: 'flex', height: '26px', background: '#1e293b', borderRadius: '99px', position: 'relative', overflow: 'hidden' },
  tugM: { background: '#0284c7', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '10px', fontSize: '0.75rem', fontWeight: 800, color: '#fff' },
  tugK: { background: '#db2777', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px', fontSize: '0.75rem', fontWeight: 800, color: '#fff' },
  tugFlag: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#111827', padding: '8px 14px', borderRadius: '12px', border: '1px solid #1e293b', marginBottom: '16px' },
  navBtn: { border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' },
  toggleBtn: { border: 'none', padding: '5px 12px', borderRadius: '8px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontSize: '0.8rem' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' },
  tierCard: { background: '#090d16', border: '1px solid #334155', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', cursor: 'pointer' },
  input: { padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#090d16', color: '#fff', fontSize: '0.85rem' },
  btn: { padding: '8px 14px', borderRadius: '8px', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  feedItem: { display: 'flex', justifyContent: 'space-between', background: '#090d16', padding: '8px 10px', borderRadius: '8px', fontSize: '0.85rem' },
  chalCard: { background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' },
  winBtnM: { flex: 1, padding: '5px', borderRadius: '6px', border: '1px solid #0284c7', background: 'rgba(2,132,199,0.2)', color: '#38bdf8', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' },
  winBtnK: { flex: 1, padding: '5px', borderRadius: '6px', border: '1px solid #db2777', background: 'rgba(219,39,119,0.2)', color: '#f472b6', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
  calCell: { height: '48px', borderRadius: '8px', border: '1px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
  dot: { width: '7px', height: '7px', borderRadius: '50%' },
  smallBtn: { background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  badgeCard: { background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', textAlign: 'center' }
};
