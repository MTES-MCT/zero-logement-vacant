import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import posthog from 'posthog-js';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { MapProvider } from 'react-map-gl/maplibre';
import { Provider as StoreProvider } from 'react-redux';
import { Link } from 'react-router-dom';

import Notification from './components/Notification/Notification';
import { store } from './store/store';
import config from './utils/config';
import App from './App';
import ThemeProvider from './theme';

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
