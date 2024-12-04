import { Navigate, Route, Routes } from 'react-router-dom';

import { Col, Container, Row } from '../../components/_dsfr';
import building from '../../assets/images/building.svg';
import AccountEmailCreationView from './AccountCreation/AccountEmailCreationView';
import AccountEmailActivationView from './AccountCreation/AccountEmailActivationView';
import AccountPasswordCreationView from './AccountCreation/AccountPasswordCreationView';
import AccountAwaitingAccessView from './AccountCreation/AccountAwaitingAccessView';
import AccountAccessForbiddenView from './AccountCreation/AccountAccessForbiddenView';
import AccountCampaignIntentCreationView from './AccountCreation/AccountCampaignIntentCreationView';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function AccountCreationView() {
  useDocumentTitle('Créer un compte');
  return (
    <Container as="main" className="grow-container" spacing="py-4w">
      <Row gutters alignItems="middle">
        <Col n="6">
          <Routes>
            <Route path="email" element={<AccountEmailCreationView />} />
            <Route path="activation" element={<AccountEmailActivationView />} />
            <Route path="en-attente" element={<AccountAwaitingAccessView />} />
            <Route path="impossible" element={<AccountAccessForbiddenView />} />
            <Route
              path="mot-de-passe"
              element={<AccountPasswordCreationView />}
            />
            <Route
              path="campagne"
              element={<AccountCampaignIntentCreationView />}
            />
            <Route path="*" element={<Navigate replace to="../email" />} />
          </Routes>
        </Col>
        <Col n="5" offset="1" className="align-right">
          <img
            src={building}
            style={{ maxWidth: '100%', height: '100%' }}
            alt=""
          />
        </Col>
      </Row>
    </Container>
  );
}

export default AccountCreationView;
