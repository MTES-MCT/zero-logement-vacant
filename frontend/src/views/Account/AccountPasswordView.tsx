import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Col,
  Container,
  Row,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';

import * as yup from 'yup';
import {
  passwordConfirmationValidator,
  passwordValidator,
  useForm,
} from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import AccountSideMenu from './AccountSideMenu';
import { useUpdatePasswordMutation } from '../../services/user-account.service';
import { useHistory } from 'react-router-dom';

const AccountPasswordView = () => {
  useDocumentTitle('Votre mot de passe');

  const history = useHistory();

  const [
    updateUserPassword,
    { isSuccess: isUpdateSuccess, error: updateError },
  ] = useUpdatePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const form = yup.object().shape({
    currentPassword: yup
      .string()
      .required('Veuillez renseigner votre mot de passe actuel.'),
    password: passwordValidator,
    passwordConfirmation: passwordConfirmationValidator,
  });
  const { validate, message, messageList, messageType } = useForm(form, {
    currentPassword,
    password,
    passwordConfirmation,
  });

  const submit = async () => {
    await validate(() =>
      updateUserPassword({ currentPassword, newPassword: password })
    );
  };

  return (
    <Container as="main" className="bg-100" fluid>
      <Container as="section">
        <Row alignItems="top" gutters spacing="mt-3w mb-0">
          <Col n="4">
            <AccountSideMenu />
          </Col>
          <Col n="8">
            <Card hasArrow={false} hasBorder={false} size="sm">
              <CardTitle>
                <Title as="h1" look="h4" spacing="mb-0">
                  Réinitialisation de votre mot de passe
                </Title>
              </CardTitle>
              <CardDescription>
                {isUpdateSuccess ? (
                  <Alert
                    type="success"
                    description="La modification du mot de passe a bien été effectuée"
                    closable
                    className="fr-mb-2w"
                  />
                ) : (
                  <form id="account_password_form">
                    <TextInput
                      value={currentPassword}
                      type="password"
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      messageType={messageType('currentPassword')}
                      message={message(
                        'currentPassword',
                        'Mot de passe renseigné.'
                      )}
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
                    {updateError && (
                      <Alert
                        type="error"
                        description={
                          (updateError as any).status === 403
                            ? "Votre mot de passe actuel n'est pas valide"
                            : "Une erreur s'est produite, veuillez réessayer."
                        }
                        closable
                        className="fr-mb-2w"
                      />
                    )}
                    <Button
                      title="Annuler"
                      secondary
                      className="fr-mr-2w"
                      onClick={() => history.push('/compte')}
                    >
                      Annuler
                    </Button>
                    <Button title="Valider" onClick={() => submit()}>
                      Réinitialiser votre mot de passe
                    </Button>
                  </form>
                )}
              </CardDescription>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default AccountPasswordView;
