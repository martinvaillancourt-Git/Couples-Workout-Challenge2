import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { initOneSignal, enableNotifications, setActivePlayer, notifyOpponent, isOneSignalConfigured } from './onesignal.js';

// ⬇️ MAKE SURE YOUR CONFIG VALUES ARE HERE ⬇️
const firebaseConfig = {
  apiKey: "AIzaSyDHDC1i4szCTjII6s6WS2ejt1kCr9hoH_Y",
  authDomain: "couples-reps-arena.firebaseapp.com",
  projectId: "couples-reps-arena",
  storageBucket: "couples-reps-arena.firebasestorage.app",
  messagingSenderId: "1032825924020",
  appId: "1:1032825924020:web:bf5c95b3f4967a4ec86ae1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const challengeDocRef = doc(db, 'challenges', 'martin_karine_arena');

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
  { id: 'streak_3', title: 'On Fire', desc: 'Reached a 3-day logging streak', icon: '🔥', check: (m, k, h, s) => (s?.Martin.best >= 3 || s?.Karine.best >= 3) },
  { id: 'streak_7', title: 'Week Warrior', desc: 'Reached a 7-day logging streak', icon: '🌋', check: (m, k, h, s) => (s?.Martin.best >= 7 || s?.Karine.best >= 7) },
  { id: 'streak_30', title: 'Unstoppable', desc: 'Reached a 30-day logging streak', icon: '💎', check: (m, k, h, s) => (s?.Martin.best >= 30 || s?.Karine.best >= 30) },
  { id: 'weekly_champ', title: 'Weekly Champion', desc: 'Won a Weekly Showdown', icon: '🏆', check: (m, k, h, s, w) => (w || []).some(x => x.winner === 'Martin' || x.winner === 'Karine') },
  { id: 'perfect_week', title: 'Perfect Week', desc: 'Logged reps every day Monday to Sunday in a week', icon: '🌟', check: (m, k, h) => {
    const daysByPerson = {};
    h.forEach(i => {
      daysByPerson[i.person] = daysByPerson[i.person] || new Set();
      daysByPerson[i.person].add(i.date);
    });
    return Object.values(daysByPerson).some(days => {
      const weeks = {};
      days.forEach(ds => {
        const monday = getMondayStr(ds);
        weeks[monday] = (weeks[monday] || 0) + 1;
      });
      return Object.values(weeks).some(count => count >= 7);
    });
  } },
  { id: 'century_club', title: 'Century Club', desc: 'Logged 100 reps in a single entry', icon: '💯', check: (m, k, h) => h.some(i => i.reps >= 100) },
  { id: 'early_bird', title: 'Early Bird', desc: 'Logged reps before 7 AM', icon: '🌅', check: (m, k, h) => h.some(i => i.hour < 7) },
  { id: 'night_owl', title: 'Night Owl', desc: 'Logged reps after 10 PM', icon: '🦉', check: (m, k, h) => h.some(i => i.hour >= 22) },
  { id: 'photo_finish', title: 'Photo Finish', desc: 'Won a Weekly Showdown by 10 reps or fewer', icon: '📸', check: (m, k, h, s, w) => (w || []).some(x => x.winner !== 'Tie' && Math.abs(x.martin - x.karine) <= 10) },
  { id: 'comeback', title: 'Comeback Kid', desc: 'Won a Weekly Showdown the week after losing one', icon: '🔄', check: (m, k, h, s, w) => {
    const wins = (w || []).filter(x => x.winner !== 'Tie').sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    for (let i = 1; i < wins.length; i++) {
      if (addDaysStr(wins[i - 1].weekStart, 7) !== wins[i].weekStart) continue;
      if (wins[i].winner !== wins[i - 1].winner) return true;
    }
    return false;
  } },
  { id: 'tag_team', title: 'Tag Team', desc: 'Both logged reps within 5 minutes of each other', icon: '🤝', check: (m, k, h) => {
    const sorted = [...h].sort((a, b) => a.id - b.id);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].person !== sorted[i - 1].person && sorted[i].id - sorted[i - 1].id <= 5 * 60 * 1000) return true;
    }
    return false;
  } },
  { id: 'hat_trick', title: 'Hat Trick', desc: 'Won 3 Weekly Showdowns', icon: '🎩', check: (m, k, h, s, w) => (w || []).filter(x => x.winner === 'Martin').length >= 3 || (w || []).filter(x => x.winner === 'Karine').length >= 3 },
  { id: 'total_10000', title: '10,000 Rep Legend', desc: 'Hit 10,000 total reps combined', icon: '💠', check: (m, k, h) => m + k >= 10000 },
  { id: 'freeze_saver', title: 'Ice Cold', desc: 'Saved a streak with a freeze', icon: '🧊', check: (m, k, h, s) => (s?.Martin.freezeSaved || s?.Karine.freezeSaved) },
  { id: 'forfeit_paid', title: 'Debt Settled', desc: 'Paid off a weekly forfeit', icon: '💸', check: (m, k, h, s, w) => (w || []).some(x => x.forfeitPaid) },
];

// Forfeit ideas for the weekly loser (winner can also type a custom one)
const FORFEIT_OPTIONS = [
  'Winner picks dinner',
  'Loser cooks dinner',
  'Loser does the dishes for a week',
  '10-minute massage for the winner',
  'Winner picks the movie night',
  'Loser does a chore of the winner’s choice',
];

// Alley's motivational lines for the full-screen pop-up (Martin only)
const MOTIVATION_LINES = [
  "You've got this, Martin. One more set and you're ahead of Karine.",
  "Karine isn't going to beat herself. Get moving.",
  'Fifty reps a day keeps the couch away. Go!',
  "Your streak is alive. Don't let it die today.",
  "Every rep you log is a rep Karine didn't.",
  'The A7s sound even better after a workout. Probably science.',
  'No excuses — ten minutes is a full set. Go earn it.',
  "You're one good session from taking the lead. Take it.",
  'Remember the forfeit. Somebody owes somebody. Make it her.',
  "Stronger every day. That's the whole deal. Now go.",
  'Push-ups. Squats. Glute bridges. Pick one and start.',
  "The week won't win itself. Log something.",
];

// Johnny Depp motivational lines for the full-screen pop-up (Karine only)
const KARINE_MOTIVATION_LINES = [
  "You've got this, Karine. One more set and you're ahead of Martin.",
  "Martin isn't going to beat himself. Get moving.",
  'Fifty reps a day keeps the couch away. Go!',
  "Your streak is alive. Don't let it die today.",
  "Every rep you log is a rep Martin didn't.",
  'Johnny would want you to win this week. Go earn it.',
  'No excuses — ten minutes is a full set. Go earn it.',
  "You're one good session from taking the lead. Take it.",
  'Remember the forfeit. Somebody owes somebody. Make it him.',
  "Stronger every day. That's the whole deal. Now go.",
  'Push-ups. Squats. Glute bridges. Pick one and start.',
  "The week won't win itself. Log something.",
];

// Alley's rotating pictures for the motivation pop-up (64 total)
const ALLEY_PICS = [
  '/alley-pics/alley-01b.webp',
  '/alley-pics/alley-02b.webp',
  '/alley-pics/alley-03b.webp',
  '/alley-pics/alley-04b.webp',
  '/alley-pics/alley-06b.webp',
  '/alley-pics/alley-07b.webp',
  '/alley-pics/alley-08b.webp',
  '/alley-pics/alley-09b.webp',
  '/alley-pics/alley-10.webp',
  '/alley-pics/alley-11b.webp',
  '/alley-pics/alley-12b.webp',
  '/alley-pics/alley-13.webp',
  '/alley-pics/alley-14b.webp',
  '/alley-pics/alley-15.webp',
  '/alley-pics/alley-16c.webp',
  '/alley-pics/alley-17.webp',
  '/alley-pics/alley-18.webp',
  '/alley-pics/alley-19.webp',
  '/alley-pics/alley-20.webp',
  '/alley-pics/alley-21.webp',
  '/alley-pics/alley-22.webp',
  '/alley-pics/alley-23.webp',
  '/alley-pics/alley-24.webp',
  '/alley-pics/alley-25.webp',
  '/alley-pics/alley-27.webp',
  '/alley-pics/alley-28.webp',
  '/alley-pics/alley-30.webp',
  '/alley-pics/alley-31.webp',
  '/alley-pics/alley-32.webp',
  '/alley-pics/alley-33.webp',
  '/alley-pics/alley-34b.webp',
  '/alley-pics/alley-35.webp',
  '/alley-pics/alley-36.webp',
  '/alley-pics/alley-37.webp',
  '/alley-pics/alley-38.webp',
  '/alley-pics/alley-39.webp',
  '/alley-pics/alley-40.webp',
  '/alley-pics/alley-41.webp',
  '/alley-pics/alley-43.webp',
  '/alley-pics/alley-44.webp',
  '/alley-pics/alley-45.webp',
  '/alley-pics/alley-47.webp',
  '/alley-pics/alley-48.webp',
  '/alley-pics/alley-50.webp',
  '/alley-pics/alley-51.webp',
  '/alley-pics/alley-52.webp',
  '/alley-pics/alley-53.webp',
  '/alley-pics/alley-54.webp',
  '/alley-pics/alley-56.webp',
  '/alley-pics/alley-57.webp',
  '/alley-pics/alley-59.webp',
  '/alley-pics/alley-61.webp',
  '/alley-pics/alley-62.webp',
  '/alley-pics/alley-64.webp',
  '/alley-pics/alley-65e.webp',
  '/alley-pics/alley-66d.webp',
  '/alley-pics/alley-68e.webp',
  '/alley-pics/alley-69e.webp',
  '/alley-pics/alley-70e.webp',
  '/alley-pics/alley-71b.webp',
  '/alley-pics/alley-72e.webp',
  '/alley-pics/alley-73f.webp',
  '/alley-pics/alley-74f.webp',
  '/alley-pics/alley-75f.webp',
  '/alley-pics/alley-81.webp',
  '/alley-pics/alley-82.webp',
  '/alley-pics/alley-83.webp',
  '/alley-pics/alley-84.webp',
];

// Johnny Depp pictures for the motivation pop-up (Karine only)
const JOHNNY_PICS = [
  '/johnny-pics/johnny-02.webp',
  '/johnny-pics/johnny-03.webp',
  '/johnny-pics/johnny-04.webp',
  '/johnny-pics/johnny-05.webp',
  '/johnny-pics/johnny-06.webp',
  '/johnny-pics/johnny-07.webp',
  '/johnny-pics/johnny-08.webp',
  '/johnny-pics/johnny-09.webp',
  '/johnny-pics/johnny-10.webp',
  '/johnny-pics/johnny-11.webp',
  '/johnny-pics/johnny-12.webp',
];

function getRank(reps) {
  if (reps >= 2500) return { title: 'Titan Legend', color: '#fbbf24' };
  if (reps >= 1000) return { title: 'Iron Contender', color: '#38bdf8' };
  if (reps >= 400) return { title: 'Rivalry Warrior', color: '#a855f7' };
  if (reps >= 100) return { title: 'Active Challenger', color: '#4ade80' };
  return { title: 'Rookie', color: '#94a3b8' };
}

// Streaks are computed from history dates (same YYYY-MM-DD convention the
// app already stamps entries with). A streak stays alive through today if
// the player logged yesterday but not yet today.
function dateStrNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// Streak freeze: each player gets 1 freeze per week (Monday–Sunday). A
// missed day is forgiven automatically if that week's freeze is still
// unused — so one slip doesn't kill the streak. All of this is computed
// from the history log, no extra stored state.
function computeStreaks(history) {
  const result = {};
  for (const who of ['Martin', 'Karine']) {
    const days = new Set(history.filter(h => h.person === who).map(h => h.date));
    const todayStr = dateStrNDaysAgo(0);
    const currentWeek = getMondayStr(todayStr);

    // Walk back from a start day, counting logged days; a missed day is
    // forgiven once per week (that week's freeze). Returns the run length,
    // whether a freeze was used, and which weeks' freezes were consumed.
    const walkBack = (startDs, allowFreeze) => {
      let count = 0;
      let freezeUsed = false;
      const usedWeeks = new Set();
      let d = new Date(startDs + 'T12:00:00');
      for (;;) {
        const ds = d.toISOString().split('T')[0];
        if (days.has(ds)) {
          count++;
          d.setDate(d.getDate() - 1);
          continue;
        }
        if (allowFreeze) {
          const wk = getMondayStr(ds);
          if (!usedWeeks.has(wk)) {
            usedWeeks.add(wk);
            freezeUsed = true;
            d.setDate(d.getDate() - 1);
            continue;
          }
        }
        break;
      }
      return { count, freezeUsed, usedWeeks };
    };

    const startDs = days.has(todayStr) ? todayStr : addDaysStr(todayStr, -1);
    const cur = walkBack(startDs, true);
    const bestWithFreeze = Math.max(0, ...[...days].map(ds => walkBack(ds, true).count));
    const bestWithoutFreeze = Math.max(0, ...[...days].map(ds => walkBack(ds, false).count));

    result[who] = {
      current: cur.count,
      best: bestWithFreeze,
      loggedToday: days.has(todayStr),
      freezeUsed: cur.freezeUsed,
      freezeSaved: bestWithFreeze > bestWithoutFreeze,
      freezeAvailableThisWeek: !cur.usedWeeks.has(currentWeek),
    };
  }
  return result;
}

// Weekly Showdown: weeks run Monday–Sunday. The winner of a week is
// crowned automatically the first time the app opens after that week ends.
function addDaysStr(ds, n) {
  const d = new Date(ds + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function getMondayStr(ds) {
  const d = new Date(ds + 'T12:00:00');
  const idx = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  return addDaysStr(ds, -idx);
}

function computeWeekTotals(history, weekStart) {
  const weekEnd = addDaysStr(weekStart, 6);
  let martin = 0, karine = 0;
  for (const e of history) {
    if (e.date >= weekStart && e.date <= weekEnd) {
      if (e.person === 'Martin') martin += e.reps;
      else if (e.person === 'Karine') karine += e.reps;
    }
  }
  return { martin, karine };
}

function fmtShortDate(ds) {
  return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function App() {
  const [tab, setTab] = useState('arena');
  const [person, setPerson] = useState('Martin');
  const [syncStatus, setSyncStatus] = useState('Connecting...');
  const [notifState, setNotifState] = useState('off');

  const [scores, setScores] = useState({ Martin: 0, Karine: 0 });
  const [history, setHistory] = useState([]);
  const [steals, setSteals] = useState({});
  const [weeklyWins, setWeeklyWins] = useState([]);

  const [forfeitPick, setForfeitPick] = useState(FORFEIT_OPTIONS[0]);
  const [forfeitCustom, setForfeitCustom] = useState('');
  const [dailyTaunt, setDailyTaunt] = useState('');
  const [animateScore, setAnimateScore] = useState(null);

  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [heartsKey, setHeartsKey] = useState(0);
  const [motivation, setMotivation] = useState(null);
  const [motivationPic, setMotivationPic] = useState(ALLEY_PICS[0]);

  // Real-time cloud sync with a 3-second connection timeout fallback
  useEffect(() => {
    let isConnected = false;
    const timeout = setTimeout(() => {
      if (!isConnected) {
        setSyncStatus('⚠️ Local Mode (Cloud Timeout)');
      }
    }, 3000);

    const unsubscribe = onSnapshot(
      challengeDocRef,
      async (snapshot) => {
        isConnected = true;
        clearTimeout(timeout);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.scores) setScores(data.scores);
          if (data.history) setHistory(data.history);
          if (data.steals) setSteals(data.steals);
          if (data.weeklyWins) setWeeklyWins(data.weeklyWins);
        } else {
          try {
            await setDoc(challengeDocRef, {
              scores: { Martin: 0, Karine: 0 },
              history: [],
              steals: {}
            });
          } catch (err) {
            console.error('Initialization error:', err);
          }
        }
        setSyncStatus('🟢 Live Sync');
      },
      (error) => {
        isConnected = true;
        clearTimeout(timeout);
        console.error('Sync error:', error);
        setSyncStatus('🔴 Offline Mode');
      }
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr === 12) setDailyTaunt('🕛 Noon Check-in: Half the day is gone! Time to log some reps and pull the rope.');
    else if (hr === 18) setDailyTaunt('🕕 6:00 PM Showdown: Prime workout window is open!');
  }, []);

  // Push notifications (OneSignal) — no-op until the App ID is configured
  // in src/onesignal.js. Each phone is tagged by its Active Logger so a
  // push goes to the other player, not to yourself.
  useEffect(() => {
    initOneSignal(setNotifState);
  }, []);

  useEffect(() => {
    if (notifState === 'on') setActivePlayer(person);
  }, [person, notifState]);

  // Crown last week's showdown winner the first time the app opens after
  // the week ends (weeks run Monday–Sunday). The result is saved to the
  // cloud and the other player gets a push about it.
  const crownedRef = useRef({});
  useEffect(() => {
    const thisWeek = getMondayStr(todayDateStr);
    const lastWeek = addDaysStr(thisWeek, -7);
    if (crownedRef.current[lastWeek]) return;
    if (weeklyWins.some(w => w.weekStart === lastWeek)) return;
    const totals = computeWeekTotals(history, lastWeek);
    if (totals.martin === 0 && totals.karine === 0) return;
    const winner = totals.martin > totals.karine ? 'Martin' : totals.karine > totals.martin ? 'Karine' : 'Tie';
    crownedRef.current[lastWeek] = true;
    const entry = { weekStart: lastWeek, winner, martin: totals.martin, karine: totals.karine, forfeit: null, forfeitPaid: false };
    const updatedWins = [...weeklyWins, entry];
    saveToCloud(scores, history, steals, updatedWins);
    const opponent = person === 'Martin' ? 'Karine' : 'Martin';
    const msg = winner === 'Tie'
      ? `Weekly Showdown ended in a tie, ${totals.martin}–${totals.karine}!`
      : `${winner} won the Weekly Showdown, ${totals.martin}–${totals.karine}! ${winner === 'Martin' ? 'Karine' : 'Martin'} owes a forfeit 😈`;
    notifyOpponent(opponent, '🏆 Weekly Showdown result', msg);
  }, [history, weeklyWins]);

  const saveToCloud = async (newScores, newHistory, newSteals, newWeeklyWins = weeklyWins) => {
    setScores(newScores);
    setHistory(newHistory);
    setSteals(newSteals);
    setWeeklyWins(newWeeklyWins);
    try {
      await setDoc(challengeDocRef, {
        scores: newScores,
        history: newHistory,
        steals: newSteals,
        weeklyWins: newWeeklyWins
      });
    } catch (err) {
      console.error('Failed to save to cloud:', err);
    }
  };

  const nowObj = new Date();
  const dayOfWeek = nowObj.getDay();
  const currentHour = nowObj.getHours();
  const todayDateStr = nowObj.toISOString().split('T')[0];
  const isStealWindow = (dayOfWeek === 3 || dayOfWeek === 0) && currentHour === 12;
  const stealKey = `${todayDateStr}-${dayOfWeek === 3 ? 'Wed' : 'Sun'}`;
  const stealClaimedBy = steals[stealKey];

  const triggerAnimation = (who) => {
    setAnimateScore(who);
    setTimeout(() => setAnimateScore(null), 600);
  };

  const logReps = (who, count, label, isSteal = false) => {
    const num = Number(count);
    if (!num || num <= 0) return;

    const updatedScores = { ...scores, [who]: scores[who] + num };
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
    const updatedHistory = [entry, ...history];

    // Taking the lead with a log is a win moment — floating hearts.
    const opponent = who === 'Martin' ? 'Karine' : 'Martin';
    if (scores[who] <= scores[opponent] && updatedScores[who] > updatedScores[opponent]) triggerHearts();

    saveToCloud(updatedScores, updatedHistory, steals);
  };

  const claimSteal = (who) => {
    if (stealClaimedBy) return;
    const updatedSteals = { ...steals, [stealKey]: who };
    const opponent = who === 'Martin' ? 'Karine' : 'Martin';
    const updatedScores = {
      ...scores,
      [who]: scores[who] + 50,
      [opponent]: Math.max(0, scores[opponent] - 50)
    };
    triggerAnimation(who);

    const now = new Date();
    const entry = {
      id: Date.now(),
      person: who,
      reps: 50,
      label: '⚡ 12PM Rep Steal (+50 / -50)',
      isSteal: true,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hour: now.getHours()
    };
    const updatedHistory = [entry, ...history];

    triggerHearts();
    saveToCloud(updatedScores, updatedHistory, updatedSteals);
    notifyOpponent(opponent, `⚡ ${who} stole 50 reps!`, `${who} claimed the Rep Steal — +50 for them, -50 for you!`);
  };

  const undoLast = () => {
    if (history.length === 0) return;
    const [last, ...rest] = history;
    const updatedScores = {
      ...scores,
      [last.person]: Math.max(0, scores[last.person] - last.reps)
    };
    saveToCloud(updatedScores, rest, steals);
  };

  const martinReps = scores.Martin;
  const karineReps = scores.Karine;
  const totalReps = martinReps + karineReps;
  const martinPct = totalReps === 0 ? 50 : Math.round((martinReps / totalReps) * 100);

  const martinRank = getRank(martinReps);
  const karineRank = getRank(karineReps);
  const streaks = computeStreaks(history);
  const unlockedTrophies = TROPHIES.filter(t => t.check(martinReps, karineReps, history, streaks, weeklyWins));

  // Weekly Showdown (Monday–Sunday)
  const thisWeekStart = getMondayStr(todayDateStr);
  const thisWeekEnd = addDaysStr(thisWeekStart, 6);
  const weekTotals = computeWeekTotals(history, thisWeekStart);
  const weekLeader = weekTotals.martin > weekTotals.karine ? 'Martin' : weekTotals.karine > weekTotals.martin ? 'Karine' : null;
  const daysLeftInWeek = 6 - ((dayOfWeek + 6) % 7);
  const martinWeekWins = weeklyWins.filter(w => w.winner === 'Martin').length;
  const karineWeekWins = weeklyWins.filter(w => w.winner === 'Karine').length;
  const latestWin = weeklyWins.length > 0 ? [...weeklyWins].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0] : null;

  // Daily totals for the current week, for the bar chart
  const weekDaily = Array.from({ length: 7 }, (_, i) => {
    const ds = addDaysStr(thisWeekStart, i);
    const dayLogs = history.filter(h => h.date === ds);
    return {
      dateStr: ds,
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      martin: dayLogs.filter(l => l.person === 'Martin').reduce((a, b) => a + b.reps, 0),
      karine: dayLogs.filter(l => l.person === 'Karine').reduce((a, b) => a + b.reps, 0),
    };
  });
  const weekMax = Math.max(1, ...weekDaily.flatMap(d => [d.martin, d.karine]));

  // Challenge data — all computed live from the history log
  const todayLogs = history.filter(h => h.date === todayDateStr);
  const todayTotals = {
    Martin: todayLogs.filter(l => l.person === 'Martin').reduce((a, b) => a + b.reps, 0),
    Karine: todayLogs.filter(l => l.person === 'Karine').reduce((a, b) => a + b.reps, 0),
  };
  const weekDaysLogged = {
    Martin: new Set(history.filter(h => h.person === 'Martin' && h.date >= thisWeekStart && h.date <= thisWeekEnd).map(h => h.date)).size,
    Karine: new Set(history.filter(h => h.person === 'Karine' && h.date >= thisWeekStart && h.date <= thisWeekEnd).map(h => h.date)).size,
  };
  // Who first reached `target` reps in the given entries (chronological)
  const firstToReach = (entries, target) => {
    const totals = { Martin: 0, Karine: 0 };
    for (const e of [...entries].sort((a, b) => a.id - b.id)) {
      totals[e.person] += e.reps;
      if (totals[e.person] >= target) return e.person;
    }
    return null;
  };
  const dashWinner = firstToReach(todayLogs, 50);
  const week500Winner = firstToReach(history.filter(h => h.date >= thisWeekStart && h.date <= thisWeekEnd), 500);
  const weekLogs = history.filter(h => h.date >= thisWeekStart && h.date <= thisWeekEnd);
  const sprint100Winner = firstToReach(todayLogs, 100);
  const week1000Winner = firstToReach(weekLogs, 1000);
  const earlyCount = {
    Martin: weekLogs.filter(l => l.person === 'Martin' && new Date(l.id).getHours() < 9).length,
    Karine: weekLogs.filter(l => l.person === 'Karine' && new Date(l.id).getHours() < 9).length,
  };
  const nightCount = {
    Martin: weekLogs.filter(l => l.person === 'Martin' && new Date(l.id).getHours() >= 22).length,
    Karine: weekLogs.filter(l => l.person === 'Karine' && new Date(l.id).getHours() >= 22).length,
  };
  const biggestSession = {
    Martin: Math.max(0, ...weekLogs.filter(l => l.person === 'Martin').map(l => l.reps)),
    Karine: Math.max(0, ...weekLogs.filter(l => l.person === 'Karine').map(l => l.reps)),
  };
  const satStr = addDaysStr(thisWeekStart, 5);
  const sunStr = addDaysStr(thisWeekStart, 6);
  const weekendTotals = {
    Martin: weekLogs.filter(l => l.person === 'Martin' && (l.date === satStr || l.date === sunStr)).reduce((a, b) => a + b.reps, 0),
    Karine: weekLogs.filter(l => l.person === 'Karine' && (l.date === satStr || l.date === sunStr)).reduce((a, b) => a + b.reps, 0),
  };
  const lastWeekStart = addDaysStr(thisWeekStart, -7);
  const lastWeekEnd = addDaysStr(thisWeekStart, -1);
  const lastWeekTotals = {
    Martin: history.filter(h => h.person === 'Martin' && h.date >= lastWeekStart && h.date <= lastWeekEnd).reduce((a, b) => a + b.reps, 0),
    Karine: history.filter(h => h.person === 'Karine' && h.date >= lastWeekStart && h.date <= lastWeekEnd).reduce((a, b) => a + b.reps, 0),
  };
  const martinWeekDaySet = new Set(weekLogs.filter(l => l.person === 'Martin').map(l => l.date));
  const karineWeekDaySet = new Set(weekLogs.filter(l => l.person === 'Karine').map(l => l.date));
  const tagTeamDays = [...martinWeekDaySet].filter(d => karineWeekDaySet.has(d)).length;

  // One progress row inside a challenge card
  const progressRow = (color, label, value, target) => (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '3px' }}>
        <span style={{ color }}>{label}</span>
        <span style={{ color: '#cbd5e1' }}>{value} / {target}</span>
      </div>
      <div style={{ height: '8px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (value / target) * 100)}%`, background: color, borderRadius: '99px', transition: 'width 0.5s ease-in-out' }} />
      </div>
    </div>
  );

  // Update one weekly result (set forfeit / mark forfeit paid) and save it
  const updateWeeklyWin = (weekStart, patch) => {
    const updated = weeklyWins.map(w => w.weekStart === weekStart ? { ...w, ...patch } : w);
    saveToCloud(scores, history, steals, updated);
  };

  // Milestone celebration: when a new trophy is unlocked or a player ranks
  // up, a picture pops up for a few seconds — Alley for Martin, Johnny
  // Depp for Karine. Fires for milestones earned on this phone or synced
  // in from the other player's phone.
  const prevUnlockedIdsRef = useRef(null);
  const prevRanksRef = useRef(null);
  const celebrateTimerRef = useRef(null);
  const heartsTimerRef = useRef(null);
  // Random picture for a celebration: Alley for Martin, Johnny Depp for Karine
  const celebrationPic = (who) => {
    const pics = who === 'Martin' ? ALLEY_PICS : JOHNNY_PICS;
    return pics[Math.floor(Math.random() * pics.length)];
  };
  const showCelebration = (c) => {
    setCelebration(c);
    if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    celebrateTimerRef.current = setTimeout(() => setCelebration(null), 5000);
  };
  // Floating hearts burst for win moments (taking the lead, claiming a steal)
  const triggerHearts = () => {
    setHeartsKey(k => k + 1);
    if (heartsTimerRef.current) clearTimeout(heartsTimerRef.current);
    heartsTimerRef.current = setTimeout(() => setHeartsKey(0), 2500);
  };

  // True when the player is behind by more than 50% on total reps
  // (their total is less than half of the opponent's).
  const isBehindByHalf = (mine, theirs) => theirs > 0 && mine < theirs / 2;

  // Alley pops up for Martin; Johnny Depp pops up for Karine
  const showMotivation = () => {
    setMotivation(MOTIVATION_LINES[Math.floor(Math.random() * MOTIVATION_LINES.length)]);
    setMotivationPic(ALLEY_PICS[Math.floor(Math.random() * ALLEY_PICS.length)]);
  };
  const showKarineMotivation = () => {
    setMotivation(KARINE_MOTIVATION_LINES[Math.floor(Math.random() * KARINE_MOTIVATION_LINES.length)]);
    setMotivationPic(JOHNNY_PICS[Math.floor(Math.random() * JOHNNY_PICS.length)]);
  };

  // Motivation pop-up: checked at noon and at 6 PM (local time). When the
  // player is behind by more than 50% on total reps, the pop-up shows —
  // at most once per window per day. The timer also catches the moment
  // when the app is already open as noon / 6 PM arrives.
  const checkMotivation = () => {
    const now = new Date();
    const hour = now.getHours();
    const slot = hour === 12 ? 'noon' : hour === 18 ? '18' : null;
    if (!slot) return;
    const mine = person === 'Martin' ? scores.Martin : scores.Karine;
    const theirs = person === 'Martin' ? scores.Karine : scores.Martin;
    if (!isBehindByHalf(mine, theirs)) return;
    const key = person === 'Martin' ? 'alleyMotivationLastShown' : 'johnnyMotivationLastShown';
    const today = now.toISOString().split('T')[0];
    if (localStorage.getItem(key) === `${today}-${slot}`) return;
    localStorage.setItem(key, `${today}-${slot}`);
    if (person === 'Martin') showMotivation();
    else showKarineMotivation();
  };
  useEffect(() => {
    checkMotivation();
    const timer = setInterval(checkMotivation, 60000);
    return () => clearInterval(timer);
  }, [scores, person]);
  useEffect(() => {
    const ids = unlockedTrophies.map(t => t.id);
    if (prevUnlockedIdsRef.current === null) {
      prevUnlockedIdsRef.current = ids;
      prevRanksRef.current = { Martin: martinRank.title, Karine: karineRank.title };
      return;
    }
    const newOnes = unlockedTrophies.filter(t => !prevUnlockedIdsRef.current.includes(t.id));
    prevUnlockedIdsRef.current = ids;
    if (newOnes.length > 0) {
      const t = newOnes[0];
      showCelebration({ pic: celebrationPic(person), title: `🎉 New trophy: ${t.title}!`, subtitle: t.desc });
      return;
    }
    const prevRanks = prevRanksRef.current || {};
    prevRanksRef.current = { Martin: martinRank.title, Karine: karineRank.title };
    if (prevRanks.Martin && prevRanks.Martin !== martinRank.title) {
      showCelebration({ pic: celebrationPic('Martin'), title: '🎉 Martin ranked up!', subtitle: `Now ${martinRank.title}` });
    } else if (prevRanks.Karine && prevRanks.Karine !== karineRank.title) {
      showCelebration({ pic: celebrationPic('Karine'), title: '🎉 Karine ranked up!', subtitle: `Now ${karineRank.title}` });
    }
  }, [unlockedTrophies, martinRank.title, karineRank.title]);

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
        * { box-sizing: border-box; }
        @keyframes pulseScore {
          0% { transform: scale(1); }
          50% { transform: scale(1.06); filter: brightness(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes flagSlide {
          0% { transform: translate(-50%, -50%) scale(0.9); }
          50% { transform: translate(-50%, -50%) scale(1.2) rotate(10deg); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes danceMove {
          0%, 100% { transform: translateY(0) rotate(-10deg); }
          25% { transform: translateY(-16px) rotate(10deg) scale(1.08); }
          50% { transform: translateY(0) rotate(-10deg); }
          75% { transform: translateY(-16px) rotate(10deg) scale(1.08); }
        }
        @keyframes floatHeart {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-60px) scale(1.2); opacity: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1) rotate(-2deg); filter: brightness(1); }
          25% { transform: scale(1.15) rotate(2deg); filter: brightness(1.25); }
          50% { transform: scale(0.95) rotate(-3deg); filter: brightness(0.95); }
          75% { transform: scale(1.12) rotate(3deg); filter: brightness(1.2); }
        }
        .pulse-martin { animation: pulseScore 0.5s ease-in-out; }
        .pulse-karine { animation: pulseScore 0.5s ease-in-out; }
        .flag-anim { animation: flagSlide 0.5s ease-in-out; }
      `}</style>

      <div style={s.container}>
        <header style={s.header}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={s.badge}>COUPLES REPS ARENA</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isOneSignalConfigured() && notifState !== 'unsupported' && (
                <button
                  onClick={async () => {
                    if (notifState !== 'on') {
                      const ok = await enableNotifications(person);
                      setNotifState(ok ? 'on' : 'denied');
                    }
                  }}
                  disabled={notifState === 'on'}
                  style={{ background: notifState === 'on' ? 'rgba(74,222,128,0.15)' : notifState === 'denied' ? 'rgba(248,113,113,0.12)' : 'rgba(56,189,248,0.12)', color: notifState === 'on' ? '#4ade80' : notifState === 'denied' ? '#f87171' : '#38bdf8', border: '1px solid #1e293b', borderRadius: '99px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: notifState === 'on' ? 'default' : 'pointer' }}
                >
                  {notifState === 'on' ? '🔔 Notifications on' : notifState === 'denied' ? '🔕 Notifications blocked' : '🔔 Enable notifications'}
                </button>
              )}
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: syncStatus.includes('Live') ? '#4ade80' : '#fbbf24' }}>{syncStatus}</span>
            </span>
          </div>
          <div>
            <h1 style={s.title}>Martin vs. Karine</h1>
            <p style={s.subtitle}>Pure Repetition Counter &amp; Showdown</p>
          </div>
          <div style={s.scoreCardsRow}>
            <div style={{ ...s.playerCard, borderColor: martinReps >= karineReps ? '#38bdf8' : '#1e293b' }} className={animateScore === 'Martin' ? 'pulse-martin' : ''}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}>Martin {martinReps > karineReps && '👑'}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: martinRank.color, background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '4px' }}>{martinRank.title}</span>
              </div>
              <div style={s.scoreNum}>{martinReps.toLocaleString()} <span style={s.unit}>reps</span></div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '6px', padding: '5px 8px', borderRadius: '8px', background: streaks.Martin.current > 0 ? 'rgba(251,146,60,0.15)' : 'rgba(100,116,139,0.12)', border: `1px solid ${streaks.Martin.current > 0 ? 'rgba(251,146,60,0.45)' : '#1e293b'}`, color: streaks.Martin.current > 0 ? '#fdba74' : '#94a3b8' }}>
                {streaks.Martin.current > 0 ? (<><span style={{ display: 'inline-block', animation: 'flameFlicker 1.2s ease-in-out infinite' }}>🔥</span> {streaks.Martin.current}-day streak</>) : 'No streak yet — log today!'}
                {streaks.Martin.best > 0 && <span style={{ color: '#64748b', fontWeight: 600 }}> · best {streaks.Martin.best}</span>}
                {streaks.Martin.current > 0 && !streaks.Martin.loggedToday && <span style={{ color: '#fbbf24' }}> · log today to keep it alive!</span>}
                {streaks.Martin.loggedToday && <span style={{ color: '#4ade80' }}> · ✓ today</span>}
                {streaks.Martin.current > 0 && <span style={{ color: '#7dd3fc' }}> · {streaks.Martin.freezeAvailableThisWeek ? '❄️ Freeze ready' : '❄️ Freeze used'}</span>}
              </div>
            </div>
            <div style={{ ...s.playerCard, borderColor: karineReps > martinReps ? '#f472b6' : '#1e293b' }} className={animateScore === 'Karine' ? 'pulse-karine' : ''}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ color: '#f472b6', fontWeight: 700, fontSize: '0.9rem' }}>Karine {karineReps > martinReps && '👑'}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: karineRank.color, background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '4px' }}>{karineRank.title}</span>
              </div>
              <div style={s.scoreNum}>{karineReps.toLocaleString()} <span style={s.unit}>reps</span></div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '6px', padding: '5px 8px', borderRadius: '8px', background: streaks.Karine.current > 0 ? 'rgba(251,146,60,0.15)' : 'rgba(100,116,139,0.12)', border: `1px solid ${streaks.Karine.current > 0 ? 'rgba(251,146,60,0.45)' : '#1e293b'}`, color: streaks.Karine.current > 0 ? '#fdba74' : '#94a3b8' }}>
                {streaks.Karine.current > 0 ? (<><span style={{ display: 'inline-block', animation: 'flameFlicker 1.2s ease-in-out infinite' }}>🔥</span> {streaks.Karine.current}-day streak</>) : 'No streak yet — log today!'}
                {streaks.Karine.best > 0 && <span style={{ color: '#64748b', fontWeight: 600 }}> · best {streaks.Karine.best}</span>}
                {streaks.Karine.current > 0 && !streaks.Karine.loggedToday && <span style={{ color: '#fbbf24' }}> · log today to keep it alive!</span>}
                {streaks.Karine.loggedToday && <span style={{ color: '#4ade80' }}> · ✓ today</span>}
                {streaks.Karine.current > 0 && <span style={{ color: '#7dd3fc' }}> · {streaks.Karine.freezeAvailableThisWeek ? '❄️ Freeze ready' : '❄️ Freeze used'}</span>}
              </div>
            </div>
          </div>
        </header>

        {dailyTaunt && (
          <div style={s.tauntBanner}>
            <span style={{ fontSize: '1.1rem' }}>📣</span> <div>{dailyTaunt}</div>
          </div>
        )}

        <div style={{ ...s.stealBanner, borderColor: isStealWindow ? '#f59e0b' : '#334155', background: isStealWindow ? 'rgba(245, 158, 11, 0.15)' : '#111827' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <div>
              <strong style={{ color: '#fbbf24', display: 'block', fontSize: '0.95rem' }}>Wed &amp; Sun 12:00 PM Rep Steal</strong>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {stealClaimedBy ? `Claimed today by ${stealClaimedBy}! 🦹‍♂️` : isStealWindow ? 'Active now! Claim 50 reps and steal!' : 'Opens Wed & Sun at 12:00 PM.'}
              </span>
            </div>
          </div>
          {!stealClaimedBy && (
            <button
              onClick={() => claimSteal(person)}
              style={{ ...s.primaryBtn, background: person === 'Martin' ? '#0284c7' : '#db2777', fontSize: '0.8rem', padding: '8px 12px', marginTop: '6px' }}
            >
              Claim Steal as {person} (+50)
            </button>
          )}
        </div>

        <div style={s.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#94a3b8' }}>🪢 Live Tug-of-War Bar</span>
            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#f8fafc' }}>
              {martinReps === karineReps ? 'Tie game!' : martinReps > karineReps ? `Martin leads (+${(martinReps - karineReps).toLocaleString()})` : `Karine leads (+${(karineReps - martinReps).toLocaleString()})`}
            </span>
          </div>
          <div style={s.tugOuter}>
            <div style={{ ...s.tugM, width: `${martinPct}%`, transition: 'width 0.5s ease-in-out' }}>{martinPct > 15 && `M: ${martinPct}%`}</div>
            <div style={s.tugFlag} className="flag-anim">🚩</div>
            <div style={{ ...s.tugK, width: `${100 - martinPct}%`, transition: 'width 0.5s ease-in-out' }}>{100 - martinPct > 15 && `K: ${100 - martinPct}%`}</div>
          </div>
        </div>

        <div style={s.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>🏆 Weekly Showdown</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Week of {fmtShortDate(thisWeekStart)} – {fmtShortDate(thisWeekEnd)} · winner crowned Monday</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, marginBottom: '6px' }}>
            <span style={{ color: '#38bdf8' }}>Martin: {weekTotals.martin.toLocaleString()}</span>
            <span style={{ color: '#f472b6' }}>Karine: {weekTotals.karine.toLocaleString()}</span>
          </div>
          <div style={s.tugOuter}>
            <div style={{ ...s.tugM, width: `${weekTotals.martin + weekTotals.karine === 0 ? 50 : Math.round((weekTotals.martin / (weekTotals.martin + weekTotals.karine)) * 100)}%`, transition: 'width 0.5s ease-in-out' }} />
            <div style={{ ...s.tugK, width: `${weekTotals.martin + weekTotals.karine === 0 ? 50 : 100 - Math.round((weekTotals.martin / (weekTotals.martin + weekTotals.karine)) * 100)}%`, transition: 'width 0.5s ease-in-out' }} />
          </div>
          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '8px' }}>
            {weekLeader ? `${weekLeader} leads this week` : 'Tied this week'} · {daysLeftInWeek === 0 ? 'last day — ends tonight!' : `${daysLeftInWeek} day${daysLeftInWeek === 1 ? '' : 's'} left`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>This week's loser owes the winner a forfeit 😈</div>
          {weeklyWins.length > 0 && (
            <div style={{ marginTop: '10px', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fbbf24', marginBottom: '4px' }}>👑 Hall of Champions — Martin {martinWeekWins} · Karine {karineWeekWins}</div>
              {[...weeklyWins].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 5).map(w => (
                <div key={w.weekStart} style={{ fontSize: '0.78rem', color: '#cbd5e1', padding: '2px 0' }}>
                  Week of {fmtShortDate(w.weekStart)}: <strong style={{ color: w.winner === 'Martin' ? '#38bdf8' : w.winner === 'Karine' ? '#f472b6' : '#94a3b8' }}>{w.winner === 'Tie' ? 'Tie' : `${w.winner} won`}</strong> ({w.martin}–{w.karine})
                </div>
              ))}
            </div>
          )}
          {latestWin && latestWin.winner !== 'Tie' && (
            <div style={{ marginTop: '10px', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f472b6', marginBottom: '6px' }}>💸 Forfeit — week of {fmtShortDate(latestWin.weekStart)}</div>
              {!latestWin.forfeit ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <select value={forfeitPick} onChange={e => setForfeitPick(e.target.value)} style={s.input}>
                    {FORFEIT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    <option value="__custom">Custom…</option>
                  </select>
                  {forfeitPick === '__custom' && (
                    <input type="text" placeholder="Type the forfeit…" value={forfeitCustom} onChange={e => setForfeitCustom(e.target.value)} style={s.input} />
                  )}
                  <button
                    onClick={() => {
                      const f = forfeitPick === '__custom' ? forfeitCustom.trim() : forfeitPick;
                      if (!f) return;
                      updateWeeklyWin(latestWin.weekStart, { forfeit: f });
                      setForfeitCustom('');
                    }}
                    style={{ ...s.primaryBtn, background: '#db2777', fontSize: '0.85rem', padding: '8px 12px' }}
                  >
                    Set forfeit for {latestWin.winner === 'Martin' ? 'Karine' : 'Martin'}
                  </button>
                </div>
              ) : !latestWin.forfeitPaid ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{latestWin.winner === 'Martin' ? 'Karine' : 'Martin'} owes: <strong style={{ color: '#f8fafc' }}>{latestWin.forfeit}</strong></span>
                  <button onClick={() => updateWeeklyWin(latestWin.weekStart, { forfeitPaid: true })} style={{ ...s.smallBtn, color: '#4ade80', borderColor: '#4ade80' }}>✓ Paid</button>
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 700 }}>✓ Forfeit settled: {latestWin.forfeit}</div>
              )}
            </div>
          )}
        </div>

        <div style={s.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>📊 This Week</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              <span style={{ color: '#38bdf8' }}>■ Martin</span> · <span style={{ color: '#f472b6' }}>■ Karine</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '4px', height: '118px' }}>
            {weekDaily.map(d => (
              <div key={d.dateStr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', background: d.dateStr === todayDateStr ? 'rgba(56,189,248,0.08)' : 'transparent', borderRadius: '8px', padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '88px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    {d.martin > 0 && <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#38bdf8' }}>{d.martin}</span>}
                    <div style={{ width: '12px', height: `${Math.max(3, (d.martin / weekMax) * 72)}px`, background: d.martin > 0 ? '#0284c7' : '#1e293b', borderRadius: '3px 3px 0 0' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    {d.karine > 0 && <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#f472b6' }}>{d.karine}</span>}
                    <div style={{ width: '12px', height: `${Math.max(3, (d.karine / weekMax) * 72)}px`, background: d.karine > 0 ? '#db2777' : '#1e293b', borderRadius: '3px 3px 0 0' }} />
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: d.dateStr === todayDateStr ? 800 : 600, color: d.dateStr === todayDateStr ? '#f8fafc' : '#94a3b8', marginTop: '4px' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={s.nav}>
          <div style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'space-between' }}>
            <button onClick={() => setTab('arena')} style={{ ...s.navBtn, background: tab === 'arena' ? '#1e293b' : 'transparent', color: tab === 'arena' ? '#38bdf8' : '#94a3b8', flex: 1 }}>💪 Logger</button>
            <button onClick={() => setTab('cal')} style={{ ...s.navBtn, background: tab === 'cal' ? '#1e293b' : 'transparent', color: tab === 'cal' ? '#38bdf8' : '#94a3b8', flex: 1 }}>🗓️ Calendar</button>
            <button onClick={() => setTab('trophies')} style={{ ...s.navBtn, background: tab === 'trophies' ? '#1e293b' : 'transparent', color: tab === 'trophies' ? '#38bdf8' : '#94a3b8', flex: 1 }}>🏆 Trophies</button>
            <button onClick={() => setTab('challenges')} style={{ ...s.navBtn, background: tab === 'challenges' ? '#1e293b' : 'transparent', color: tab === 'challenges' ? '#38bdf8' : '#94a3b8', flex: 1 }}>🎯 Challenges</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Active Logger:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPerson('Martin')} style={{ ...s.toggleBtn, background: person === 'Martin' ? '#0284c7' : '#1e293b' }}>Martin</button>
              <button onClick={() => setPerson('Karine')} style={{ ...s.toggleBtn, background: person === 'Karine' ? '#db2777' : '#1e293b' }}>Karine</button>
            </div>
          </div>
        </div>

        {tab === 'arena' && (
          <div style={s.grid2}>
            <div style={s.panel}>
              <h3 style={{ marginTop: 0, marginBottom: '6px', fontSize: '1.1rem' }}>Log Reps for <span style={{ color: person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{person}</span></h3>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '14px' }}>Tap a quick add button:</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
                <button onClick={() => logReps(person, 10, 'Quick Set')} style={s.quickBtn}>⚡ +10 Reps</button>
                <button onClick={() => logReps(person, 25, 'Power Set')} style={s.quickBtn}>🔥 +25 Reps</button>
                <button onClick={() => logReps(person, 50, 'Beast Set')} style={s.quickBtn}>🦍 +50 Reps</button>
                <button onClick={() => logReps(person, 100, 'Century Set')} style={s.quickBtn}>👑 +100 Reps</button>
              </div>

            </div>

            <div style={s.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📋 Rep Feed</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {history.length > 0 && <button onClick={undoLast} style={s.smallBtn}>Undo</button>}
                  {!resetConfirm ? (
                    <button onClick={() => setResetConfirm(true)} style={{ ...s.smallBtn, color: '#f87171' }}>Reset</button>
                  ) : (
                    <button onClick={() => { saveToCloud({ Martin: 0, Karine: 0 }, [], {}); setResetConfirm(false); }} style={{ ...s.smallBtn, background: '#dc2626', color: '#fff' }}>Confirm</button>
                  )}
                </div>
              </div>

              {history.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No reps logged yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                  {history.slice(0, 10).map(i => (
                    <div key={i.id} style={s.feedItem}>
                      <div>
                        <strong style={{ color: i.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{i.person}</strong> — {i.reps} reps {i.isSteal && <span style={{ color: '#fbbf24', fontWeight: 800 }}>⚡Steal</span>} <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({i.label})</span>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{i.time}</span>
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
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{calDate.toLocaleString('default', { month: 'short', year: 'numeric' })}</h3>
                <button onClick={() => setCalDate(new Date(yr, mo + 1, 1))} style={s.smallBtn}>Next ▶</button>
              </div>

              <div style={s.calGrid}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', paddingBottom: '4px' }}>{d}</div>)}
                {cells.map((c, idx) => {
                  if (!c) return <div key={idx} style={{ height: '72px' }} />;
                  const dayLogs = history.filter(h => h.date === c.dateStr);
                  const mReps = dayLogs.filter(l => l.person === 'Martin').reduce((a, b) => a + b.reps, 0);
                  const kReps = dayLogs.filter(l => l.person === 'Karine').reduce((a, b) => a + b.reps, 0);
                  const isSel = selectedDay === c.dateStr;

                  return (
                    <button
                      key={c.dateStr}
                      onClick={() => setSelectedDay(c.dateStr)}
                      style={{
                        height: '72px',
                        borderRadius: '10px',
                        border: `2px solid ${isSel ? '#fbbf24' : (mReps > 0 || kReps > 0) ? '#334155' : '#1e293b'}`,
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
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px' }}>{c.day}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.62rem', gap: '2px', width: '100%', padding: '0 2px' }}>
                        {mReps > 0 && <div style={{ background: 'rgba(2, 132, 199, 0.3)', color: '#38bdf8', borderRadius: '3px', fontWeight: 800, padding: '1px 0' }}>M:{mReps}</div>}
                        {kReps > 0 && <div style={{ background: 'rgba(219, 39, 119, 0.3)', color: '#f472b6', borderRadius: '3px', fontWeight: 800, padding: '1px 0' }}>K:{kReps}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={s.panel}>
              <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.05rem' }}>Breakdown for {selectedDay}</h3>
              {selectedDayLogs.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No rep sessions recorded on this date.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDayLogs.map(item => (
                    <div key={item.id} style={s.feedItem}>
                      <div>
                        <strong style={{ color: item.person === 'Martin' ? '#38bdf8' : '#f472b6' }}>{item.person}</strong> — {item.reps} reps ({item.label})
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'trophies' && (
          <div style={s.panel}>
            <h3 style={{ marginTop: 0, marginBottom: '4px', fontSize: '1.1rem' }}>🏆 Trophy Room</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '16px' }}>Unlock achievements together as your reps climb!</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {TROPHIES.map(t => {
                const unlocked = t.check(martinReps, karineReps, history, streaks, weeklyWins);
                return (
                  <div key={t.id} style={{ background: '#090d16', border: `2px solid ${unlocked ? '#fbbf24' : '#1e293b'}`, borderRadius: '12px', padding: '12px', textAlign: 'center', opacity: unlocked ? 1 : 0.4 }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '6px' }}>{t.icon}</span>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem' }}>{t.title}</h4>
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>{t.desc}</p>
                    <div style={{ marginTop: '8px', fontSize: '0.68rem', fontWeight: 800, color: unlocked ? '#fbbf24' : '#64748b' }}>
                      {unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'challenges' && (
          <div style={s.panel}>
            <h3 style={{ marginTop: 0, marginBottom: '4px', fontSize: '1.1rem' }}>🎯 Challenges</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '16px' }}>Live races and goals — progress updates as you log. Daily challenges reset at midnight, weekly ones on Monday.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>⚡ Daily Dash</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: dashWinner ? '#fbbf24' : '#94a3b8' }}>{dashWinner ? `🏆 ${dashWinner} won!` : 'In progress'}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>First to 50 reps today takes the day.</p>
                {progressRow('#38bdf8', 'Martin', todayTotals.Martin, 50)}
                {progressRow('#f472b6', 'Karine', todayTotals.Karine, 50)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>💯 Century Day</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (todayTotals.Martin >= 100 || todayTotals.Karine >= 100) ? '#fbbf24' : '#94a3b8' }}>
                    {todayTotals.Martin >= 100 && todayTotals.Karine >= 100 ? '✅ Both did it!' : todayTotals.Martin >= 100 ? '✅ Done by Martin' : todayTotals.Karine >= 100 ? '✅ Done by Karine' : 'In progress'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Hit 100 reps in a single day.</p>
                {progressRow('#38bdf8', 'Martin', todayTotals.Martin, 100)}
                {progressRow('#f472b6', 'Karine', todayTotals.Karine, 100)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🌟 Perfect Week</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (weekDaysLogged.Martin >= 7 || weekDaysLogged.Karine >= 7) ? '#fbbf24' : '#94a3b8' }}>
                    {weekDaysLogged.Martin >= 7 && weekDaysLogged.Karine >= 7 ? '✅ Both did it!' : weekDaysLogged.Martin >= 7 ? '✅ Done by Martin' : weekDaysLogged.Karine >= 7 ? '✅ Done by Karine' : 'In progress'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Log reps every day this week, Monday to Sunday.</p>
                {progressRow('#38bdf8', 'Martin', weekDaysLogged.Martin, 7)}
                {progressRow('#f472b6', 'Karine', weekDaysLogged.Karine, 7)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🚀 Weekly 500</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: week500Winner ? '#fbbf24' : '#94a3b8' }}>{week500Winner ? `🏆 ${week500Winner} won!` : 'In progress'}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>First to 500 reps this week.</p>
                {progressRow('#38bdf8', 'Martin', weekTotals.martin, 500)}
                {progressRow('#f472b6', 'Karine', weekTotals.karine, 500)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>💨 Sprint 100</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: sprint100Winner ? '#fbbf24' : '#94a3b8' }}>{sprint100Winner ? `🏆 ${sprint100Winner} won!` : 'In progress'}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>First to 100 reps today.</p>
                {progressRow('#38bdf8', 'Martin', todayTotals.Martin, 100)}
                {progressRow('#f472b6', 'Karine', todayTotals.Karine, 100)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🏁 Weekly 1,000</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: week1000Winner ? '#fbbf24' : '#94a3b8' }}>{week1000Winner ? `🏆 ${week1000Winner} won!` : 'In progress'}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>First to 1,000 reps this week.</p>
                {progressRow('#38bdf8', 'Martin', weekTotals.martin, 1000)}
                {progressRow('#f472b6', 'Karine', weekTotals.karine, 1000)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🏆 Race to 5,000</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (martinReps >= 5000 || karineReps >= 5000) ? '#fbbf24' : '#94a3b8' }}>
                    {martinReps >= 5000 && karineReps >= 5000 ? (martinReps === karineReps ? 'Tied' : `🏆 ${martinReps > karineReps ? 'Martin' : 'Karine'} won!`) : martinReps >= 5000 ? '🏆 Martin won!' : karineReps >= 5000 ? '🏆 Karine won!' : martinReps === karineReps ? 'Tied' : martinReps > karineReps ? 'Martin leads' : 'Karine leads'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>First to 5,000 total reps, all time. The long game.</p>
                {progressRow('#38bdf8', 'Martin', martinReps, 5000)}
                {progressRow('#f472b6', 'Karine', karineReps, 5000)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🔥 Streak Starter</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (streaks.Martin.current >= 3 || streaks.Karine.current >= 3) ? '#fbbf24' : '#94a3b8' }}>
                    {streaks.Martin.current >= 3 && streaks.Karine.current >= 3 ? '✅ Both did it!' : streaks.Martin.current >= 3 ? '✅ Done by Martin' : streaks.Karine.current >= 3 ? '✅ Done by Karine' : 'In progress'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Build a 3-day logging streak (your weekly freeze can save one missed day).</p>
                {progressRow('#38bdf8', 'Martin', Math.min(streaks.Martin.current, 3), 3)}
                {progressRow('#f472b6', 'Karine', Math.min(streaks.Karine.current, 3), 3)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🌅 Sunrise Club</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24' }}>
                    {earlyCount.Martin === 0 && earlyCount.Karine === 0 ? 'In progress' : earlyCount.Martin === earlyCount.Karine ? 'Tied' : earlyCount.Martin > earlyCount.Karine ? '☀️ Martin leads' : '☀️ Karine leads'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Most sessions logged before 9 AM this week.</p>
                {progressRow('#38bdf8', 'Martin', earlyCount.Martin, 3)}
                {progressRow('#f472b6', 'Karine', earlyCount.Karine, 3)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🦉 Night Owl</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24' }}>
                    {nightCount.Martin === 0 && nightCount.Karine === 0 ? 'In progress' : nightCount.Martin === nightCount.Karine ? 'Tied' : nightCount.Martin > nightCount.Karine ? '🌙 Martin leads' : '🌙 Karine leads'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Most sessions logged after 10 PM this week.</p>
                {progressRow('#38bdf8', 'Martin', nightCount.Martin, 3)}
                {progressRow('#f472b6', 'Karine', nightCount.Karine, 3)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>💪 Biggest Session</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24' }}>
                    {biggestSession.Martin === 0 && biggestSession.Karine === 0 ? 'In progress' : biggestSession.Martin === biggestSession.Karine ? 'Tied' : biggestSession.Martin > biggestSession.Karine ? '💪 Martin leads' : '💪 Karine leads'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Biggest single log this week — one session, most reps.</p>
                {progressRow('#38bdf8', 'Martin', biggestSession.Martin, 50)}
                {progressRow('#f472b6', 'Karine', biggestSession.Karine, 50)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🎉 Weekend Warrior</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24' }}>
                    {weekendTotals.Martin === 0 && weekendTotals.Karine === 0 ? 'In progress' : weekendTotals.Martin === weekendTotals.Karine ? 'Tied' : weekendTotals.Martin > weekendTotals.Karine ? '🎉 Martin leads' : '🎉 Karine leads'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Most reps logged Saturday + Sunday this weekend.</p>
                {progressRow('#38bdf8', 'Martin', weekendTotals.Martin, 150)}
                {progressRow('#f472b6', 'Karine', weekendTotals.Karine, 150)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>📈 Beat Last Week</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (weekTotals.martin >= Math.max(lastWeekTotals.Martin, 50) || weekTotals.karine >= Math.max(lastWeekTotals.Karine, 50)) ? '#fbbf24' : '#94a3b8' }}>
                    {weekTotals.martin >= Math.max(lastWeekTotals.Martin, 50) && weekTotals.karine >= Math.max(lastWeekTotals.Karine, 50) ? '✅ Both did it!' : weekTotals.martin >= Math.max(lastWeekTotals.Martin, 50) ? '✅ Done by Martin' : weekTotals.karine >= Math.max(lastWeekTotals.Karine, 50) ? '✅ Done by Karine' : 'In progress'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Top your own total from last week (last week: Martin {lastWeekTotals.Martin}, Karine {lastWeekTotals.Karine}).</p>
                {progressRow('#38bdf8', 'Martin', weekTotals.martin, Math.max(lastWeekTotals.Martin, 50))}
                {progressRow('#f472b6', 'Karine', weekTotals.karine, Math.max(lastWeekTotals.Karine, 50))}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🤝 Tag Team</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: tagTeamDays >= 7 ? '#fbbf24' : '#94a3b8' }}>{tagTeamDays >= 7 ? '✅ Perfect team week!' : `${tagTeamDays}/7 days together`}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Team challenge: log on the same day. Every shared day counts for both of you.</p>
                {progressRow('#22c55e', 'Together', tagTeamDays, 7)}
              </div>

              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🎯 Combined 1,000</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (weekTotals.martin + weekTotals.karine) >= 1000 ? '#fbbf24' : '#94a3b8' }}>{(weekTotals.martin + weekTotals.karine) >= 1000 ? '✅ 1,000 reached!' : 'In progress'}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>Team challenge: together, reach 1,000 reps this week — or you both lose to the couch.</p>
                {progressRow('linear-gradient(90deg,#0284c7,#db2777)', 'Together', weekTotals.martin + weekTotals.karine, 1000)}
              </div>
            </div>
          </div>
        )}

        {celebration && (
          <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, pointerEvents: 'none', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', left: '-14px', top: '6px', fontSize: '1rem', animation: 'floatHeart 2s ease-out infinite' }}>❤️</span>
              <span style={{ position: 'absolute', right: '-14px', top: '0px', fontSize: '1rem', animation: 'floatHeart 2s ease-out 0.6s infinite' }}>✨</span>
              <span style={{ position: 'absolute', right: '-22px', top: '14px', fontSize: '0.85rem', animation: 'floatHeart 2s ease-out 1.1s infinite' }}>❤️</span>
              {celebration.pic ? (
                <img src={celebration.pic} alt="Celebration" style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '50%', border: '3px solid #fbbf24', boxShadow: '0 0 24px rgba(251,191,36,0.4)', display: 'inline-block', animation: 'popIn 0.4s ease-out' }} />
              ) : (
                <span style={{ fontSize: '3rem', display: 'inline-block', animation: 'danceMove 0.9s ease-in-out infinite' }}>{celebration.emoji}</span>
              )}
            </div>
            <div style={{ background: 'rgba(17,24,39,0.95)', border: '2px solid #fbbf24', borderRadius: '14px', padding: '10px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', animation: 'popIn 0.4s ease-out', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fbbf24' }}>{celebration.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{celebration.subtitle}</div>
            </div>
          </div>
        )}

        {heartsKey > 0 && (
          <div key={heartsKey} style={{ position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 49, pointerEvents: 'none' }}>
            {['❤️', '💕', '❤️', '💖', '❤️'].map((h, i) => (
              <span key={i} style={{ display: 'inline-block', fontSize: i % 2 ? '1.2rem' : '1.6rem', margin: '0 4px', animation: `floatHeart 2s ease-out ${i * 0.15}s forwards` }}>{h}</span>
            ))}
          </div>
        )}

        {motivation && (
          <div onClick={() => setMotivation(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'linear-gradient(180deg, rgba(9,13,22,0.97), rgba(30,27,75,0.97))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', cursor: 'pointer' }}>
            <img src={motivationPic} alt="Motivation" style={{ width: 'min(72vw, 320px)', height: 'min(72vw, 320px)', objectFit: 'cover', borderRadius: '50%', border: '4px solid #fbbf24', boxShadow: '0 0 60px rgba(251,191,36,0.35)', marginBottom: '20px', animation: 'popIn 0.4s ease-out' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '2px', color: '#fbbf24', textTransform: 'uppercase', marginBottom: '8px' }}>Alley says</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.4, maxWidth: '420px', marginBottom: '24px' }}>{motivation}</div>
            <button onClick={() => setMotivation(null)} style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '99px', padding: '12px 28px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer' }}>Let's go! 💪</button>
            <div style={{ marginTop: '14px', fontSize: '0.75rem', color: '#94a3b8' }}>Tap anywhere to close</div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#090d16', backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #090d16 70%)', color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '12px 10px', boxSizing: 'border-box' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' },
  badge: { fontSize: '0.65rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', padding: '3px 8px', borderRadius: '99px', letterSpacing: '0.05em' },
  title: { fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 2px 0', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '0.82rem', color: '#94a3b8', margin: 0 },
  scoreCardsRow: { display: 'flex', gap: '8px', width: '100%', justifyContent: 'space-between' },
  playerCard: { background: '#111827', border: '2px solid', borderRadius: '12px', padding: '10px 12px', flex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  scoreNum: { fontSize: '1.25rem', fontWeight: 800 },
  unit: { fontSize: '0.7rem', color: '#64748b', fontWeight: 600 },
  tauntBanner: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#fde047', padding: '10px 12px', borderRadius: '12px', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 500 },
  stealBanner: { display: 'flex', flexDirection: 'column', gap: '8px', border: '2px solid', borderRadius: '14px', padding: '12px 14px', marginBottom: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  panel: { background: '#111827', border: '1px solid #1e293b', borderRadius: '14px', padding: '14px', marginBottom: '14px', boxShadow: '0 6px 16px rgba(0,0,0,0.4)' },
  tugOuter: { display: 'flex', height: '28px', background: '#1e293b', borderRadius: '99px', position: 'relative', overflow: 'hidden', border: '1px solid #334155' },
  tugM: { background: '#0284c7', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '10px', fontSize: '0.7rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' },
  tugK: { background: '#db2777', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px', fontSize: '0.7rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' },
  tugFlag: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, fontSize: '1rem' },
  nav: { display: 'flex', flexDirection: 'column', gap: '10px', background: '#111827', padding: '10px 12px', borderRadius: '12px', border: '1px solid #1e293b', marginBottom: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' },
  navBtn: { border: 'none', padding: '8px 10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' },
  toggleBtn: { border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontSize: '0.82rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr', gap: '14px' },
  quickBtn: { background: '#090d16', border: '1px solid #334155', color: '#f8fafc', padding: '10px 8px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#090d16', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%' },
  primaryBtn: { padding: '10px 16px', borderRadius: '8px', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 3px 10px rgba(0,0,0,0.3)' },
  feedItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #1e293b' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
  smallBtn: { background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }
};
