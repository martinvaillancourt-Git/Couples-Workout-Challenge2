// Vercel serverless function: motivation push for the player who is behind.
//
// Triggered by Vercel Cron (see vercel.json) at 16:00, 17:00, 22:00 and
// 23:00 UTC — one of the first two is noon in America/Toronto year-round
// (EST in winter, EDT in summer) and one of the last two is 6 PM. The
// function only acts when the Toronto hour is 12 or 18, so exactly two
// of the four daily runs do anything.
//
// What it does: reads the challenge doc from Firestore, checks who is
// behind by more than 50% on total reps (their total is less than half
// of the opponent's — the same rule as the in-app motivation pop-up),
// and pushes each of them a motivation notification via OneSignal: a
// random motivation line plus a random motivation picture (Alley for
// Martin, Johnny Depp for Karine). Unlike the in-app pop-up, this one
// arrives even with the app closed. It records lastMotivationPush per
// player in the doc (YYYY-MM-DD-noon / YYYY-MM-DD-18) so a second
// trigger in the same window does nothing.
//
// Security: same pattern as api/reminder.js — Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>`; when CRON_SECRET is set, any
// non-cron call is rejected — except ?dryRun=1, which is read-only
// (reports what would be sent, sends nothing) so the check can be
// tested by hand.
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

import { motivationPicFor } from './motivation-pics.js';

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
  'Johnny would want you to win this week. Go earn it.',
  'No excuses — ten minutes is a full set. Go earn it.',
  "You're one good session from taking the lead. Take it.",
  'Remember the forfeit. Somebody owes somebody. Make it him.',
  "Stronger every day. That's the whole deal. Now go.",
  'Push-ups. Squats. Glute bridges. Pick one and start.',
  "The week won't win itself. Log something.",
];

// Toronto date + hour (noon and 6 PM are Toronto-time things)
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

async function sendPush(externalId, title, body) {
  const pic = motivationPicFor(externalId);
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
      url: SITE_URL,
      chrome_web_image: pic,
      big_picture: pic,
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

  const slot = hour === 12 ? 'noon' : hour === 18 ? '18' : null;

  // Only the noon and 6 PM Toronto runs act; the other cron triggers
  // are no-ops (they exist only to cover EST/EDT).
  if (!dryRun && !slot) {
    return res.status(200).json({ skipped: true, reason: `Toronto hour is ${hour}, motivation push only fires at 12 and 18` });
  }

  const docRes = await fetch(`${docUrl}?key=${FIREBASE_API_KEY}`);
  if (!docRes.ok) {
    return res.status(502).json({ error: 'Could not read challenge data' });
  }
  const doc = await docRes.json();
  const fields = doc.fields || {};
  const scores = fields.scores?.mapValue?.fields || {};
  const totals = {
    Martin: Number(scores.Martin?.integerValue || 0),
    Karine: Number(scores.Karine?.integerValue || 0),
  };
  const lastPush = fields.lastMotivationPush?.mapValue?.fields || {};
  const marker = `${today}-${slot || 'dry'}`;

  const behind = ['Martin', 'Karine'].filter(p => {
    const mine = totals[p];
    const theirs = totals[p === 'Martin' ? 'Karine' : 'Martin'];
    if (!isBehindByHalf(mine, theirs)) return false;
    if (!dryRun && lastPush[p]?.stringValue === marker) return false;
    return true;
  });

  const wouldSend = behind.map(p => {
    const lines = p === 'Martin' ? MOTIVATION_LINES : KARINE_MOTIVATION_LINES;
    return {
      person: p,
      pic: motivationPicFor(p.toLowerCase()),
      message: lines[Math.floor(Math.random() * lines.length)],
    };
  });

  if (dryRun) {
    return res.status(200).json({ today, hour, slot, totals, behind, wouldSend });
  }

  if (!process.env.ONESIGNAL_REST_API_KEY) {
    return res.status(500).json({ error: 'Push not configured on server' });
  }

  const results = [];
  for (const w of wouldSend) {
    const sent = await sendPush(w.person.toLowerCase(), "💪 You're falling behind!", w.message);
    results.push({ person: w.person, sent });
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

  return res.status(200).json({ today, slot, totals, sent: results });
}
