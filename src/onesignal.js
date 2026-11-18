// OneSignal Web Push (v16 SDK, loaded from CDN in index.html).
//
// SETUP (5 minutes, once, in the OneSignal dashboard at onesignal.com):
//   1. Create a free account, then "New App" -> Web Push.
//   2. Copy the App ID and paste it into ONESIGNAL_APP_ID below.
//   3. In Settings -> Keys & IDs, copy the REST API Key and paste it into
//      ONESIGNAL_REST_API_KEY below. The key lets the app itself send a push
//      to the other player when reps are logged. It is visible in the
//      deployed JavaScript — acceptable for a private two-person app, and
//      you can rotate it anytime in the dashboard.
//
// How it works: each phone is identified by the "Active Logger" selected in
// the app (Martin or Karine). When one person logs reps, a push is sent to
// the other person's external user id. Keep your own name selected as the
// Active Logger on your own phone so pushes go to the right person.

export const ONESIGNAL_APP_ID = 'YOUR_ONESIGNAL_APP_ID';
export const ONESIGNAL_REST_API_KEY = 'YOUR_ONESIGNAL_REST_API_KEY';

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

// Send a push to the other player via the OneSignal REST API.
export async function notifyOpponent(opponent, title, message) {
  if (!isOneSignalConfigured() || ONESIGNAL_REST_API_KEY.startsWith('YOUR_')) {
    return;
  }
  try {
    await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [opponent.toLowerCase()],
        headings: { en: title },
        contents: { en: message },
      }),
    });
  } catch (err) {
    console.error('Failed to send push:', err);
  }
}
