// Vercel serverless function: sends a push notification via OneSignal.
//
// The OneSignal REST API key lives ONLY in the Vercel project environment
// variable ONESIGNAL_REST_API_KEY — it is never in the repo or in client
// code (the repo is public, and OneSignal treats the key like a password).
// The App ID is public by design (it ships in the OneSignal SDK snippet),
// so it is hardcoded here.

const ONESIGNAL_APP_ID = '59358996-6bd7-4ac5-b9b3-4edf22d8f85e';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { opponent, title, message } = req.body || {};
  if (!opponent || !title || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Push not configured on server' });
  }

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
    }),
  });

  const data = await r.json().catch(() => ({}));
  return res.status(r.ok ? 200 : r.status).json(data);
}
