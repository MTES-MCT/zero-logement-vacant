import React, { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Button, Col, Container, Row, TextInput } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAvailableEstablishments,
  login,
} from '../../store/actions/authenticationAction';

import * as yup from 'yup';
import EstablishmentSearchableSelect from '../../components/EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import Alert from '../../components/Alert/Alert';
import building from '../../assets/images/building.svg';
import InternalLink from '../../components/InternalLink/InternalLink';
import { useForm } from '../../hooks/useForm';

const LoginView = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string>('');

  const { loginError, isLoggedOut } = useSelector(
    (state: ApplicationState) => state.authentication
  );

  const loginForm = yup.object().shape({
    isAdmin: yup.boolean(),
    email: yup
      .string()
      .required('Veuillez renseigner un email.')
      .email('Veuillez renseigner un email valide.'),
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

  useEffect(() => {
    if (pathname === '/admin') {
      dispatch(fetchAvailableEstablishments());
    }
  }, [dispatch, pathname]);

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

  return (
    <>
      <Container as="main" spacing="py-4w">
        {isLoggedOut && (
          <Alert
            title="Déconnexion"
            description="Vous êtes déconnecté. Veuillez saisir votre email et votre mot de passe pour vous connecter de nouveau."
            className="fr-my-3w"
            type="warning"
            closable
          />
        )}
        {loginError && (
          <div data-testid="alert-error" className="fr-my-2w">
            <Alert title="Erreur" description={loginError} type="error" />
          </div>
        )}
        <Row gutters>
          <Col>
            <form onSubmit={submitLoginForm} id="login_form">
              <TextInput
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                messageType={messageType('email')}
                message={message('email')}
                data-testid="email-input"
                label="Adresse email : "
                required
              />
              <TextInput
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                messageType={messageType('password')}
                message={message('password')}
                data-testid="password-input"
                label="Mot de passe : "
                required
              />
              {pathname === '/admin' && (
                <EstablishmentSearchableSelect
                  onChange={(id: string) => setEstablishmentId(id)}
                />
              )}
              <Row alignItems="middle">
                <Col>
                  <InternalLink to="/mot-de-passe/oublie" isSimple>
                    Mot de passe oublié ?
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
    </>
  );
};

export default LoginView;
