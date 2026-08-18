import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/** Dev: remove stale service workers that cache old bundles and break IndexedDB init. */
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => void reg.unregister());
  });
  if ('caches' in window) {
    void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
