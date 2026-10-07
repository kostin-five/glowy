import "@fontsource/manrope/cyrillic-400.css";
import "@fontsource/manrope/cyrillic-500.css";
import "@fontsource/manrope/cyrillic-600.css";
import "@fontsource/manrope/cyrillic-700.css";
import "@fontsource/manrope/cyrillic-800.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import "@fontsource/unbounded/cyrillic-600.css";
import "@fontsource/unbounded/cyrillic-700.css";
import "@fontsource/unbounded/cyrillic-800.css";
import "@fontsource/unbounded/latin-600.css";
import "@fontsource/unbounded/latin-700.css";
import "@fontsource/unbounded/latin-800.css";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureServiceWorkerControl } from './offline/ensureServiceWorkerControl'
import { AppQueryProvider } from './query/AppQueryProvider'
import FoundationShowcase from './design-system/FoundationShowcase'
import {
  isFoundationShowcasePath,
} from './design-system/foundationShowcaseRoute'

const isFoundationShowcase = import.meta.env.DEV && isFoundationShowcasePath(window.location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isFoundationShowcase ? (
      <FoundationShowcase />
    ) : (
      <AppQueryProvider>
        <App />
      </AppQueryProvider>
    )}
  </StrictMode>,
)

if (!isFoundationShowcase) {
  void ensureServiceWorkerControl()
}
