import { FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Col, Container, Row, Text } from '../../components/_dsfr';
import { login } from '../../store/actions/authenticationAction';

import * as yup from 'yup';
import EstablishmentSearchableSelect from '../../components/EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import building from '../../assets/images/building.svg';
import AppLink from '../../components/_app/AppLink/AppLink';
import { emailValidator, useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import AppTextInput from '../../components/_app/AppTextInput/AppTextInput';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import Typography from '@mui/material/Typography';

const LoginView = () => {
  useDocumentTitle('Connexion');
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const { trackEvent } = useMatomo();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string>('');

  const { loginError, isLoggedOut } = useAppSelector(
    (state) => state.authentication
  );

  const shape = {
    isAdmin: yup.boolean(),
    email: emailValidator,
    password: yup.string().required('Veuillez renseigner un mot de passe.'),
    establishmentId: yup.string().when('isAdmin', {
      is: true,
      then: yup.string().min(1, 'Veuillez sélectionner un établissement.')
    })
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    isAdmin: pathname === '/admin',
    email,
    password,
    establishmentId
  });

  async function submitLoginForm(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await form.validate(() => {
      trackEvent({
        category: TrackEventCategories.Home,
        action: TrackEventActions.Home.Connection
      });
      dispatch(
        login(
          email,
          password,
          establishmentId.length ? establishmentId : undefined
        )
      );
    });
  }

  const isAdminView = pathname === '/admin';

  return (
    <Container as="main" className="grow-container" spacing="py-4w">
      <Row gutters alignItems="middle">
        <Col>
          {isLoggedOut && (
            <Col n="12">
              <Alert
                title="Déconnexion"
                description="Vous êtes déconnecté. Veuillez saisir votre email et votre mot de passe pour vous connecter de nouveau."
                className="fr-my-3w"
                severity="warning"
                closable
              />
            </Col>
          )}
          {loginError && (
            <Col n="12">
              <div data-testid="alert-error" className="fr-my-2w">
                <Alert
                  title="Erreur"
                  description={loginError}
                  severity="error"
                />
              </div>
            </Col>
          )}
          <Typography component="h1" variant="h2">
            Connexion
          </Typography>
          <form onSubmit={submitLoginForm} id="login_form">
            <AppTextInput<FormShape>
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputForm={form}
              inputKey="email"
              whenValid="Email renseigné."
              data-testid="email-input"
              label="Adresse email (obligatoire)"
              required
            />
            <AppTextInput<FormShape>
              type="password"
              value={password}
              className={isAdminView ? '' : 'fr-mb-1w'}
              onChange={(e) => setPassword(e.target.value)}
              inputForm={form}
              inputKey="password"
              whenValid="Mot de passe renseigné."
              data-testid="password-input"
              label="Mot de passe (obligatoire)"
              required
            />
            {isAdminView && (
              <EstablishmentSearchableSelect
                onChange={(id: string) => setEstablishmentId(id)}
              />
            )}
            <Row spacing="mb-4w">
              <AppLink to="/mot-de-passe/oublie" isSimple>
                Mot de passe perdu ?
              </AppLink>
            </Row>
            <Row alignItems="middle">
              <Col n="9">
                <Text as="span" size="lg">
                  Première visite ?{' '}
                </Text>
                <AppLink
                  to="/inscription"
                  isSimple
                  iconId="fr-icon-arrow-right-line"
                  iconPosition="right"
                >
                  Créer votre compte
                </AppLink>
              </Col>
              <Col>
                <Row justifyContent="right">
                  <Button type="submit" data-testid="login-button">
                    Se connecter
                  </Button>
                </Row>
              </Col>
            </Row>
          </form>
        </Col>
        <Col n="5" offset="1" className="align-right">
          <img
            src={building}
            style={{ width: '100%', height: '100%' }}
            alt=""
          />
        </Col>
      </Row>
    </Container>
  );
};

export default LoginView;
