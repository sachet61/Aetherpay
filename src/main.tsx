import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerSw = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Non-blocking fallback when SW is restricted (e.g. strict incognito/sandbox)
    });
  };
  if (document.readyState === 'complete') {
    registerSw();
  } else {
    window.addEventListener('load', registerSw, { once: true });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
