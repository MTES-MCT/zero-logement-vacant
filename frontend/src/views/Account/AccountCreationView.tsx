import { Redirect } from 'react-router-dom';
import { CompatRoute, Routes } from 'react-router-dom-v5-compat';

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
            <CompatRoute path="email" component={AccountEmailCreationView} />
            <CompatRoute
              path="activation"
              component={AccountEmailActivationView}
            />
            <CompatRoute
              path="en-attente"
              component={AccountAwaitingAccessView}
            />
            <CompatRoute
              path="impossible"
              component={AccountAccessForbiddenView}
            />
            <CompatRoute
              path="mot-de-passe"
              component={AccountPasswordCreationView}
            />
            <CompatRoute
              path="campagne"
              component={AccountCampaignIntentCreationView}
            />
            <CompatRoute path="*">
              <Redirect to="email" />
            </CompatRoute>
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
