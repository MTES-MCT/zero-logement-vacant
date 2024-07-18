import { Redirect, Route, Switch } from 'react-router-dom';
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
          <Switch>
            <Route
              path="/inscription/email"
              component={AccountEmailCreationView}
            />
            <Route
              path="/inscription/activation"
              component={AccountEmailActivationView}
            />
            <Route
              path="/inscription/en-attente"
              component={AccountAwaitingAccessView}
            />
            <Route
              path="/inscription/impossible"
              component={AccountAccessForbiddenView}
            />
            <Route
              path="/inscription/mot-de-passe"
              component={AccountPasswordCreationView}
            />
            <Route
              path="/inscription/campagne"
              component={AccountCampaignIntentCreationView}
            />
            <Route path="*">
              <Redirect to="/inscription/email" />
            </Route>
          </Switch>
        </Col>
        <Col n="5" offset="1" className="align-right">
          <img
            src={building}
            style={{ maxWidth: '100%', height: '100%', }}
            alt=""
          />
        </Col>
      </Row>
    </Container>
  );
}

export default AccountCreationView;
