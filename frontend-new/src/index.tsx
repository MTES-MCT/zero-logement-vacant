import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Link } from 'react-router-dom';

import App from './App';

startReactDsfr({
  defaultColorScheme: 'light',
  Link
})

declare module "@codegouvfr/react-dsfr/spa" {
  interface RegisterLink {
    Link: typeof Link;
  }
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
