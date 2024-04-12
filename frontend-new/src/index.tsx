import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { createInstance, MatomoProvider } from '@jonkoops/matomo-tracker-react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MapProvider } from 'react-map-gl';
import { Provider as StoreProvider } from 'react-redux';
import { Link } from 'react-router-dom';

import config from './utils/config';
import { store } from './store/store';
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

const matomo = createInstance(config.matomo);

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container!);
root.render(
  <React.StrictMode>
    <MapProvider>
      <MatomoProvider value={matomo}>
        <StoreProvider store={store}>
          <App />
        </StoreProvider>
      </MatomoProvider>
    </MapProvider>
  </React.StrictMode>,
);
