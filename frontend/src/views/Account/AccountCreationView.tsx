import { fr } from '@codegouvfr/react-dsfr';
import Grid from '@mui/material/Unstable_Grid2';
import { Navigate, Route, Routes } from 'react-router-dom';

import AccountEmailCreationView from './AccountCreation/AccountEmailCreationView';
import AccountEmailActivationView from './AccountCreation/AccountEmailActivationView';
import AccountPasswordCreationView from './AccountCreation/AccountPasswordCreationView';
import AccountAwaitingAccessView from './AccountCreation/AccountAwaitingAccessView';
import AccountAccessForbiddenView from './AccountCreation/AccountAccessForbiddenView';
import AccountSupportRegistrationView from './AccountCreation/AccountSupportRegistrationView';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function AccountCreationView() {
  useDocumentTitle('Créer un compte');

  return (
    <Grid className={fr.cx('fr-container', 'fr-py-4w')} component="main">
      <Routes>
        <Route path="email" element={<AccountEmailCreationView />} />
        <Route
          path="activation"
          element={<AccountEmailActivationView />}
        />
        <Route
          path="en-attente"
          element={<AccountAwaitingAccessView />} />

        <Route
          path="impossible"
          element={<AccountAccessForbiddenView />} />

        <Route
          path="mot-de-passe"
          element={<AccountPasswordCreationView />}
        />
        <Route
          path="prise-en-main"
          element={AccountSupportRegistrationView}
        />
        <Route path="*" element={<Navigate replace to="../email" />} />
      </Routes>
    </Grid>
  );
}

export default AccountCreationView;
