import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { createInstance, MatomoProvider } from '@jonkoops/matomo-tracker-react';
import posthog from 'posthog-js';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { MapProvider } from 'react-map-gl/maplibre';
import { Provider as StoreProvider } from 'react-redux';
import { Link } from 'react-router-dom-v5-compat';

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

const matomo = createInstance({
  ...config.matomo,
  disabled: !config.matomo.enabled
});

if (config.posthog.enabled) {
  posthog.init('phc_Thondx9VvGONN5SZK0OuDttJDIorIANsudwCL2gU3O7', {
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
        <MatomoProvider value={matomo}>
          <StoreProvider store={store}>
            <Notification />
            <App />
          </StoreProvider>
        </MatomoProvider>
      </MapProvider>
    </ThemeProvider>
  </StrictMode>
);
