import React, { useState } from 'react';

// Metrics tab: running all-time totals and lots of breakdowns.
// All-time totals come from the stored scores (which never reset — the
// top-of-app scores are now weekly). Breakdowns come from the history log,
// which only goes back to 2026-11-19 (the log was wiped that morning; the
// restored 80 / 60 are in the all-time totals but not in the breakdowns).

const PEOPLE = ['Martin', 'Karine'];
const COLORS = { Martin: '#38bdf8', Karine: '#f472b6' };
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(ds, n) {
  const d = new Date(ds + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function mondayOf(ds) {
  const d = new Date(ds + 'T12:00:00');
  return addDays(ds, -((d.getDay() + 6) % 7));
}
function weekdayIdx(ds) {
  return (new Date(ds + 'T12:00:00').getDay() + 6) % 7;
}
function fmt(n) {
  return Math.round(n).toLocaleString();
}
function shortDate(ds) {
  return new Date(ds + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function statsFor(who, history, todayStr) {
  const mine = history.filter(h => h.person === who);
  const byDay = {};
  mine.forEach(h => { byDay[h.date] = (byDay[h.date] || 0) + h.reps; });
  const days = Object.keys(byDay);
  const loggedTotal = mine.reduce((a, h) => a + h.reps, 0);
  const biggest = mine.reduce((b, h) => (h.reps > (b?.reps || 0) ? h : b), null);
  const bestDay = days.reduce((b, d) => (byDay[d] > (b ? byDay[b] : 0) ? d : b), null);
  const byWeekday = Array(7).fill(0);
  days.forEach(d => { byWeekday[weekdayIdx(d)] += byDay[d]; });
  const busiest = byWeekday.some(v => v > 0) ? byWeekday.indexOf(Math.max(...byWeekday)) : null;
  const tod = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  mine.forEach(h => {
    const hr = typeof h.hour === 'number' ? h.hour : 12;
    if (hr >= 5 && hr < 12) tod.morning += h.reps;
    else if (hr < 17 && hr >= 12) tod.afternoon += h.reps;
    else if (hr >= 17 && hr < 22) tod.evening += h.reps;
    else tod.night += h.reps;
  });
  const favTime = loggedTotal > 0 ? Object.entries(tod).sort((a, b) => b[1] - a[1])[0][0] : null;
  const byLabel = {};
  mine.forEach(h => { const l = h.label || 'Workout Reps'; byLabel[l] = (byLabel[l] || 0) + 1; });
  const monthKey = todayStr.slice(0, 7);
  const thisMonth = mine.filter(h => h.date.startsWith(monthKey)).reduce((a, h) => a + h.reps, 0);
  const today = byDay[todayStr] || 0;
  const last7 = mine.filter(h => h.date > addDays(todayStr, -7) && h.date <= todayStr).reduce((a, h) => a + h.reps, 0);
  const firstDay = days.length ? days.sort()[0] : null;
  const spanDays = firstDay ? Math.round((new Date(todayStr + 'T12:00:00') - new Date(firstDay + 'T12:00:00')) / 86400000) + 1 : 0;
  return {
    loggedTotal, sessions: mine.length, activeDays: days.length, byDay,
    avgSession: mine.length ? loggedTotal / mine.length : 0,
    avgActiveDay: days.length ? loggedTotal / days.length : 0,
    biggest, bestDay, bestDayReps: bestDay ? byDay[bestDay] : 0,
    byWeekday, busiest, tod, favTime, byLabel, thisMonth, today, last7,
    consistency: spanDays ? Math.round((days.length / spanDays) * 100) : 0,
  };
}

export default function Metrics({ history, scores, weeklyWins, restDays, streaks, todayStr, s }) {
  const [view, setView] = useState('overview');
  const st = { Martin: statsFor('Martin', history, todayStr), Karine: statsFor('Karine', history, todayStr) };
  const allTime = { Martin: scores.Martin || 0, Karine: scores.Karine || 0 };
  const combined = allTime.Martin + allTime.Karine;

  const wins = { Martin: 0, Karine: 0, Tie: 0 };
  (weeklyWins || []).forEach(w => { wins[w.winner] = (wins[w.winner] || 0) + 1; });
  const forfeitsOwed = { Martin: 0, Karine: 0 };
  (weeklyWins || []).forEach(w => {
    if (w.winner === 'Martin' || w.winner === 'Karine') {
      const loser = w.winner === 'Martin' ? 'Karine' : 'Martin';
      if (!w.forfeitPaid) forfeitsOwed[loser]++;
    }
  });

  // Head-to-head: days each player out-repped the other
  const allDays = [...new Set(history.map(h => h.date))].sort();
  const dayWins = { Martin: 0, Karine: 0, Tie: 0 };
  allDays.forEach(d => {
    const m = st.Martin.byDay[d] || 0, k = st.Karine.byDay[d] || 0;
    dayWins[m > k ? 'Martin' : k > m ? 'Karine' : 'Tie']++;
  });

  // Last 8 weeks
  const thisMonday = mondayOf(todayStr);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(thisMonday, -7 * (7 - i)));
  const weekRows = weeks.map(ws => {
    const we = addDays(ws, 6);
    const t = { Martin: 0, Karine: 0 };
    history.forEach(h => { if (h.date >= ws && h.date <= we) t[h.person] = (t[h.person] || 0) + h.reps; });
    return { ws, ...t };
  });
  const weekMax = Math.max(1, ...weekRows.map(w => Math.max(w.Martin, w.Karine)));
  const thisWeek = weekRows[7], lastWeek = weekRows[6];

  // Last 14 days
  const days14 = Array.from({ length: 14 }, (_, i) => addDays(todayStr, -13 + i));
  const dayMax = Math.max(1, ...days14.map(d => Math.max(st.Martin.byDay[d] || 0, st.Karine.byDay[d] || 0)));

  const card = (label, m, k, sub) => (
    <div style={{ border: '1px solid #1e293b', borderRadius: '10px', padding: '10px' }}>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
        <span style={{ color: COLORS.Martin, fontWeight: 800, fontSize: '1rem' }}>{m}</span>
        <span style={{ color: COLORS.Karine, fontWeight: 800, fontSize: '1rem' }}>{k}</span>
      </div>
      {sub && <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' };
  const h3 = { marginTop: 0, marginBottom: '10px', fontSize: '1rem' };
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
  const legend = (
    <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', fontWeight: 700, marginBottom: '8px' }}>
      <span style={{ color: COLORS.Martin }}>■ Martin</span><span style={{ color: COLORS.Karine }}>■ Karine</span>
    </div>
  );
  const pairBars = (rows, max, labelFn, highlight) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
      {rows.map((r, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '1px', width: '100%' }}>
            <div style={{ flex: 1, height: `${(r.Martin / max) * 100}%`, background: COLORS.Martin, borderRadius: '2px 2px 0 0', minHeight: r.Martin ? '2px' : 0 }} />
            <div style={{ flex: 1, height: `${(r.Karine / max) * 100}%`, background: COLORS.Karine, borderRadius: '2px 2px 0 0', minHeight: r.Karine ? '2px' : 0 }} />
          </div>
          <div style={{ fontSize: '0.58rem', color: highlight === i ? '#fbbf24' : '#64748b', marginTop: '3px', whiteSpace: 'nowrap' }}>{labelFn(r, i)}</div>
        </div>
      ))}
    </div>
  );
  const TOD_LABEL = { morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌆 Evening', night: '🌙 Night' };

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {[['overview', '📊 Overview'], ['trends', '📈 Trends'], ['habits', '🧠 Habits']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{ ...s.navBtn, flex: 1, background: view === k ? '#1e293b' : 'transparent', color: view === k ? '#fbbf24' : '#94a3b8', border: '1px solid #1e293b' }}>{l}</button>
        ))}
      </div>

      {view === 'overview' && (
        <>
          <div style={s.panel}>
            <h3 style={h3}>🏅 All-time running totals</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '10px' }}>
              {PEOPLE.map(p => (
                <div key={p}>
                  <div style={{ color: COLORS[p], fontWeight: 700, fontSize: '0.85rem' }}>{p}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900 }}>{fmt(allTime[p])}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{pct(allTime[p], combined)} of all reps</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
              Together: {fmt(combined)} reps · {allTime.Martin === allTime.Karine ? 'dead even' : `${allTime.Martin > allTime.Karine ? 'Martin' : 'Karine'} leads by ${fmt(Math.abs(allTime.Martin - allTime.Karine))}`}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>Never resets. The scores at the top reset every Monday.</div>
          </div>

          <div style={s.panel}>
            <h3 style={h3}>⚔️ Head to head</h3>
            {legend}
            <div style={grid}>
              {card('Weekly Showdowns won', wins.Martin, wins.Karine, wins.Tie ? `${wins.Tie} tied` : null)}
              {card('Days out-repped the other', dayWins.Martin, dayWins.Karine, dayWins.Tie ? `${dayWins.Tie} even` : null)}
              {card('Forfeits still owed', forfeitsOwed.Martin, forfeitsOwed.Karine)}
              {card('Today', fmt(st.Martin.today), fmt(st.Karine.today))}
              {card('This week', fmt(thisWeek.Martin), fmt(thisWeek.Karine))}
              {card('Last week', fmt(lastWeek.Martin), fmt(lastWeek.Karine))}
              {card('Last 7 days', fmt(st.Martin.last7), fmt(st.Karine.last7))}
              {card('This month', fmt(st.Martin.thisMonth), fmt(st.Karine.thisMonth))}
            </div>
          </div>

          <div style={s.panel}>
            <h3 style={h3}>📋 Personal records</h3>
            {legend}
            <div style={grid}>
              {card('Biggest single set', fmt(st.Martin.biggest?.reps || 0), fmt(st.Karine.biggest?.reps || 0))}
              {card('Best day', fmt(st.Martin.bestDayReps), fmt(st.Karine.bestDayReps),
                [st.Martin.bestDay && `M: ${shortDate(st.Martin.bestDay)}`, st.Karine.bestDay && `K: ${shortDate(st.Karine.bestDay)}`].filter(Boolean).join(' · ') || null)}
              {card('Current streak', `${streaks.Martin.current}d`, `${streaks.Karine.current}d`)}
              {card('Best streak', `${streaks.Martin.best}d`, `${streaks.Karine.best}d`)}
              {card('Sessions logged', st.Martin.sessions, st.Karine.sessions)}
              {card('Active days', st.Martin.activeDays, st.Karine.activeDays)}
              {card('Avg per session', fmt(st.Martin.avgSession), fmt(st.Karine.avgSession))}
              {card('Avg per active day', fmt(st.Martin.avgActiveDay), fmt(st.Karine.avgActiveDay))}
              {card('Consistency', `${st.Martin.consistency}%`, `${st.Karine.consistency}%`, 'Share of days logged since first log')}
              {card('Rest days taken', (restDays.Martin || []).length, (restDays.Karine || []).length)}
            </div>
          </div>
        </>
      )}

      {view === 'trends' && (
        <>
          <div style={s.panel}>
            <h3 style={h3}>📅 Last 8 weeks</h3>
            {legend}
            {pairBars(weekRows, weekMax, (r, i) => (i === 7 ? 'Now' : shortDate(r.ws)), 7)}
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '10px' }}>
              {PEOPLE.map(p => {
                const diff = thisWeek[p] - lastWeek[p];
                return <div key={p}><span style={{ color: COLORS[p], fontWeight: 700 }}>{p}</span>: {fmt(thisWeek[p])} this week vs {fmt(lastWeek[p])} last week ({diff >= 0 ? '+' : ''}{fmt(diff)})</div>;
              })}
            </div>
          </div>
          <div style={s.panel}>
            <h3 style={h3}>🗓️ Last 14 days</h3>
            {legend}
            {pairBars(days14.map(d => ({ Martin: st.Martin.byDay[d] || 0, Karine: st.Karine.byDay[d] || 0, d })), dayMax,
              (r, i) => DAY_NAMES[weekdayIdx(r.d)][0], 13)}
          </div>
          <div style={s.panel}>
            <h3 style={h3}>🏆 Weekly Showdown history</h3>
            {(weeklyWins || []).length === 0
              ? <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No weeks crowned yet.</div>
              : [...weeklyWins].reverse().map(w => (
                <div key={w.weekStart} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '5px 0', borderBottom: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8' }}>Week of {shortDate(w.weekStart)}</span>
                  <span><span style={{ color: COLORS.Martin }}>{fmt(w.martin)}</span> – <span style={{ color: COLORS.Karine }}>{fmt(w.karine)}</span></span>
                  <span style={{ fontWeight: 800, color: w.winner === 'Tie' ? '#94a3b8' : COLORS[w.winner] }}>{w.winner === 'Tie' ? 'Tie' : `👑 ${w.winner}`}</span>
                </div>
              ))}
          </div>
        </>
      )}

      {view === 'habits' && (
        <>
          <div style={s.panel}>
            <h3 style={h3}>⏰ When you train</h3>
            {PEOPLE.map(p => {
              const t = st[p].loggedTotal || 1;
              return (
                <div key={p} style={{ marginBottom: '12px' }}>
                  <div style={{ color: COLORS[p], fontWeight: 800, fontSize: '0.85rem', marginBottom: '4px' }}>
                    {p}{st[p].favTime ? ` · favourite: ${TOD_LABEL[st[p].favTime]}` : ''}
                  </div>
                  {Object.entries(st[p].tod).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', marginBottom: '3px' }}>
                      <span style={{ width: '82px', color: '#94a3b8' }}>{TOD_LABEL[k]}</span>
                      <div style={{ flex: 1, height: '8px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ width: `${(v / t) * 100}%`, height: '100%', background: COLORS[p] }} />
                      </div>
                      <span style={{ width: '44px', textAlign: 'right', color: '#cbd5e1' }}>{fmt(v)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={s.panel}>
            <h3 style={h3}>📆 Reps by weekday</h3>
            {legend}
            {pairBars(DAY_NAMES.map((d, i) => ({ Martin: st.Martin.byWeekday[i], Karine: st.Karine.byWeekday[i] })),
              Math.max(1, ...st.Martin.byWeekday, ...st.Karine.byWeekday), (r, i) => DAY_NAMES[i])}
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '8px' }}>
              {PEOPLE.map(p => <div key={p}><span style={{ color: COLORS[p], fontWeight: 700 }}>{p}</span>'s big day: {st[p].busiest === null ? '–' : DAY_NAMES[st[p].busiest]}</div>)}
            </div>
          </div>
          <div style={s.panel}>
            <h3 style={h3}>🔘 Favourite buttons</h3>
            {PEOPLE.map(p => (
              <div key={p} style={{ marginBottom: '8px', fontSize: '0.78rem' }}>
                <div style={{ color: COLORS[p], fontWeight: 800, marginBottom: '3px' }}>{p}</div>
                {Object.entries(st[p].byLabel).sort((a, b) => b[1] - a[1]).map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}><span>{l}</span><span>{c}×</span></div>
                ))}
                {Object.keys(st[p].byLabel).length === 0 && <div style={{ color: '#64748b' }}>Nothing logged yet.</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: '0.64rem', color: '#64748b', textAlign: 'center', marginBottom: '14px' }}>
        Breakdowns start Nov 19, 2026. Reps from before that are in the all-time totals only.
      </div>
    </div>
  );
}
