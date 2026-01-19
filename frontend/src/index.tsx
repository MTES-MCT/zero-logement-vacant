import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { MapProvider } from 'react-map-gl/maplibre';
import { Provider as StoreProvider } from 'react-redux';
import { Link } from 'react-router-dom';

import App from './App';
import Notification from './components/Notification/Notification';
import { store } from './store/store';
import ThemeProvider from './theme';
import config from './utils/config';
import sentry from './utils/sentry';

sentry.init();

startReactDsfr({
  defaultColorScheme: 'light',
  Link
});

declare module '@codegouvfr/react-dsfr/spa' {
  interface RegisterLink {
    Link: typeof Link;
  }
}

if (config.posthog.enabled) {
  posthog.init(config.posthog.apiKey, {
    api_host: 'https://eu.i.posthog.com',
    person_profiles: 'identified_only'
  });
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container!);

root.render(
  <StrictMode>
    <sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            margin: '20px'
          }}
        >
          <h2>Une erreur s&apos;est produite</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Détails de l&apos;erreur</summary>
            {error?.toString()}
          </details>
          <button
            onClick={resetError}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Réessayer
          </button>
        </div>
      )}
      beforeCapture={(scope) => {
        scope.setTag('errorBoundary', 'root');
      }}
    >
      <ThemeProvider>
        <MapProvider>
          <PostHogProvider client={posthog}>
            <StoreProvider store={store}>
              <Notification />
              <App />
            </StoreProvider>
          </PostHogProvider>
        </MapProvider>
      </ThemeProvider>
    </sentry.ErrorBoundary>
  </StrictMode>
);
