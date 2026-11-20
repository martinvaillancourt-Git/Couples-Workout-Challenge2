// Vercel serverless function: sends a push notification via OneSignal.
//
// The OneSignal REST API key lives ONLY in the Vercel project environment
// variable ONESIGNAL_REST_API_KEY — it is never in the repo or in client
// code (the repo is public, and OneSignal treats the key like a password).
// The App ID is public by design (it ships in the OneSignal SDK snippet),
// so it is hardcoded here.

const ONESIGNAL_APP_ID = '59358996-6bd7-4ac5-b9b3-4edf22d8f85e';
const SITE_URL = 'https://couples-workout-challenge2.vercel.app/';

// Tapping a notification opens the app with the message in the URL, so
// the app can show it as a banner instead of the message vanishing with
// the notification (reported 2026-11-20). `data` carries the same
// message for the in-page click listener (app already open).
function notifUrl(type, title, body) {
  return `${SITE_URL}?notif=${type}&title=${encodeURIComponent(title)}&msg=${encodeURIComponent(body)}`;
}

import { motivationPicFor } from './motivation-pics.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { opponent, title, message, picFor, notifType } = req.body || {};
  if (!opponent || !title || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Push not configured on server' });
  }

  // The picture that rides along: the sender's for a taunt (picFor),
  // the recipient's for crown pushes (default).
  const picId = ['martin', 'karine'].includes(picFor) ? picFor : opponent;
  const pic = motivationPicFor(picId);

  const type = ['taunt', 'crown', 'burst'].includes(notifType) ? notifType : 'notify';

  const r = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [opponent],
      headings: { en: title },
      contents: { en: message },
      url: notifUrl(type, title, message),
      data: { notif: type, title, msg: message },
      chrome_web_image: pic,
      big_picture: pic,
    }),
  });

  const data = await r.json().catch(() => ({}));
  return res.status(r.ok ? 200 : r.status).json(data);
}
