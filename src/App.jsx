import React, { useState, useEffect } from 'react';

const WORKOUT_TIERS = [
  { id: 'quick', label: 'Quick Burn', desc: '15–20 min mobility or core', pts: 25, icon: '⚡' },
  { id: 'standard', label: 'Full Session', desc: '30–45 min strength or cardio', pts: 50, icon: '🔥' },
  { id: 'beast', label: 'Beast Mode', desc: '60+ min intense training', pts: 100, icon: '💀' },
];

const INITIAL_CHALLENGES = [
  { id: 1, title: '4-Day Workout Streak', desc: 'First to log 4 days in a row wins', reward: 150, stake: 'Winner picks Saturday dinner', completedBy: null },
  { id: 2, title: 'Weekend Warrior', desc: 'Log workouts on both Saturday & Sunday', reward: 120, stake: 'Loser makes Sunday morning coffee', completedBy: null },
  { id: 3, title: '500-Point Sprint', desc: 'First to reach 500 total points', reward: 200, stake: 'Free pass on dish duty for 3 days', completedBy: null },
  { id: 4, title: 'Synchronized Sweat', desc: 'Both log a session on the exact same day', reward: 100, stake: 'Couples movie night & snacks', completedBy: null },
];

const BADGES = [
  { id: 'first_blood', title: 'First Blood', desc: 'Logged your very first workout', icon: '🎯', check: (s, h) => h.length >= 1 },
  { id: 'beast_mode', title: 'Beast Mode', desc: 'Completed a 100-pt Beast Mode session', icon: '🦍', check: (s, h) => h.some(i => i.pts >= 100) },
  { id: 'century_500', title: '500 Club', desc: 'Reached 500+ total points combined', icon: '💎', check: (s) => s.Martin + s.Karine >= 500 },
  { id: 'power_couple', title: 'Power Couple', desc: 'Both logged workouts on the same day', icon: '👑', check: (s, h) => {
    const byDate = {};
    h.forEach(i => {
      byDate[i.date] = byDate[i.date] || new Set();
      byDate[i.date].add(i.person);
    });
    return Object.values(byDate).some(set => set.size >= 2);
  }},
  { id: 'ten_sessions', title: 'Consistency King/Queen', desc: '10 total workouts logged', icon: '📅', check: (s, h) => h.length >= 10 },
  { id: 'grand_master', title: '1,000-Pt Legend', desc: 'Individual score hit 1,000 pts', icon: '🏆', check: (s) => s.Martin >= 1000 || s.Karine >= 1000 },
  { id: 'close_race', title: 'Neck & Neck', desc: 'Scores within 25 pts after 200+ pts', icon: '⚖️', check: (s) => (s.Martin + s.Karine >= 200) && Math.abs(s.Martin - s.Karine) <= 25 },
  { id: 'challenge_champ', title: 'Stakes Winner', desc: 'Claimed at least one couple challenge', icon: '🎲', check: (s, h, c) => c.some(ch => ch.completedBy) },
];

function getLevelInfo(pts) {
  if (pts >= 2000) return { level: 5, title: 'Titan Legend', next: 3000, prev: 2000 };
  if (pts >= 1200) return { level: 4, title: 'Iron Contender', next: 2000, prev: 1200 };
  if (pts >= 600) return { level: 3, title: 'Rivalry Warrior', next: 1200, prev: 600 };
  if (pts >= 250) return { level: 2, title: 'Active Challenger', next: 600, prev: 250 };
  return { level: 1, title: 'Rookie', next: 250, prev: 0 };
}

function getStreak(person, history) {
  const dates = [...new Set(history.filter(h => h.person === person).map(h => h.date))].sort().reverse();
  if (dates.length === 0) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayStr = cursor.toISOString().split('T')[0];
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;
  let expected = new Date(dates[0] + 'T00:00:00');
  for (const d of dates) {
    const expectedStr = expected.toISOString().split('T')[0];
    if (d === expectedStr) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('arena');
  const [selectedPerson, setSelectedPerson] = useState('Martin');

  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem('mk_arena_scores_v1');
    return saved ? JSON.parse(saved) : { Martin: 0, Karine: 0 };
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('mk_arena_history_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [challenges, setChallenges] = useState(() => {
    const saved = localStorage.getItem('mk_arena_challenges_v1');
    return saved ? JSON.parse(saved) : INITIAL_CHALLENGES;
  });

  const [customPts, setCustomPts] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeStake, setNewChallengeStake] = useState('');
  const [dynamicTaunt, setDynamicTaunt] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem('mk_arena_scores_v1', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem('mk_arena_history_v1', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('mk_arena_challenges_v1', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    const checkTauntTime = () => {
      const hour = new Date().getHours();
      if (hour === 12) {
        setDynamicTaunt('🕛 Noon Check-in: Half the day is gone! Are you letting your partner pull the rope, or are you logging a session?');
      } else if (hour === 18) {
        setDynamicTaunt('🕕 6:00 PM Evening Showdown: Prime workout window is open! Claim your points before tonight.');
      } else {
        setDynamicTaunt('');
      }
    };
    checkTauntTime();
    const interval = setInterval(checkTauntTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const logSession = (person, pts, label) => {
    const num = Number(pts);
    if (!num || num <= 0) return;
    const streak = getStreak(person, history);
    const streakBonus = streak >= 3 ? Math.round(num * 0.1) : 0;
    const finalPts = num + streakBonus;

    setScores(prev => ({ ...prev, [person]: prev[person] + finalPts }));
    const now = new Date();
    const entry = {
      id: Date.now(),
      person,
      pts: finalPts,
      basePts: num,
      bonusPts: streakBonus,
      label: label || 'Workout Session',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHistory(prev => [entry, ...prev]);
  };

  const undoLast = () => {
    if (history.length === 0) return;
    const [last, ...rest] = history;
    setScores(prev => ({ ...prev, [last.person]: Math.max(0, prev[last.person] - last.pts) }));
    setHistory(rest);
  };

  const claimChallenge = (challengeId, winner) => {
    const target = challenges.find(c => c.id === challengeId);
    if (!target || target.completedBy) return;
    setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, completedBy: winner } : c));
    logSession(winner, target.reward, `Challenge Won: ${target.title}`);
  };

  const addCustomChallenge = (e) => {
    e.preventDefault();
    if (!newChallengeTitle.trim()) return;
    const item = {
      id: Date.now(),
      title: newChallengeTitle.trim(),
      desc: 'Custom couples showdown wager',
      reward: 150,
      stake: newChallengeStake.trim() || 'Bragging rights',
      completedBy: null,
    };
    setChallenges(prev => [item, ...prev]);
    setNewChallengeTitle('');
    setNewChallengeStake('');
  };

  const resetAll = () => {
    setScores({ Martin: 0, Karine: 0 });
    setHistory([]);
    setChallenges(INITIAL_CHALLENGES);
    setShowResetConfirm(false);
  };

  const martinTotal = scores.Martin;
  const karineTotal = scores.Karine;
  const combinedTotal = martinTotal + karineTotal;
  const martinPct = combinedTotal === 0 ? 50 : Math.round((martinTotal / combinedTotal) * 100);

  const martinLevel = getLevelInfo(martinTotal);
  const karineLevel = getLevelInfo(karineTotal);
  const martinStreak = getStreak('Martin', history);
  const karineStreak = getStreak('Karine', history);

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const monthName = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, dateStr });
  }

  const selectedDayLogs = history.filter(h => h.date === selectedDayStr);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <span style={styles.badge}>COUPLES FITNESS ARENA</span>
            <h1 style={styles.title}>Martin vs. Karine</h1>
            <p style={styles.subtitle}>Monthly Streak Calendar, Tug-of-War &amp; Couples Wagers</p>
          </div>

          <div style={styles.playerCardsRow}>
            <div style={{ ...styles.playerCard, borderColor: martinTotal >= karineTotal ? '#38bdf8' : '#1e293b' }}>
              <div style={styles.playerTop}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#38bdf8' }}>
                  Martin {martinTotal > karineTotal && martinTotal > 0 ? '👑' : ''}
                </span>
                <span style={styles.levelPill}>Lvl {martinLevel.level} • {martinLevel.title}</span>
              </div>
              <div style={styles.bigScore}>{martinTotal.toLocaleString()} <span style={styles.ptsLabel}>XP</span></div>
              <div style={styles.xpTrack}>
                <div style={{ ...styles.xpFill, backgroundColor: '#38bdf8', width: `${Math.min(100, Math.round(((martinTotal - martinLevel.prev) / (martinLevel.next - martinLevel.prev)) * 100))}%` }} />
              </div>
              <div style={styles.streakRow}>
                <span>🔥 Streak: <strong>{martinStreak}d</strong> {martinStreak >= 3 ? '(+10% XP!)' : ''}</span>
                <span>Next: {martinLevel.next}</span>
              </div>
            </div>

            <div style={styles.playerCard, { borderColor: karineTotal > martinTotal ? '#f472b6' : '#1e293b' }}>
              <div style={styles.playerTop}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f472b6' }}>
                  Karine {karineTotal > martinTotal && karineTotal > 0 ? '👑' : ''}
                </span>
                <span style={styles.levelPill}>Lvl {karineLevel.level} • {karineLevel.title}</span>
              </div>
              <div style={styles.bigScore}>{karineTotal.toLocaleString()} <span style={styles.ptsLabel}>XP</span></div>
              <div style={styles.xpTrack}>
                <div style={{ ...styles.xpFill, backgroundColor: '#f472b6', width: `${Math.min(100, Math.round(((karineTotal - karineLevel.prev) / (karineLevel.next - karineLevel.prev)) * 100))}%` }} />
              </div>
              <div style={styles.streakRow}>
                <span>🔥 Streak: <strong>{karineStreak}d</strong> {karineStreak >= 3 ? '(+10% XP!)' : ''}</span>
                <span>Next: {karineLevel.next}</span>
              </div>
            </div>
          </div>
        </header>

        {dynamicTaunt && (
          <div style={styles.tauntBanner}>
            <span style={{ fontSize: '1.3rem' }}>📣</span>
            <div><strong>Rivalry Alert:</strong> {dynamicTaunt}</div>
          </div>
        )}

        <div style={styles.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>🪢 Live Tug-of-War Rope</h3>
            <span style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 600 }}>
              {martinTotal === karineTotal ? 'Dead center — tie game!' : martinTotal > karineTotal ? `Martin leads by ${(martinTotal - karineTotal).toLocaleString()} XP (${martinPct}%)` : `Karine leads by ${(karineTotal - martinTotal).toLocaleString()} XP (${100 - martinPct}%)`}
            </span>
          </div>
          <div style={styles.tugBarOuter}>
            <div style={{ ...styles.tugMartinSide, width: `${martinPct}%` }}>
              {martinPct > 14 && <span style={styles.tugLabel}>Martin {martinPct}%</span>}
            </div>
            <div style={styles.tugCenterFlag}>🚩</div>
            <div style={{ ...styles.tugKarineSide, width: `${100 - martinPct}%` }}>
              {100 - martinPct > 14 && <span style={styles.tugLabel}>Karine {100 - martinPct}%</span>}
            </div>
          </div>
        </div>

        <div style={styles.navBar}>
          <div style={styles.navTabs}>
            <button onClick={() => setActiveTab('arena')} style={{ ...styles.navTab, backgroundColor: activeTab === 'arena' ? '#1e293b' : 'transparent', color: activeTab === 'arena' ? '#38bdf8' : '#94a3b8' }}>
              ⚡ Log Workout &amp; Challenges
            </button>
            <button onClick={() => setActiveTab('calendar')} style={{ ...styles.navTab, backgroundColor: activeTab === 'calendar' ? '#1e293b' : 'transparent', color: activeTab === 'calendar' ? '#38bdf8' : '#94a3b8' }}>
              🗓️ Monthly Calendar
            </button>
            <button onClick={() => setActiveTab('badges')} style={{ ...styles.navTab, backgroundColor: activeTab === 'badges' ? '#1e293b' : 'transparent', color: activeTab === 'badges' ? '#38bdf8' : '#94a3b8' }}>
              🏆 Trophy Room ({BADGES.filter(b => b.check(scores, history, challenges)).length}/{BADGES.length})
            </button>
          </div>

          <div style={styles.selectorGroup}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Active Player:</span>
            <button onClick={() => setSelectedPerson('Martin')} style={{ ...styles.personToggle, backgroundColor: selectedPerson === 'Martin' ? '#0284c7' : '#1e293b' }}>
              Martin
            </button>
            <button onClick={() => setSelectedPerson('Karine')} style={{ ...styles.personToggle, backgroundColor: selectedPerson === 'Karine' ? '#db2777' : '#1e293b' }}>
              Karine
            </button>
          </div>
        </div>

        {activeTab === 'arena' && (
          <div style={styles.twoColGrid}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={styles.panel}>
                <h3 style={{ marginTop: 0, marginBottom: '6px' }}>
                  Log a Workout for <span style={{ color: selectedPerson === 'Martin' ? '#38bdf8' : '#f472b6' }}>{selectedPerson}</span>
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#94a3b8' }}>
                  Any workout counts! Tap an effort tier to earn XP and pull the rope.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  {WORKOUT_TIERS.map(tier => (
                    <button key={tier.id} onClick={() => logSession(selectedPerson, tier.pts, tier.label)} style={{ ...styles.tierBtn, borderColor: selectedPerson === 'Martin' ? '#0284c7' : '#db2777' }}>
                      <span style={{ fontSize: '1.8rem' }}>{tier.icon}</span>
                      <strong style={{ fontSize: '1rem', marginTop: '6px' }}>{tier.label}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>{tier.desc}</span>
                      <span style={{ ...styles.tierPts, color: selectedPerson === 'Martin' ? '#38bdf8' : '#f472b6' }}>+{tier.pts} XP</span>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Activity note (e.g. 5km run, Bike)" value={customNote} onChange={e => setCustomNote(e.target.value)} style={{ ...styles.input, flex: '2 1 180px' }} />
                  <input type="number" placeholder="XP" value={customPts} onChange={e => setCustomPts(e.target.value)} style={{ ...styles.input, flex: '1 1 70px' }} />
                  <button onClick={() => { logSession(selectedPerson, customPts, customNote || 'Custom Workout'); setCustomPts(''); setCustomNote(''); }} style={{ ...styles.primaryBtn, backgroundColor: selectedPerson === 'Martin' ? '#0284c7' : '#db2777' }}>
                    Log XP
                  </button>
                </div>
              </div>

              <div style={styles.panel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>📋 Recent Battle Log</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {history.length > 0 && <button onClick={undoLast} style={styles.smallBtn}>Undo Last</button>}
                    {!showResetConfirm ? (
                      <button onClick={() => setShowResetConfirm(true)} style={{ ...styles.smallBtn, color: '#f87171' }}>Reset</button>
                    ) : (
                      <button onClick={resetAll} style={{ ...styles.smallBtn, backgroundColor: '#dc2626', color: '#fff' }}>Confirm Reset</button>
                    )}
                  </div>
                </div>

                {history.length === 0 ? (
                  <p style={{ color: '#64748b', margin: 0 }}>No workouts logged yet. Pick an effort tier above to start!</p>
                ) : (
                  <div style={styles.feedList}>
                    {history.slice(0, 8).map(item => (
                      <div key={item.id} style={styles.feedItem}>
                        <div>
                          <strong style={{ color: item.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{item.person}</strong> completed <strong>{item.label}</strong> <span style={{ color: '#fbbf24', fontWeight: 700 }}>(+{item.pts} XP)</span>
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.date} • {item.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.panel}>
              <h3 style={{ marginTop: 0, marginBottom: '4px', color: '#fbbf24' }}>🎲 Couples Challenges &amp; Stakes</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#94a3b8' }}>Complete head-to-head challenges to claim bonus XP and real-life rewards.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {challenges.map(ch => (
                  <div key={ch.id} style={{ ...styles.challengeCard, opacity: ch.completedBy ? 0.65 : 1, borderColor: ch.completedBy ? '#22c55e' : '#1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '1rem', display: 'block' }}>{ch.title}</strong>
                        <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>{ch.desc}</span>
                      </div>
                      <span style={styles.rewardBadge}>+{ch.reward} XP</span>
                    </div>

                    <div style={styles.stakeBox}>🎁 <strong>Stake:</strong> {ch.stake}</div>

                    {ch.completedBy ? (
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80' }}>✓ Claimed by {ch.completedBy}</div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button onClick={() => claimChallenge(ch.id, 'Martin')} style={{ ...styles.claimBtn, backgroundColor: 'rgba(2, 132, 199, 0.25)', color: '#38bdf8', borderColor: '#0284c7' }}>Martin Won</button>
                        <button onClick={() => claimChallenge(ch.id, 'Karine')} style={{ ...styles.claimBtn, backgroundColor: 'rgba(219, 39, 119, 0.25)', color: '#f472b6', borderColor: '#db2777' }}>Karine Won</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={addCustomChallenge} style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>+ Create Custom Wager</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" placeholder="Challenge title" value={newChallengeTitle} onChange={e => setNewChallengeTitle(e.target.value)} style={styles.input} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="Real-life stake" value={newChallengeStake} onChange={e => setNewChallengeStake(e.target.value)} style={{ ...styles.input, flex: 1 }} />
                    <button type="submit" style={{ ...styles.primaryBtn, backgroundColor: '#eab308', color: '#090d16' }}>Add Wager</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div style={styles.twoColGrid}>
            <div style={styles.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={() => setCalDate(new Date(year, month - 1, 1))} style={styles.smallBtn}>◀ Prev</button>
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>🗓️ {monthName}</h2>
                <button onClick={() => setCalDate(new Date(year, month + 1, 1))} style={styles.smallBtn}>Next ▶</button>
              </div>

              <div style={styles.calLegend}>
                <span><i style={{ ...styles.dot, backgroundColor: '#38bdf8' }} /> Martin Active</span>
                <span><i style={{ ...styles.dot, backgroundColor: '#f472b6' }} /> Karine Active</span>
                <span>👑 Both Active</span>
              </div>

              <div style={styles.calGrid}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={styles.calDayHeader}>{d}</div>
                ))}
                {calendarCells.map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} style={styles.calEmptyCell} />;
                  const dayLogs = history.filter(h => h.date === cell.dateStr);
                  const hasMartin = dayLogs.some(l => l.person === 'Martin');
                  const hasKarine = dayLogs.some(l => l.person === 'Karine');
                  const isSelected = selectedDayStr === cell.dateStr;

                  return (
                    <button key={cell.dateStr} onClick={() => setSelectedDayStr(cell.dateStr)} style={{ ...styles.calCell, borderColor: isSelected ? '#fbbf24' : hasMartin && hasKarine ? '#a855f7' : '#1e293b', backgroundColor: isSelected ? '#1e293b' : '#090d16' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cell.day}</span>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', minHeight:
