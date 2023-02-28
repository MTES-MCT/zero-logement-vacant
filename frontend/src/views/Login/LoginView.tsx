import React, { FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  Button,
  Col,
  Container,
  Row,
  Text,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
<<<<<<< HEAD
import {
  fetchAvailableEstablishments,
  login,
} from '../../store/actions/authenticationAction';
=======
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/actions/authenticationAction';
>>>>>>> 6fcd85e (Handle links to establishments on owner homepage)

import * as yup from 'yup';
import EstablishmentSearchableSelect from '../../components/EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import Alert from '../../components/Alert/Alert';
import building from '../../assets/images/building.svg';
import InternalLink from '../../components/InternalLink/InternalLink';
import { emailValidator, useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';

const LoginView = () => {
  useDocumentTitle('Connexion');
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string>('');

  const { loginError, isLoggedOut } = useAppSelector(
    (state) => state.authentication
  );

  const loginForm = yup.object().shape({
    isAdmin: yup.boolean(),
    email: emailValidator,
    password: yup.string().required('Veuillez renseigner un mot de passe.'),
    establishmentId: yup.string().when('isAdmin', {
      is: true,
      then: yup.string().min(1, 'Veuillez sélectionner un établissement.'),
    }),
  });
  const { isValid, message, messageType } = useForm(loginForm, {
    isAdmin: pathname === '/admin',
    email,
    password,
    establishmentId,
  });

  function submitLoginForm(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();

    if (isValid()) {
      dispatch(
        login(
          email,
          password,
          establishmentId.length ? establishmentId : undefined
        )
      );
    }
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
                type="warning"
                closable
              />
            </Col>
          )}
          {loginError && (
            <Col n="12">
              <div data-testid="alert-error" className="fr-my-2w">
                <Alert title="Erreur" description={loginError} type="error" />
              </div>
            </Col>
          )}
          <Title as="h1" look="h2">
            Connexion
          </Title>
          <form onSubmit={submitLoginForm} id="login_form">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              messageType={messageType('email')}
              message={message('email', 'Email renseigné.')}
              data-testid="email-input"
              label="Adresse email : "
              required
            />
            <TextInput
              type="password"
              value={password}
              className={isAdminView ? '' : 'fr-mb-1w'}
              onChange={(e) => setPassword(e.target.value)}
              messageType={messageType('password')}
              message={message('password', 'Mot de passe renseigné.')}
              data-testid="password-input"
              label="Mot de passe : "
              required
            />
            {isAdminView && (
              <EstablishmentSearchableSelect
                onChange={(id: string) => setEstablishmentId(id)}
              />
            )}
            <Row spacing="mb-4w">
              <InternalLink to="/mot-de-passe/oublie" isSimple>
                Mot de passe perdu ?
              </InternalLink>
            </Row>
            <Row alignItems="middle">
              <Col n="9">
                <Text as="span" size="lg">
                  Première visite ?{' '}
                </Text>
                <InternalLink
                  to="/inscription"
                  isSimple
                  icon="ri-arrow-right-line"
                  iconPosition="right"
                  iconSize="1x"
                >
                  Créer votre compte
                </InternalLink>
              </Col>
              <Col>
                <Row justifyContent="right">
                  <Button submit data-testid="login-button">
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
