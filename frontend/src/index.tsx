import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import posthog from 'posthog-js';
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
    <ThemeProvider>
      <MapProvider>
        <StoreProvider store={store}>
          <Notification />
          <App />
        </StoreProvider>
      </MapProvider>
    </ThemeProvider>
  </StrictMode>
);
