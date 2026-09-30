import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css'; // ← IMPORTANTE

if (typeof window !== 'undefined') { window.__NEXUS_E2E_MARKER__ = "NEXUS-E2E-ROLLBACK-R009-ROLLBACK-FINAL-02-20260930T145731Z"; }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

