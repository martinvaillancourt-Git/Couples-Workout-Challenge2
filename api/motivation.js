// Vercel serverless function: all scheduled pushes — the motivation push
// and the evening reminder.
//
// WHY ONE FUNCTION: Vercel Hobby allows at most 2 cron jobs, each firing
// at most once per day. The old vercel.json had multi-slot schedules
// ("0 22,23 * * *" and "0 16,17,22,23 * * *") and the Nov 19 deploy
// failed validation with: "Hobby accounts are limited to daily cron jobs."
// So vercel.json now has exactly two once-daily triggers, both hitting
// this function, which tells them apart by the Toronto hour:
//   17:00 UTC -> noon Toronto in winter (EST), 1 PM in summer (EDT)
//   23:00 UTC -> 6 PM Toronto in winter (EST), 7 PM in summer (EDT)
// The 1-hour summer drift is the Hobby trade-off (Pro would allow the
// exact hours year-round). The slot mapping below (12/13 -> noon,
// 18/19 -> evening) covers both seasons, and each slot is deduped in
// the Firestore doc so a second trigger the same day does nothing.
// (The earlier setup used two separate once-daily entries per UTC hour
// for EST/EDT coverage; that needed 6 entries once motivation joined,
// over the 2-job limit.)
//
// Noon slot: pushes whichever player is behind by more than 50% on
// total reps (same rule as the in-app motivation pop-up), with a random
// motivation line + picture. Evening slot: the same behind-check, PLUS
// the reminder for players who haven't logged today (with a streak
// warning if one is live).
//
// Security: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`;
// when CRON_SECRET is set, any non-cron call is rejected — except
// ?dryRun=1, which is read-only (reports what would be sent, sends
// nothing) so the check can be tested by hand.
//
// The Firebase web API key below is public (it ships in the client code);
// the Firestore doc is read the same way the app reads it. The
// motivation lines mirror MOTIVATION_LINES / KARINE_MOTIVATION_LINES
// in src/App.jsx — keep them in sync.

const FIREBASE_API_KEY = 'AIzaSyDHDC1i4szCTjII6s6WS2ejt1kCr9hoH_Y';
const PROJECT_ID = 'couples-reps-arena';
const DOC_PATH = 'challenges/martin_karine_arena';
const ONESIGNAL_APP_ID = '59358996-6bd7-4ac5-b9b3-4edf22d8f85e';
const SITE_URL = 'https://couples-workout-challenge2.vercel.app/';

import { motivationPicFor, pushIconFor as ICON_FOR } from './motivation-pics.js';

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${DOC_PATH}`;

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

const KARINE_MOTIVATION_LINES = [
  "You've got this, Karine. One more set and you're ahead of Martin.",
  "Martin isn't going to beat himself. Get moving.",
  'Fifty reps a day keeps the couch away. Go!',
  "Your streak is alive. Don't let it die today.",
  "Every rep you log is a rep Martin didn't.",
  "Martin's watching. Show him who's boss this week.",
  'No excuses — ten minutes is a full set. Go earn it.',
  "You're one good session from taking the lead. Take it.",
  'Remember the forfeit. Somebody owes somebody. Make it him.',
  "Stronger every day. That's the whole deal. Now go.",
  'Push-ups. Squats. Glute bridges. Pick one and start.',
  "The week won't win itself. Log something.",
];

// Toronto date + hour (noon and evening are Toronto-time things)
function torontoParts() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

// True when the player is behind by more than 50% on total reps
// (their total is less than half of the opponent's).
const isBehindByHalf = (mine, theirs) => theirs > 0 && mine < theirs / 2;

// Consecutive days logged ending yesterday (a streak still alive today)
function streakEndingYesterday(dateSet, todayStr, restSet = new Set()) {
  let n = 0;
  const d = new Date(todayStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  for (;;) {
    const ds = d.toISOString().split('T')[0];
    if (dateSet.has(ds)) n++;
    else if (!restSet.has(ds)) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

async function sendPush(externalId, title, body, type) {
  const pic = motivationPicFor(externalId);
  // Tapping a notification opens the app with the message in the URL, so
  // the app can show it as a banner instead of the message vanishing
  // with the notification (reported 2026-11-20). `data` carries the same
  // message for the in-page click listener (app already open).
  const url = `${SITE_URL}?notif=${type}&title=${encodeURIComponent(title)}&msg=${encodeURIComponent(body)}`;
  const r = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [externalId],
      headings: { en: title },
      contents: { en: body },
      url,
      data: { notif: type, title, msg: body },
      chrome_web_image: pic,
      big_picture: pic,
      chrome_web_icon: ICON_FOR(externalId),
      large_icon: ICON_FOR(externalId),
    }),
  });
  return r.ok;
}

export default async function handler(req, res) {
  const { date: today, hour } = torontoParts();
  const dryRun = req.query.dryRun === '1';

  if (process.env.CRON_SECRET && !dryRun) {
    if ((req.headers.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Noon slot is Toronto hour 12 (EST) or 13 (EDT); evening slot is 18
  // (EST) or 19 (EDT). Any other hour is a no-op (unless dryRun).
  const slot = hour === 12 || hour === 13 ? 'noon' : hour === 18 || hour === 19 ? '18' : null;
  if (!dryRun && !slot) {
    return res.status(200).json({ skipped: true, reason: `Toronto hour is ${hour}, scheduled pushes only fire at noon and in the evening` });
  }

  const docRes = await fetch(`${docUrl}?key=${FIREBASE_API_KEY}`);
  if (!docRes.ok) {
    return res.status(502).json({ error: 'Could not read challenge data' });
  }
  const doc = await docRes.json();
  const fields = doc.fields || {};
  // Scores reset weekly (Mon–Sun) since 2026-11-23: compare this week's
  // totals from the log, not the all-time running scores.
  const weekStart = (() => {
    const d = new Date(today + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().split('T')[0];
  })();
  const totals = { Martin: 0, Karine: 0 };
  (fields.history?.arrayValue?.values || []).forEach(v => {
    const f = v.mapValue?.fields || {};
    const who = f.person?.stringValue;
    const date = f.date?.stringValue || '';
    if ((who === 'Martin' || who === 'Karine') && date >= weekStart && date <= today) {
      totals[who] += Number(f.reps?.integerValue || f.reps?.doubleValue || 0);
    }
  });
  const lastPush = fields.lastMotivationPush?.mapValue?.fields || {};
  // Rest days: no motivation or reminder push for a player resting today.
  const restFields = fields.restDays?.mapValue?.fields || {};
  const restFor = p => new Set((restFields[p]?.arrayValue?.values || []).map(v => v.stringValue));
  const restingToday = { Martin: restFor('Martin').has(today), Karine: restFor('Karine').has(today) };
  const marker = `${today}-${slot || 'dry'}`;

  const behind = ['Martin', 'Karine'].filter(p => {
    const mine = totals[p];
    const theirs = totals[p === 'Martin' ? 'Karine' : 'Martin'];
    if (!isBehindByHalf(mine, theirs)) return false;
    if (restingToday[p]) return false;
    if (!dryRun && lastPush[p]?.stringValue === marker) return false;
    return true;
  });

  // The message now says the actual score gap first (a bare random line
  // didn't tell the player what was going on — reported 2026-11-20),
  // then the random motivation line.
  const wouldSendMotivation = behind.map(p => {
    const lines = p === 'Martin' ? MOTIVATION_LINES : KARINE_MOTIVATION_LINES;
    const mine = totals[p];
    const theirs = totals[p === 'Martin' ? 'Karine' : 'Martin'];
    const opp = p === 'Martin' ? 'Karine' : 'Martin';
    const message = `${opp} is ahead ${theirs}–${mine} this week — you're at less than half. ${lines[Math.floor(Math.random() * lines.length)]}`;
    return {
      person: p,
      pic: motivationPicFor(p.toLowerCase()),
      message,
      url: `${SITE_URL}?notif=motivation&title=${encodeURIComponent("💪 You're falling behind!")}&msg=${encodeURIComponent(message)}`,
    };
  });

  // Evening slot only: remind players who haven't logged today.
  const historyVals = fields.history?.arrayValue?.values || [];
  const entries = historyVals
    .map(v => v.mapValue?.fields)
    .filter(Boolean)
    .map(f => ({ person: f.person?.stringValue, date: f.date?.stringValue }));
  const lastReminder = fields.lastReminderDate?.stringValue || null;
  const loggedToday = {
    Martin: entries.some(e => e.person === 'Martin' && e.date === today),
    Karine: entries.some(e => e.person === 'Karine' && e.date === today),
  };
  const doReminder = slot === '18' || dryRun;
  const alreadyReminded = !dryRun && lastReminder === today;
  const wouldSendReminder = doReminder && !alreadyReminded
    ? ['Martin', 'Karine']
        .filter(p => !loggedToday[p] && !restingToday[p])
        .map(p => {
          const dates = new Set(entries.filter(e => e.person === p).map(e => e.date));
          const streak = streakEndingYesterday(dates, today, restFor(p));
          const mine = totals[p];
          const theirs = totals[p === 'Martin' ? 'Karine' : 'Martin'];
          const opp = p === 'Martin' ? 'Karine' : 'Martin';
          const scoreBit = `this week ${opp} is at ${theirs}, you're at ${mine}.`;
          const message = streak > 0
            ? `🔥 Your ${streak}-day streak is on the line — ${scoreBit} Log some reps before the day ends!`
            : `💪 You haven't logged any reps yet today — ${scoreBit} Log some to keep the challenge going!`;
          return {
            person: p,
            pic: motivationPicFor(p.toLowerCase()),
            message,
            url: `${SITE_URL}?notif=reminder&title=${encodeURIComponent('⏰ No reps logged yet today')}&msg=${encodeURIComponent(message)}`,
          };
        })
    : [];

  if (dryRun) {
    return res.status(200).json({ today, hour, slot, totals, loggedToday, motivation: { behind, wouldSend: wouldSendMotivation }, reminder: { wouldSend: wouldSendReminder } });
  }

  if (!process.env.ONESIGNAL_REST_API_KEY) {
    return res.status(500).json({ error: 'Push not configured on server' });
  }

  const results = { motivation: [], reminder: [] };
  for (const w of wouldSendMotivation) {
    const sent = await sendPush(w.person.toLowerCase(), "💪 You're falling behind!", w.message, 'motivation');
    results.motivation.push({ person: w.person, sent });
  }

  // Record the window per player who was pushed, so a second trigger in
  // the same window is a no-op. The other player's marker is preserved.
  if (behind.length > 0) {
    const newFields = {};
    for (const p of ['Martin', 'Karine']) {
      newFields[p] = {
        stringValue: behind.includes(p) ? marker : (lastPush[p]?.stringValue || ''),
      };
    }
    await fetch(`${docUrl}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=lastMotivationPush`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { lastMotivationPush: { mapValue: { fields: newFields } } } }),
    }).catch(() => {});
  }

  if (slot === '18') {
    for (const r of wouldSendReminder) {
      const sent = await sendPush(r.person.toLowerCase(), '⏰ No reps logged yet today', r.message, 'reminder');
      results.reminder.push({ person: r.person, sent });
    }
    // Mark today as reminded (even when nobody needed one) so a second
    // trigger the same day is a no-op.
    await fetch(`${docUrl}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=lastReminderDate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { lastReminderDate: { stringValue: today } } }),
    }).catch(() => {});
  }

  return res.status(200).json({ today, slot, totals, sent: results });
}
