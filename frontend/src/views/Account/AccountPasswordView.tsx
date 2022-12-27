import React, { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Container,
  Row,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import {
  changePassword,
  initPasswordChange,
} from '../../store/actions/authenticationAction';

import * as yup from 'yup';
import { FormState } from '../../store/actions/FormState';
import {
  passwordConfirmationValidator,
  passwordValidator,
  useForm,
} from '../../hooks/useForm';

const AccountPasswordView = () => {
  const dispatch = useDispatch();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const { passwordFormState } = useSelector(
    (state: ApplicationState) => state.authentication
  );

  const form = yup.object().shape({
    currentPassword: yup
      .string()
      .required('Veuillez renseigner votre mot de passe actuel.'),
    password: passwordValidator,
    passwordConfirmation: passwordConfirmationValidator,
  });
  const { isValid, message, messageList, messageType } = useForm(form, {
    currentPassword,
    password,
    passwordConfirmation,
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      if (isValid()) {
        dispatch(changePassword(currentPassword, password));
      }
    } catch (error) {}
  }

  useEffect(() => {
    dispatch(initPasswordChange());
  }, [dispatch]);

  return (
    <Container as="main" className="grow-container" spacing="py-4w">
      <Row gutters alignItems="middle">
        <Col>
          <Title as="h1">Modification du mot de passe</Title>
          {passwordFormState === FormState.Error && (
            <div className="fr-my-2w">
              <Alert
                title="Erreur"
                description="Une erreur s'est produite, veuillez réessayer"
                type="error"
              />
            </div>
          )}
          {passwordFormState === FormState.Succeed ? (
            <div className="fr-my-2w">
              <Alert
                title=""
                description="La modification du mot de passe a bien été effectuée"
                type="success"
              />
            </div>
          ) : (
            <form onSubmit={submit} id="account_password_form">
              <TextInput
                value={currentPassword}
                type="password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                messageType={messageType('currentPassword')}
                message={message('currentPassword', 'Mot de passe renseigné.')}
                label="Mot de passe actuel : "
                required
              />
              <TextInput
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                messageType={messageType('password')}
                label="Nouveau mot de passe : "
                required
              />
              {messageList('password')?.map((message, i) => (
                <p className={`fr-${message.type}-text`} key={i}>
                  {message.text}
                </p>
              ))}
              <TextInput
                value={passwordConfirmation}
                type="password"
                className="fr-mt-3w"
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                messageType={messageType('passwordConfirmation')}
                message={message(
                  'passwordConfirmation',
                  'Mots de passe identiques.'
                )}
                label="Confirmation du nouveau mot de passe : "
                required
              />
              <Button submit title="Valider" data-testid="login-button">
                Valider
              </Button>
            </form>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default AccountPasswordView;
