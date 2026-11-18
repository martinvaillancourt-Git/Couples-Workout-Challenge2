// Vercel serverless function: 6 PM daily reminder.
//
// Triggered by Vercel Cron (see vercel.json) at 22:00 and 23:00 UTC — one of
// those is 6 PM in America/Toronto year-round (EST in winter, EDT in
// summer). The function only acts when the Toronto hour is 18, so exactly
// one of the two daily runs does anything.
//
// What it does: reads the challenge doc from Firestore, checks who hasn't
// logged any reps today, and pushes each of them a reminder via OneSignal
// (same REST key as api/notify.js, from ONESIGNAL_REST_API_KEY). If the
// player has a live streak (logged yesterday but not today), the message
// says so. It records lastReminderDate in the doc so a second trigger the
// same day does nothing.
//
// Security: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; when
// CRON_SECRET is set, any non-cron call is rejected — except ?dryRun=1,
// which is read-only (reports what would be sent, sends nothing) so the
// check can be tested by hand.
//
// The Firebase web API key below is public (it ships in the client code);
// the Firestore doc is read the same way the app reads it.

const FIREBASE_API_KEY = 'AIzaSyDHDC1i4szCTjII6s6WS2ejt1kCr9hoH_Y';
const PROJECT_ID = 'couples-reps-arena';
const DOC_PATH = 'challenges/martin_karine_arena';
const ONESIGNAL_APP_ID = '59358996-6bd7-4ac5-b9b3-4edf22d8f85e';
const SITE_URL = 'https://couples-workout-challenge2.vercel.app/';

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${DOC_PATH}`;

// Toronto date + hour (the reminder is a 6 PM Toronto-time thing)
function torontoParts() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

// Consecutive days logged ending yesterday (a streak still alive today)
function streakEndingYesterday(dateSet, todayStr) {
  let n = 0;
  const d = new Date(todayStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  while (dateSet.has(d.toISOString().split('T')[0])) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

async function sendPush(externalId, title, body) {
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

  // Only the 6 PM Toronto run acts; the other daily cron is a no-op.
  if (!dryRun && hour !== 18) {
    return res.status(200).json({ skipped: true, reason: `Toronto hour is ${hour}, reminder only fires at 18` });
  }

  const docRes = await fetch(`${docUrl}?key=${FIREBASE_API_KEY}`);
  if (!docRes.ok) {
    return res.status(502).json({ error: 'Could not read challenge data' });
  }
  const doc = await docRes.json();
  const fields = doc.fields || {};
  const historyVals = fields.history?.arrayValue?.values || [];
  const entries = historyVals
    .map(v => v.mapValue?.fields)
    .filter(Boolean)
    .map(f => ({ person: f.person?.stringValue, date: f.date?.stringValue }));
  const lastReminder = fields.lastReminderDate?.stringValue || null;

  if (!dryRun && lastReminder === today) {
    return res.status(200).json({ skipped: true, reason: 'Already reminded today' });
  }

  const loggedToday = {
    Martin: entries.some(e => e.person === 'Martin' && e.date === today),
    Karine: entries.some(e => e.person === 'Karine' && e.date === today),
  };

  const reminders = ['Martin', 'Karine']
    .filter(p => !loggedToday[p])
    .map(p => {
      const dates = new Set(entries.filter(e => e.person === p).map(e => e.date));
      const streak = streakEndingYesterday(dates, today);
      return {
        person: p,
        message: streak > 0
          ? `🔥 Your ${streak}-day streak is on the line — log some reps before the day ends!`
          : `💪 You haven't logged any reps yet today — log some to keep the challenge going!`,
      };
    });

  if (dryRun) {
    return res.status(200).json({ today, hour, loggedToday, wouldSend: reminders });
  }

  if (!process.env.ONESIGNAL_REST_API_KEY) {
    return res.status(500).json({ error: 'Push not configured on server' });
  }

  const results = [];
  for (const r of reminders) {
    const sent = await sendPush(r.person.toLowerCase(), '⏰ 6 PM — no reps logged yet', r.message);
    results.push({ person: r.person, sent });
  }

  // Mark today as reminded (even when nobody needed one) so a second
  // trigger the same day is a no-op.
  await fetch(`${docUrl}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=lastReminderDate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { lastReminderDate: { stringValue: today } } }),
  }).catch(() => {});

  return res.status(200).json({ today, sent: results });
}
