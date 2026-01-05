import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

function setupGlobalErrorLogging() {
  window.addEventListener('error', (event) => {
    // log-only (no UI changes)
    const err = (event as ErrorEvent).error ?? (event as ErrorEvent).message;
    console.error('[global:error]', err);
  });

  window.addEventListener('unhandledrejection', (event) => {
    // log-only (no UI changes)
    console.error('[global:unhandledrejection]', (event as PromiseRejectionEvent).reason);
  });
}

setupGlobalErrorLogging();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
