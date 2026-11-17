import React, { useState, useEffect } from 'react';

const EXERCISES = [
  { id: 'pushups', name: 'Push-Ups', unit: 'reps', goal: 1000, icon: '💪', step: [10, 20, 30] },
  { id: 'squats', name: 'Squats', unit: 'reps', goal: 1500, icon: '🦵', step: [15, 25, 50] },
  { id: 'glutes', name: 'Glute Bridges', unit: 'reps', goal: 1500, icon: '🔥', step: [15, 30, 50] },
  { id: 'plank', name: 'Plank Hold', unit: 'sec', goal: 3600, icon: '⏱️', step: [30, 60, 90] },
];

const DAILY_BONUS = [
  "100 synchronized squats — whoever finishes last makes coffee tomorrow.",
  "Max-effort plank hold: loser does the dishes tonight.",
  "50 push-ups before dinner (can be broken into sets).",
  "3 rounds of 20 glute bridges + 15 squats with zero rest between exercises.",
  "Wall-sit showdown: hold until one person drops!"
];

export default function App() {
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem('mk_workout_scores_v2');
    return saved
      ? JSON.parse(saved)
      : {
          Martin: { pushups: 0, squats: 0, glutes: 0, plank: 0 },
          Karine: { pushups: 0, squats: 0, glutes: 0, plank: 0 },
        };
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('mk_workout_history_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedPerson, setSelectedPerson] = useState('Martin');
  const [customAmounts, setCustomAmounts] = useState({});
  const [bonusIndex, setBonusIndex] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    localStorage.setItem('mk_workout_scores_v2', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem('mk_workout_history_v2', JSON.stringify(history));
  }, [history]);

  const logReps = (person, exerciseId, amount) => {
    const num = Number(amount);
    if (!num || num <= 0) return;

    setScores((prev) => ({
      ...prev,
      [person]: {
        ...prev[person],
        [exerciseId]: (prev[person][exerciseId] || 0) + num,
      },
    }));

    const exerciseObj = EXERCISES.find((e) => e.id === exerciseId);
    const entry = {
      id: Date.now(),
      person,
      exerciseId,
      exerciseName: exerciseObj.name,
      unit: exerciseObj.unit,
      amount: num,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory((prev) => [entry, ...prev.slice(0, 19)]);
  };

  const undoLast = () => {
    if (history.length === 0) return;
    const [last, ...rest] = history;
    setScores((prev) => ({
      ...prev,
      [last.person]: {
        ...prev[last.person],
        [last.exerciseId]: Math.max(0, prev[last.person][last.exerciseId] - last.amount),
      },
    }));
    setHistory(rest);
  };

  const resetAll = () => {
    setScores({
      Martin: { pushups: 0, squats: 0, glutes: 0, plank: 0 },
      Karine: { pushups: 0, squats: 0, glutes: 0, plank: 0 },
    });
    setHistory([]);
    setShowResetConfirm(false);
  };

  const martinTotal = Object.values(scores.Martin).reduce((a, b) => a + b, 0);
  const karineTotal = Object.values(scores.Karine).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Top Hero Banner */}
        <header style={styles.header}>
          <div>
            <span style={styles.badge}>HEAD-TO-HEAD CHALLENGE</span>
            <h1 style={styles.title}>Martin vs. Karine</h1>
            <p style={styles.subtitle}>Cumulative Rep &amp; Endurance Showdown</p>
          </div>

          <div style={styles.scoreboard}>
            <div style={{ ...styles.scoreCard, borderColor: martinTotal >= karineTotal ? '#38bdf8' : '#334155' }}>
              <div style={styles.playerLabel}>
                Martin {martinTotal > karineTotal && martinTotal > 0 ? '👑' : ''}
              </div>
              <div style={{ ...styles.totalNum, color: '#38bdf8' }}>{martinTotal.toLocaleString()}</div>
              <div style={styles.totalSub}>total points</div>
            </div>

            <div style={styles.vsBadge}>VS</div>

            <div style={{ ...styles.scoreCard, borderColor: karineTotal > martinTotal ? '#f472b6' : '#334155' }}>
              <div style={styles.playerLabel}>
                Karine {karineTotal > martinTotal && karineTotal > 0 ? '👑' : ''}
              </div>
              <div style={{ ...styles.totalNum, color: '#f472b6' }}>{karineTotal.toLocaleString()}</div>
              <div style={styles.totalSub}>total points</div>
            </div>
          </div>
        </header>

        {/* Active Logger Toggle */}
        <section style={styles.selectorBar}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Logging reps for:</span>
          <div style={styles.toggleGroup}>
            <button
              onClick={() => setSelectedPerson('Martin')}
              style={{
                ...styles.toggleBtn,
                backgroundColor: selectedPerson === 'Martin' ? '#0284c7' : 'transparent',
                color: selectedPerson === 'Martin' ? '#fff' : '#94a3b8',
              }}
            >
              💪 Martin
            </button>
            <button
              onClick={() => setSelectedPerson('Karine')}
              style={{
                ...styles.toggleBtn,
                backgroundColor: selectedPerson === 'Karine' ? '#db2777' : 'transparent',
                color: selectedPerson === 'Karine' ? '#fff' : '#94a3b8',
              }}
            >
              🔥 Karine
            </button>
          </div>
        </section>

        {/* Main Widescreen Grid */}
        <div style={styles.grid}>
          {EXERCISES.map((ex) => {
            const mVal = scores.Martin[ex.id] || 0;
            const kVal = scores.Karine[ex.id] || 0;
            const mPct = Math.min(100, Math.round((mVal / ex.goal) * 100));
            const kPct = Math.min(100, Math.round((kVal / ex.goal) * 100));
            const accent = selectedPerson === 'Martin' ? '#38bdf8' : '#f472b6';

            return (
              <div key={ex.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.6rem' }}>{ex.icon}</span>
                    <div>
                      <h3 style={styles.cardTitle}>{ex.name}</h3>
                      <span style={styles.goalText}>Target: {ex.goal.toLocaleString()} {ex.unit}</span>
                    </div>
                  </div>
                  <span style={styles.leaderTag}>
                    {mVal === kVal
                      ? 'Tied'
                      : mVal > kVal
                      ? `Martin +${mVal - kVal}`
                      : `Karine +${kVal - mVal}`}
                  </span>
                </div>

                {/* Martin Progress */}
                <div style={styles.progressRow}>
                  <div style={styles.progressLabels}>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>Martin</span>
                    <span>{mVal.toLocaleString()} / {ex.goal.toLocaleString()} ({mPct}%)</span>
                  </div>
                  <div style={styles.track}>
                    <div style={{ ...styles.fill, width: `${mPct}%`, backgroundColor: '#38bdf8' }} />
                  </div>
                </div>

                {/* Karine Progress */}
                <div style={styles.progressRow}>
                  <div style={styles.progressLabels}>
                    <span style={{ color: '#f472b6', fontWeight: 600 }}>Karine</span>
                    <span>{kVal.toLocaleString()} / {ex.goal.toLocaleString()} ({kPct}%)</span>
                  </div>
                  <div style={styles.track}>
                    <div style={{ ...styles.fill, width: `${kPct}%`, backgroundColor: '#f472b6' }} />
                  </div>
                </div>

                {/* Quick Add Buttons */}
                <div style={styles.actionRow}>
                  {ex.step.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => logReps(selectedPerson, ex.id, amt)}
                      style={{ ...styles.quickBtn, borderColor: accent }}
                    >
                      +{amt}
                    </button>
                  ))}
                  <div style={styles.customBox}>
                    <input
                      type="number"
                      placeholder="Custom"
                      value={customAmounts[ex.id] || ''}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, [ex.id]: e.target.value })}
                      style={styles.input}
                    />
                    <button
                      onClick={() => {
                        logReps(selectedPerson, ex.id, customAmounts[ex.id]);
                        setCustomAmounts({ ...customAmounts, [ex.id]: '' });
                      }}
                      style={{
                        ...styles.addBtn,
                        backgroundColor: selectedPerson === 'Martin' ? '#0284c7' : '#db2777',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Widescreen Row: Daily Bonus & Recent Feed */}
        <div style={styles.bottomGrid}>
          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#fbbf24' }}>⚡ Daily Couples Tie-Breaker</h3>
              <button
                onClick={() => setBonusIndex((bonusIndex + 1) % DAILY_BONUS.length)}
                style={styles.smallBtn}
              >
                Shuffle Challenge
              </button>
            </div>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.5, color: '#e2e8f0', margin: 0 }}>
              {DAILY_BONUS[bonusIndex]}
            </p>
          </div>

          <div style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>📋 Recent Activity</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {history.length > 0 && (
                  <button onClick={undoLast} style={styles.smallBtn}>
                    Undo Last
                  </button>
                )}
                {!showResetConfirm ? (
                  <button onClick={() => setShowResetConfirm(true)} style={{ ...styles.smallBtn, color: '#f87171' }}>
                    Reset
                  </button>
                ) : (
                  <button onClick={resetAll} style={{ ...styles.smallBtn, backgroundColor: '#dc2626', color: '#fff' }}>
                    Confirm Reset
                  </button>
                )}
              </div>
            </div>

            {history.length === 0 ? (
              <p style={{ color: '#64748b', margin: 0 }}>No sets logged yet today. Pick a player above and tap +10 to start!</p>
            ) : (
              <div style={styles.feedList}>
                {history.map((item) => (
                  <div key={item.id} style={styles.feedItem}>
                    <span>
                      <strong style={{ color: item.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>
                        {item.person}
                      </strong>{' '}
                      logged <strong>+{item.amount} {item.unit}</strong> of {item.exerciseName}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#090d16',
    backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #090d16 60%)',
    color: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '28px 24px',
    boxSizing: 'border-box',
  },
  container: {
    maxWidth: '1320px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '28px',
    paddingBottom: '24px',
    borderBottom: '1px solid #1e293b',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  title: {
    fontSize: '2.4rem',
    fontWeight: 800,
    margin: '0 0 4px 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: 0,
    color: '#94a3b8',
    fontSize: '1.05rem',
  },
  scoreboard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  scoreCard: {
    backgroundColor: '#111827',
    border: '2px solid #334155',
    borderRadius: '14px',
    padding: '14px 24px',
    minWidth: '140px',
    textAlign: 'center',
  },
  playerLabel: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  totalNum: {
    fontSize: '1.9rem',
    fontWeight: 800,
    lineHeight: 1.1,
  },
  totalSub: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '2px',
  },
  vsBadge: {
    fontWeight: 800,
    color: '#475569',
    fontSize: '0.9rem',
  },
  selectorBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    backgroundColor: '#111827',
    padding: '12px 20px',
    borderRadius: '14px',
    border: '1px solid #1e293b',
    marginBottom: '24px',
  },
  toggleGroup: {
    display: 'flex',
    backgroundColor: '#090d16',
    padding: '4px',
    borderRadius: '10px',
    gap: '6px',
  },
  toggleBtn: {
    border: 'none',
    padding: '10px 22px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#111827',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 700,
  },
  goalText: {
    fontSize: '0.82rem',
    color: '#64748b',
  },
  leaderTag: {
    fontSize: '0.78rem',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '999px',
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
  },
  progressRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#cbd5e1',
  },
  track: {
    height: '10px',
    backgroundColor: '#1e293b',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.3s ease',
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '4px',
  },
  quickBtn: {
    flex: '1 1 55px',
    padding: '10px 8px',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  customBox: {
    display: 'flex',
    flex: '2 1 120px',
    gap: '6px',
  },
  input: {
    width: '100%',
    minWidth: '60px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#090d16',
    color: '#fff',
    fontSize: '0.9rem',
  },
  addBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '20px',
  },
  panel: {
    backgroundColor: '#111827',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '20px',
  },
  smallBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '160px',
    overflowY: 'auto',
  },
  feedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#090d16',
    borderRadius: '8px',
    fontSize: '0.9rem',
  },
};
