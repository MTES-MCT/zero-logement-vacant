import MuiDsfrThemeProvider from '@codegouvfr/react-dsfr/mui';
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { createInstance, MatomoProvider } from '@jonkoops/matomo-tracker-react';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { MapProvider } from 'react-map-gl';
import { Provider as StoreProvider } from 'react-redux';
import { Link } from 'react-router-dom';

import Notification from './components/Notification/Notification';
import { store } from './store/store';
import config from './utils/config';
import App from './App';

startReactDsfr({
  defaultColorScheme: 'light',
  Link,
});

declare module '@codegouvfr/react-dsfr/spa' {
  interface RegisterLink {
    Link: typeof Link;
  }
}

const matomo = createInstance({
  ...config.matomo,
  disabled: !config.matomo.enabled,
});

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container!);
root.render(
  <StrictMode>
    <MuiDsfrThemeProvider>
      <MapProvider>
        <MatomoProvider value={matomo}>
          <StoreProvider store={store}>
            <Notification />
            <App />
          </StoreProvider>
        </MatomoProvider>
      </MapProvider>
    </MuiDsfrThemeProvider>
  </StrictMode>,
);
