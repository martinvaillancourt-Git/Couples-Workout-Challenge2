import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Register the service worker so the app is installable (PWA "Add to Home
// Screen"). The same worker file also serves OneSignal push notifications.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/OneSignalSDKWorker.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
