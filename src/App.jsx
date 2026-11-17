import React, { useState, useEffect } from 'react';

const EXERCISES = [
  { id: 'pushups', label: 'Push-ups', icon: '💪' },
  { id: 'squats', label: 'Squats', icon: '🦵' },
  { id: 'glutes', label: 'Glute Bridges', icon: '🍑' },
  { id: 'plank', label: 'Plank (Sec)', icon: '⏱️' },
  { id: 'custom', label: 'Other Reps', icon: '⭐' },
];

const TROPHIES = [
  { id: 'first', title: 'First Rep', desc: 'Logged your very first repetition', icon: '🎯', check: (m, k, h) => h.length >= 1 },
  { id: 'push_100', title: 'Century Push-ups', desc: 'Reached 100 total push-ups', icon: '💥', check: (m, k, h) => h.filter(i => i.label === 'Push-ups').reduce((a, b) => a + b.reps, 0) >= 100 },
  { id: 'squat_100', title: 'Squat Machine', desc: 'Reached 100 total squats', icon: '🦵', check: (m, k, h) => h.filter(i => i.label === 'Squats').reduce((a, b) => a + b.reps, 0) >= 100 },
  { id: 'beast_session', title: 'Beast Session', desc: 'Logged 50+ reps in a single entry', icon: '🦍', check: (m, k, h) => h.some(i => i.reps >= 50) },
  { id: 'total_500', title: '500 Rep Club', desc: 'Hit 500 total reps combined', icon: '🥉', check: (m, k, h) => m + k >= 500 },
  { id: 'total_1000', title: '1,000 Rep Titan', desc: 'Hit 1,000 total reps combined', icon: '🥈', check: (m, k, h) => m + k >= 1000 },
  { id: 'total_5000', title: '5,000 Rep Legend', desc: 'Hit 5,000 total reps combined', icon: '🥇', check: (m, k, h) => m + k >= 5000 },
  { id: 'power_couple', title: 'Synchronized Sweat', desc: 'Both logged reps on the exact same day', icon: '👑', check: (m, k, h) => {
    const dates = {};
    h.forEach(i => { dates[i.date] = dates[i.date] || new Set(); dates[i.date].add(i.person); });
    return Object.values(dates).some(set => set.size >= 2);
  }},
  { id: 'ten_workouts', title: 'Consistency Champ', desc: 'Completed 10 separate logging sessions', icon: '📅', check: (m, k, h) => h.length >= 10 },
  { id: 'night_owl', title: 'Night Owl', desc: 'Logged a workout after 8:00 PM', icon: '🌙', check: (m, k, h) => h.some(i => i.hour >= 20) },
];

export default function App() {
  const [tab, setTab] = useState('arena');
  const [person, setPerson] = useState('Martin');
  
  const [scores, setScores] = useState(() => JSON.parse(localStorage.getItem('mk_reps_scores')) || { Martin: 0, Karine: 0 });
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('mk_reps_history')) || []);
  
  const [selectedEx, setSelectedEx] = useState('Push-ups');
  const [repInput, setRepInput] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => { localStorage.setItem('mk_reps_scores', JSON.stringify(scores)); }, [scores]);
  useEffect(() => { localStorage.setItem('mk_reps_history', JSON.stringify(history)); }, [history]);

  const logReps = (who, count, label) => {
    const num = Number(count);
    if (!num || num <= 0) return;

    setScores(prev => ({ ...prev, [who]: prev[who] + num }));
    const now = new Date();
    const entry = {
      id: Date.now(),
      person: who,
      reps: num,
      label: label || selectedEx,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hour: now.getHours()
    };
    setHistory(prev => [entry, ...prev]);
    setRepInput('');
  };

  const undoLast = () => {
    if (history.length === 0) return;
    const [last, ...rest] = history;
    setScores(prev => ({ ...prev, [last.person]: Math.max(0, prev[last.person] - last.reps) }));
    setHistory(rest);
  };

  const martinReps = scores.Martin;
  const karineReps = scores.Karine;
  const totalReps = martinReps + karineReps;
  const martinPct = totalReps === 0 ? 50 : Math.round((martinReps / totalReps) * 100);

  const yr = calDate.getFullYear();
  const mo = calDate.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const numDays = new Date(yr, mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) {
    cells.push({ day: d, dateStr: `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  const selectedDayLogs = history.filter(h => h.date === selectedDay);

  return (
    <div style={s.page}>
      <div style={s.container}>
        <header style={s.header}>
          <div>
            <span style={s.badge}>COUPLES REPS BATTLE</span>
            <h1 style={s.title}>Martin vs. Karine</h1>
            <p style={s.subtitle}>Total Repetitions Counter &amp; Calendar Showdown</p>
          </div>
          <div style={s.scoreCardsRow}>
            <div style={{ background: '#111827', border: `2px solid ${martinReps >= karineReps ? '#38bdf8' : '#1e293b'}`, borderRadius: '12px', padding: '10px 16px', minWidth: '130px' }}>
              <div style={{ color: '#38bdf8', fontWeight: 700 }}>Martin {martinReps > karineReps && '👑'}</div>
              <div style={s.scoreNum}>{martinReps.toLocaleString()} <span style={s.unit}>reps</span></div>
            </div>
            <div style={{ background: '#111827', border: `2px solid ${karineReps > martinReps ? '#f472b6' : '#1e293b'}`, borderRadius: '12px', padding: '10px 16px', minWidth: '130px' }}>
              <div style={{ color: '#f472b6', fontWeight: 700 }}>Karine {karineReps > martinReps && '👑'}</div>
              <div style={s.scoreNum}>{karineReps.toLocaleString()} <span style={s.unit}>reps</span></div>
            </div>
          </div>
        </header>

        <div style={s.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>🪢 Tug-of-War Reps Bar</span>
            <span>{martinReps === karineReps ? 'Tie game!' : martinReps > karineReps ? `Martin leads by ${(martinReps - karineReps).toLocaleString()} reps` : `Karine leads by ${(karineReps - martinReps).toLocaleString()} reps`}</span>
          </div>
          <div style={s.tugOuter}>
            <div style={{ ...s.tugM, width: `${martinPct}%` }}>{martinPct > 15 && `Martin ${martinPct}%`}</div>
            <div style={s.tugFlag}>🚩</div>
            <div style={{ ...s.tugK, width: `${100 - martinPct}%` }}>{100 - martinPct > 15 && `Karine ${100 - martinPct}%`}</div>
          </div>
        </div>

        <div style={s.nav}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setTab('arena')} style={{ ...s.navBtn, background: tab === 'arena' ? '#1e293b' : 'transparent', color: tab === 'arena' ? '#38bdf8' : '#94a3b8' }}>💪 Reps Arena</button>
            <button onClick={() => setTab('cal')} style={{ ...s.navBtn, background: tab === 'cal' ? '#1e293b' : 'transparent', color: tab === 'cal' ? '#38bdf8' : '#94a3b8' }}>🗓️ Calendar Grid</button>
            <button onClick={() => setTab('trophies')} style={{ ...s.navBtn, background: tab === 'trophies' ? '#1e293b' : 'transparent', color: tab === 'trophies' ? '#38bdf8' : '#94a3b8' }}>
              🏆 Trophies ({TROPHIES.filter(t => t.check(martinReps, karineReps, history)).length}/{TROPHIES.length})
            </button>
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
              <h3 style={{ marginTop: 0 }}>Log Reps for <span style={{ color: person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{person}</span></h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                {EXERCISES.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedEx(ex.label)}
                    style={{
                      border: `1px solid ${selectedEx === ex.label ? (person === 'Martin' ? '#0284c7' : '#db2777') : '#1e293b'}`,
                      borderRadius: '10px',
                      padding: '10px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      color: '#fff',
                      background: selectedEx === ex.label ? '#1e293b' : '#090d16',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{ex.icon}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '4px' }}>{ex.label}</span>
                  </button>
                ))}
              </div>

              {selectedEx === 'Other Reps' && (
                <input
                  type="text"
                  placeholder="Exercise name (e.g. Pull-ups)"
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  style={{ ...s.input, width: '100%', marginBottom: '10px' }}
                />
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="Number of reps"
                  value={repInput}
                  onChange={e => setRepInput(e.target.value)}
                  style={{ ...s.input, flex: 1 }}
                />
                <button
                  onClick={() => logReps(person, repInput, selectedEx === 'Other Reps' ? (customLabel || 'Custom Reps') : selectedEx)}
                  style={{ ...s.primaryBtn, background: person === 'Martin' ? '#0284c7' : '#db2777' }}
                >
                  Log Reps
                </button>
              </div>
            </div>

            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>📋 Repetition Feed</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {history.length > 0 && <button onClick={undoLast} style={s.smallBtn}>Undo Last</button>}
                  {!resetConfirm ? (
                    <button onClick={() => setResetConfirm(true)} style={{ ...s.smallBtn, color: '#f87171' }}>Reset</button>
                  ) : (
                    <button onClick={() => { setScores({ Martin: 0, Karine: 0 }); setHistory([]); setResetConfirm(false); }} style={{ ...s.smallBtn, background: '#dc2626', color: '#fff' }}>Confirm</button>
                  )}
                </div>
              </div>

              {history.length === 0 ? <p style={{ color: '#64748b' }}>No reps logged yet. Start crushing reps!</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {history.slice(0, 8).map(i => (
                    <div key={i.id} style={s.feedItem}>
                      <div>
                        <strong style={{ color: i.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{i.person}</strong> — {i.reps} {i.label}
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{i.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'cal' && (
          <div style={s.grid2}>
            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <button onClick={() => setCalDate(new Date(yr, mo - 1, 1))} style={s.smallBtn}>◀ Prev</button>
                <h3 style={{ margin: 0 }}>{calDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setCalDate(new Date(yr, mo + 1, 1))} style={s.smallBtn}>Next ▶</button>
              </div>

              <div style={s.calGrid}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{d}</div>)}
                {cells.map((c, idx) => {
                  if (!c) return <div key={idx} />;
                  const dayLogs = history.filter(h => h.date === c.dateStr);
                  const mReps = dayLogs.filter(l => l.person === 'Martin').reduce((a, b) => a + b.reps, 0);
                  const kReps = dayLogs.filter(l => l.person === 'Karine').reduce((a, b) => a + b.reps, 0);
                  const isSel = selectedDay === c.dateStr;

                  return (
                    <button
                      key={c.dateStr}
                      onClick={() => setSelectedDay(c.dateStr)}
                      style={{
                        height: '56px',
                        borderRadius: '8px',
                        border: `1px solid ${isSel ? '#fbbf24' : (mReps > 0 || kReps > 0) ? '#334155' : '#1e293b'}`,
                        background: isSel ? '#1e293b' : '#090d16',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingTop: '6px',
                        cursor: 'pointer',
                        color: '#fff'
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.day}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.68rem', marginTop: '2px', gap: '1px' }}>
                        {mReps > 0 && <span style={{ color: '#38bdf8', fontWeight: 800 }}>M: {mReps}</span>}
                        {kReps > 0 && <span style={{ color: '#f472b6', fontWeight: 800 }}>K: {kReps}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={s.panel}>
              <h3 style={{ marginTop: 0 }}>Breakdown for {selectedDay}</h3>
              {selectedDayLogs.length === 0 ? <p style={{ color: '#64748b' }}>No repetitions recorded on this date.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDayLogs.map(item => (
                    <div key={item.id} style={s.feedItem}>
                      <div>
                        <strong style={{ color: item.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{item.person}</strong> — {item.reps} {item.label}
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'trophies' && (
          <div style={s.panel}>
            <h3 style={{ marginTop: 0 }}>🏆 Couples Trophy Room</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '16px' }}>Unlock achievements together as your total repetition count climbs!</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {TROPHIES.map(t => {
                const unlocked = t.check(martinReps, karineReps, history);
                return (
                  <div key={t.id} style={{ background: '#090d16', border: `1px solid ${unlocked ? '#fbbf24' : '#1e293b'}`, borderRadius: '12px', padding: '14px', textAlign: 'center', opacity: unlocked ? 1 : 0.4 }}>
                    <span style={{ fontSize: '2.2rem' }}>{t.icon}</span>
                    <h4 style={{ margin: '6px 0 2px 0', fontSize: '1rem' }}>{t.title}</h4>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>{t.desc}</p>
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', fontWeight: 800, color: unlocked ? '#fbbf24' : '#64748b' }}>
                      {unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}
                    </div>
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
  scoreCardsRow: { display: 'flex', gap: '12px' },
  scoreNum: { fontSize: '1.4rem', fontWeight: 800 },
  unit: { fontSize: '0.75rem', color: '#64748b', fontWeight: 600 },
  panel: { background: '#111827', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px', marginBottom: '16px' },
  tugOuter: { display: 'flex', height: '26px', background: '#1e293b', borderRadius: '99px', position: 'relative', overflow: 'hidden' },
  tugM: { background: '#0284c7', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '10px', fontSize: '0.72rem', fontWeight: 800, color: '#fff' },
  tugK: { background: '#db2777', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px', fontSize: '0.72rem', fontWeight: 800, color: '#fff' },
  tugFlag: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#111827', padding: '8px 14px', borderRadius: '12px', border: '1px solid #1e293b', marginBottom: '16px' },
  navBtn: { border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' },
  toggleBtn: { border: 'none', padding: '5px 12px', borderRadius: '8px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontSize: '0.8rem' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#090d16', color: '#fff', fontSize: '0.9rem' },
  primaryBtn: { padding: '10px 16px', borderRadius: '8px', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  feedItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16', padding: '8px 12px', borderRadius: '8px', fontSize: '0.88rem' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' },
  smallBtn: { background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }
};
