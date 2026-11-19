// OneSignal Web Push (v16 SDK, loaded from CDN in index.html).
//
// SETUP (done 2026-11-18): free OneSignal account under
// martin.vaillancourt@gmail.com, app "Couples Workout Challenge"
// (App ID below), Web Push platform pointed at the production Vercel URL.
//
// SECURITY: the REST API key is NOT in this repo. Pushes are sent through
// our own Vercel serverless function (api/notify.js), which reads the key
// from the Vercel project environment variable ONESIGNAL_REST_API_KEY.
// The App ID below is public by design (it ships in the SDK snippet).
//
// How it works: each phone is identified by the "Active Logger" selected in
// the app (Martin or Karine). Pushes go to the other person's external user
// id when a Rep Steal is claimed or a Weekly Showdown is crowned (and a
// daily 6 PM reminder, sent by api/reminder.js, if someone hasn't logged
// yet). Keep your own name selected as the Active Logger on your own phone
// so pushes go to the right person.

export const ONESIGNAL_APP_ID = '59358996-6bd7-4ac5-b9b3-4edf22d8f85e';

export const isOneSignalConfigured = () =>
  ONESIGNAL_APP_ID && !ONESIGNAL_APP_ID.startsWith('YOUR_');

const withOneSignal = (fn) => {
  if (typeof window === 'undefined' || !window.OneSignalDeferred) return;
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await fn(OneSignal);
    } catch (err) {
      console.error('OneSignal error:', err);
    }
  });
};

let initialized = false;

export function initOneSignal(onStatus) {
  if (!isOneSignalConfigured()) {
    onStatus && onStatus('not-configured');
    return;
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    onStatus && onStatus('unsupported');
    return;
  }
  if (initialized) return;
  initialized = true;
  withOneSignal(async (OneSignal) => {
    await OneSignal.init({ appId: ONESIGNAL_APP_ID });
    const permission = OneSignal.Notifications.permission;
    const optedIn = OneSignal.User.PushSubscription.optedIn;
    onStatus && onStatus(permission && optedIn ? 'on' : 'off');
  });
}

// Ask the user for notification permission and tag this device as `person`
// ('martin' or 'karine'). Returns true if notifications are now on.
export function enableNotifications(person) {
  return new Promise((resolve) => {
    if (!isOneSignalConfigured()) return resolve(false);
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    withOneSignal(async (OneSignal) => {
      const granted = await OneSignal.Notifications.requestPermission();
      if (granted) {
        await OneSignal.login(person.toLowerCase());
        done(true);
      } else {
        done(false);
      }
    });
    // Safety net: if the SDK never loads, don't hang the UI.
    setTimeout(() => done(false), 8000);
  });
}

// Keep this device tagged as the currently selected logger.
export function setActivePlayer(person) {
  if (!isOneSignalConfigured()) return;
  withOneSignal(async (OneSignal) => {
    if (OneSignal.Notifications.permission) {
      await OneSignal.login(person.toLowerCase());
    }
  });
}

// Send a push to the other player via our own Vercel serverless function
// (/api/notify.js), which holds the OneSignal REST API key server-side.
// picFor (optional) picks whose motivation picture rides along — the
// sender's for taunts, the recipient's otherwise.
export async function notifyOpponent(opponent, title, message, picFor) {
  if (!isOneSignalConfigured()) return;
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponent: opponent.toLowerCase(), title, message, picFor: (picFor || opponent).toLowerCase() }),
    });
  } catch (err) {
    console.error('Failed to send push:', err);
  }
}
