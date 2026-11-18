// OneSignal service worker (required by the OneSignal Web SDK v16).
// The fetch handler below is a plain network passthrough — it exists so
// Chrome counts the app as installable (PWA "Add to Home Screen").
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js');

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
