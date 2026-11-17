import React, { useState, useEffect } from 'react';

const TROPHIES = [
  { id: 'first', title: 'First Rep', desc: 'Logged your very first repetition', icon: '🎯', check: (m, k, h) => h.length >= 1 },
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
  { id: 'thief', title: 'Rep Stealer', desc: 'Successfully claimed a Wednesday or Sunday Rep Steal', icon: '🦹‍♂️', check: (m, k, h) => h.some(i => i.isSteal) },
];

function getRank(reps) {
  if (reps >= 2500) return { title: 'Titan Legend', color: '#fbbf24' };
  if (reps >= 1000) return { title: 'Iron Contender', color: '#38bdf8' };
  if (reps >= 400) return { title: 'Rivalry Warrior', color: '#a855f7' };
  if (reps >= 100) return { title: 'Active Challenger', color: '#4ade80' };
  return { title: 'Rookie', color: '#94a3b8' };
}

export default function App() {
  const [tab, setTab] = useState('arena');
  const [person, setPerson] = useState('Martin');
  
  const [scores, setScores] = useState(() => JSON.parse(localStorage.getItem('mk_animated_scores')) || { Martin: 0, Karine: 0 });
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('mk_animated_history')) || []);
  const [steals, setSteals] = useState(() => JSON.parse(localStorage.getItem('mk_animated_steals')) || {}); // tracks claimed steals by date key
  
  const [repInput, setRepInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [dailyTaunt, setDailyTaunt] = useState('');
  const [animateScore, setAnimateScore] = useState(null);
  
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => { localStorage.setItem('mk_animated_scores', JSON.stringify(scores)); }, [scores]);
  useEffect(() => { localStorage.setItem('mk_animated_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('mk_animated_steals', JSON.stringify(steals)); }, [steals]);

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr === 12) setDailyTaunt('🕛 Noon Check-in: Half the day is gone! Time to log some reps and pull the rope.');
    else if (hr === 18) setDailyTaunt('🕕 6:00 PM Showdown: Prime workout window is open!');
  }, []);

  // Check if current time is Wednesday or Sunday around 1:00 PM (13:00 - 14:00)
  const nowObj = new Date();
  const dayOfWeek = nowObj.getDay(); // 3 = Wed, 0 = Sun
  const currentHour = nowObj.getHours();
  const todayDateStr = nowObj.toISOString().split('T')[0];
  const isStealWindow = (dayOfWeek === 3 || dayOfWeek === 0) && currentHour === 13;
  const stealKey = `${todayDateStr}-${dayOfWeek === 3 ? 'Wed' : 'Sun'}`;
  const stealClaimedBy = steals[stealKey];

  const triggerAnimation = (who) => {
    setAnimateScore(who);
    setTimeout(() => setAnimateScore(null), 600);
  };

  const logReps = (who, count, label, isSteal = false) => {
    const num = Number(count);
    if (!num || num <= 0) return;

    setScores(prev => ({ ...prev, [who]: prev[who] + num }));
    triggerAnimation(who);

    const now = new Date();
    const entry = {
      id: Date.now(),
      person: who,
      reps: num,
      label: label || 'Workout Reps',
      isSteal,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hour: now.getHours()
    };
    setHistory(prev => [entry, ...prev]);
    setRepInput('');
    setNoteInput('');
  };

  const claimSteal = (who) => {
    if (stealClaimedBy) return;
    setSteals(prev => ({ ...prev, [stealKey]: who }));
    // Add 50 bonus reps and subtract 50 from opponent for the ultimate steal effect!
    const opponent = who === 'Martin' ? 'Karine' : 'Martin';
    setScores(prev => ({
      ...prev,
      [who]: prev[who] + 50,
      [opponent]: Math.max(0, prev[opponent] - 50)
    }));
    triggerAnimation(who);

    const now = new Date();
    const entry = {
      id: Date.now(),
      person: who,
      reps: 50,
      label: '⚡ 1PM Rep Steal (+50 / -50)',
      isSteal: true,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hour: now.getHours()
    };
    setHistory(prev => [entry, ...prev]);
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

  const martinRank = getRank(martinReps);
  const karineRank = getRank(karineReps);

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
      <style>{`
        @keyframes pulseScore {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); filter: brightness(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes flagSlide {
          0% { transform: translate(-50%, -50%) scale(0.9); }
          50% { transform: translate(-50%, -50%) scale(1.2) rotate(10deg); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .pulse-martin { animation: pulseScore 0.5s ease-in-out; }
        .pulse-karine { animation: pulseScore 0.5s ease-in-out; }
        .flag-anim { animation: flagSlide 0.5s ease-in-out; }
      `}</style>

      <div style={s.container}>
        {/* Header */}
        <header style={s.header}>
          <div>
            <span style={s.badge}>COUPLES REPS ARENA</span>
            <h1 style={s.title}>Martin vs. Karine</h1>
            <p style={s.subtitle}>Pure Repetition Counter &amp; Animated Showdown</p>
          </div>
          <div style={s.scoreCardsRow}>
            <div style={{ ...s.playerCard, borderColor: martinReps >= karineReps ? '#38bdf8' : '#1e293b' }} className={animateScore === 'Martin' ? 'pulse-martin' : ''}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.95rem' }}>Martin {martinReps > karineReps && '👑'}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: martinRank.color, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{martinRank.title}</span>
              </div>
              <div style={s.scoreNum}>{martinReps.toLocaleString()} <span style={s.unit}>reps</span></div>
            </div>
            <div style={{ ...s.playerCard, borderColor: karineReps > martinReps ? '#f472b6' : '#1e293b' }} className={animateScore === 'Karine' ? 'pulse-karine' : ''}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ color: '#f472b6', fontWeight: 700, fontSize: '0.95rem' }}>Karine {karineReps > martinReps && '👑'}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: karineRank.color, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{karineRank.title}</span>
              </div>
              <div style={s.scoreNum}>{karineReps.toLocaleString()} <span style={s.unit}>reps</span></div>
            </div>
          </div>
        </header>

        {dailyTaunt && (
          <div style={s.tauntBanner}>
            <span style={{ fontSize: '1.2rem' }}>📣</span> <div>{dailyTaunt}</div>
          </div>
        )}

        {/* 1PM STEAL BANNER (Active Wed/Sun at 1 PM or testable anytime) */}
        <div style={{ ...s.stealBanner, borderColor: isStealWindow ? '#f59e0b' : '#334155', background: isStealWindow ? 'rgba(245, 158, 11, 0.15)' : '#111827' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <strong style={{ color: '#fbbf24', display: 'block' }}>Wednesday &amp; Sunday 1:00 PM Rep Steal</strong>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                {stealClaimedBy ? `Claimed for today by ${stealClaimedBy}! 🦹‍♂️` : isStealWindow ? 'Active now! Claim 50 reps and steal from your partner!' : 'Opens Wednesday & Sunday at 1:00 PM.'}
              </span>
            </div>
          </div>
          {!stealClaimedBy && (
            <button 
              onClick={() => claimSteal(person)} 
              style={{ ...s.primaryBtn, background: person === 'Martin' ? '#0284c7' : '#db2777', fontSize: '0.85rem', padding: '8px 14px' }}
            >
              Claim Steal as {person} (+50)
            </button>
          )}
        </div>

        {/* Tug of War with Animated Flag */}
        <div style={s.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#94a3b8' }}>🪢 Live Tug-of-War Reps Bar</span>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc' }}>
              {martinReps === karineReps ? 'Tie game!' : martinReps > karineReps ? `Martin leads by ${(martinReps - karineReps).toLocaleString()} reps` : `Karine leads by ${(karineReps - martinReps).toLocaleString()} reps`}
            </span>
          </div>
          <div style={s.tugOuter}>
            <div style={{ ...s.tugM, width: `${martinPct}%`, transition: 'width 0.5s ease-in-out' }}>{martinPct > 12 && `Martin ${martinPct}%`}</div>
            <div style={s.tugFlag} className="flag-anim">🚩</div>
            <div style={{ ...s.tugK, width: `${100 - martinPct}%`, transition: 'width 0.5s ease-in-out' }}>{100 - martinPct > 12 && `Karine ${100 - martinPct}%`}</div>
          </div>
        </div>

        {/* Navigation & Player Toggle */}
        <div style={s.nav}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setTab('arena')} style={{ ...s.navBtn, background: tab === 'arena' ? '#1e293b' : 'transparent', color: tab === 'arena' ? '#38bdf8' : '#94a3b8' }}>💪 Reps Logger</button>
            <button onClick={() => setTab('cal')} style={{ ...s.navBtn, background: tab === 'cal' ? '#1e293b' : 'transparent', color: tab === 'cal' ? '#38bdf8' : '#94a3b8' }}>🗓️ Big Calendar</button>
            <button onClick={() => setTab('trophies')} style={{ ...s.navBtn, background: tab === 'trophies' ? '#1e293b' : 'transparent', color: tab === 'trophies' ? '#38bdf8' : '#94a3b8' }}>
              🏆 Trophies ({TROPHIES.filter(t => t.check(martinReps, karineReps, history)).length}/{TROPHIES.length})
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Logging for:</span>
            <button onClick={() => setPerson('Martin')} style={{ ...s.toggleBtn, background: person === 'Martin' ? '#0284c7' : '#1e293b' }}>Martin</button>
            <button onClick={() => setPerson('Karine')} style={{ ...s.toggleBtn, background: person === 'Karine' ? '#db2777' : '#1e293b' }}>Karine</button>
          </div>
        </div>

        {/* TAB 1: LOGGER */}
        {tab === 'arena' && (
          <div style={s.grid2}>
            <div style={s.panel}>
              <h3 style={{ marginTop: 0, marginBottom: '6px' }}>Log Reps for <span style={{ color: person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{person}</span></h3>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '16px' }}>Tap a quick add button or enter your custom rep count below:</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <button onClick={() => logReps(person, 10, 'Quick Set')} style={s.quickBtn}>⚡ +10 Reps</button>
                <button onClick={() => logReps(person, 25, 'Power Set')} style={s.quickBtn}>🔥 +25 Reps</button>
                <button onClick={() => logReps(person, 50, 'Beast Set')} style={s.quickBtn}>🦍 +50 Reps</button>
                <button onClick={() => logReps(person, 100, 'Century Set')} style={s.quickBtn}>👑 +100 Reps</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Note / Exercise Name (e.g. Push-ups, Squats)"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  style={s.input}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    placeholder="Custom count"
                    value={repInput}
                    onChange={e => setRepInput(e.target.value)}
                    style={{ ...s.input, flex: 1 }}
                  />
                  <button
                    onClick={() => logReps(person, repInput, noteInput || 'General Reps')}
                    style={{ ...s.primaryBtn, background: person === 'Martin' ? '#0284c7' : '#db2777' }}
                  >
                    Add Reps
                  </button>
                </div>
              </div>
            </div>

            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0 }}>📋 Repetition Feed</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {history.length > 0 && <button onClick={undoLast} style={s.smallBtn}>Undo Last</button>}
                  {!resetConfirm ? (
                    <button onClick={() => setResetConfirm(true)} style={{ ...s.smallBtn, color: '#f87171' }}>Reset</button>
                  ) : (
                    <button onClick={() => { setScores({ Martin: 0, Karine: 0 }); setHistory([]); setSteals({}); setResetConfirm(false); }} style={{ ...s.smallBtn, background: '#dc2626', color: '#fff' }}>Confirm Reset</button>
                  )}
                </div>
              </div>

              {history.length === 0 ? <p style={{ color: '#64748b' }}>No reps logged yet. Start crushing reps!</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                  {history.slice(0, 10).map(i => (
                    <div key={i.id} style={s.feedItem}>
                      <div>
                        <strong style={{ color: i.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{i.person}</strong> — {i.reps} reps {i.isSteal && <span style={{ color: '#fbbf24', fontWeight: 800 }}>⚡Steal</span>} <span style={{ color: '#94a3b8' }}>({i.label})</span>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{i.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BIG CALENDAR GRID */}
        {tab === 'cal' && (
          <div style={s.grid2}>
            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={() => setCalDate(new Date(yr, mo - 1, 1))} style={s.smallBtn}>◀ Prev</button>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>🗓️ {calDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => setCalDate(new Date(yr, mo + 1, 1))} style={s.smallBtn}>Next ▶</button>
              </div>

              <div style={s.calGrid}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', paddingBottom: '6px' }}>{d}</div>)}
                {cells.map((c, idx) => {
                  if (!c) return <div key={idx} style={{ height: '90px' }} />;
                  const dayLogs = history.filter(h => h.date === c.dateStr);
                  const mReps = dayLogs.filter(l => l.person === 'Martin').reduce((a, b) => a + b.reps, 0);
                  const kReps = dayLogs.filter(l => l.person === 'Karine').reduce((a, b) => a + b.reps, 0);
                  const isSel = selectedDay === c.dateStr;

                  return (
                    <button
                      key={c.dateStr}
                      onClick={() => setSelectedDay(c.dateStr)}
                      style={{
                        height: '90px',
                        borderRadius: '12px',
                        border: `2px solid ${isSel ? '#fbbf24' : (mReps > 0 || kReps > 0) ? '#334155' : '#1e293b'}`,
                        background: isSel ? '#1e293b' : '#090d16',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingTop: '8px',
                        cursor: 'pointer',
                        color: '#fff',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>{c.day}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.72rem', gap: '3px', width: '100%', padding: '0 4px' }}>
                        {mReps > 0 && (
                          <div style={{ background: 'rgba(2, 132, 199, 0.3)', color: '#38bdf8', borderRadius: '5px', fontWeight: 800, padding: '2px 0' }}>
                            M: {mReps}
                          </div>
                        )}
                        {kReps > 0 && (
                          <div style={{ background: 'rgba(219, 39, 119, 0.3)', color: '#f472b6', borderRadius: '5px', fontWeight: 800, padding: '2px 0' }}>
                            K: {kReps}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={s.panel}>
              <h3 style={{ marginTop: 0, marginBottom: '14px' }}>Detailed Breakdown for {selectedDay}</h3>
              {selectedDayLogs.length === 0 ? <p style={{ color: '#64748b' }}>No rep sessions recorded on this date. Click any day on the calendar to inspect!</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedDayLogs.map(item => (
                    <div key={item.id} style={s.feedItem}>
                      <div>
                        <strong style={{ color: item.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{item.person}</strong> — {item.reps} reps ({item.label})
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TROPHIES */}
        {tab === 'trophies' && (
          <div style={s.panel}>
            <h3 style={{ marginTop: 0, marginBottom: '6px' }}>🏆 Couples Trophy Room</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '20px' }}>Unlock achievements together as your total repetition count climbs!</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {TROPHIES.map(t => {
                const unlocked = t.check(martinReps, karineReps, history);
                return (
                  <div key={t.id} style={{ background: '#090d16', border: `2px solid ${unlocked ? '#fbbf24' : '#1e293b'}`, borderRadius: '16px', padding: '18px', textAlign: 'center', opacity: unlocked ? 1 : 0.4, boxShadow: unlocked ? '0 10px 20px -5px rgba(251, 191, 36, 0.15)' : 'none' }}>
                    <span style={{ fontSize: '2.8rem', display: 'block', marginBottom: '8px' }}>{t.icon}</span>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{t.title}</h4>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>{t.desc}</p>
                    <div style={{ marginTop: '12px', fontSize: '0.75rem', fontWeight: 800, color: unlocked ? '#fbbf24' : '#64748b' }}>
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
  page: { minHeight: '100vh', background: '#090d16', backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #090d16 70%)', color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '24px 20px', boxSizing: 'border-box' },
  container: { maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' },
  badge: { fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', padding: '4px 10px', borderRadius: '99px', letterSpacing: '0.05em' },
  title: { fontSize: '2.1rem', fontWeight: 800, margin: '6px 0 4px 0', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '0.95rem', color: '#94a3b8', margin: 0 },
  scoreCardsRow: { display: 'flex', gap: '14px' },
  playerCard: { background: '#111827', border: '2px solid', borderRadius: '14px', padding: '14px 20px', minWidth: '170px', boxShadow: '0 8px 20px -4px rgba(0,0,0,0.3)' },
  scoreNum: { fontSize: '1.6rem', fontWeight: 800 },
  unit: { fontSize: '0.75rem', color: '#64748b', fontWeight: 600 },
  tauntBanner: { display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#fde047', padding: '14px 18px', borderRadius: '14px', marginBottom: '16px', fontSize: '0.95rem', fontWeight: 500 },
  stealBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', border: '2px solid', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 8px 20px -4px rgba(0,0,0,0.3)' },
  panel: { background: '#111827', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)' },
  tugOuter: { display: 'flex', height: '32px', background: '#1e293b', borderRadius: '99px', position: 'relative', overflow: 'hidden', border: '1px solid #334155' },
  tugM: { background: '#0284c7', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '14px', fontSize: '0.78rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' },
  tugK: { background: '#db2777', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '14px', fontSize: '0.78rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' },
  tugFlag: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, fontSize: '1.1rem' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#111827', padding: '10px 18px', borderRadius: '14px', border: '1px solid #1e293b', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  navBtn: { border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'background 0.2s' },
  toggleBtn: { border: 'none', padding: '7px 16px', borderRadius: '10px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' },
  quickBtn: { background: '#090d16', border: '1px solid #334155', color: '#f8fafc', padding: '12px 14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', textAlign: 'center', transition: 'border-color 0.2s' },
  input: { padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#090d16', color: '#fff', fontSize: '0.95rem', outline: 'none' },
  primaryBtn: { padding: '12px 20px', borderRadius: '10px', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  feedItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16', padding: '12px 14px', borderRadius: '10px', fontSize: '0.92rem', border: '1px solid #1e293b' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' },
  smallBtn: { background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }
};
