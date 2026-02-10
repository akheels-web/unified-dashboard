import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

import { EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './services/auth';

// Default to using the first account if no account is active on page load
if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
  // Account selection logic is app dependent. Adjust as needed.
  msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
}

msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    // @ts-ignore
    const account = event.payload.account;
    msalInstance.setActiveAccount(account);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </MsalProvider>
  </StrictMode>,
)
