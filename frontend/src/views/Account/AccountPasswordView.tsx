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
  Title,
} from '@dataesr/react-dsfr';

import * as yup from 'yup';
import {
  passwordConfirmationValidator,
  passwordFormatValidator,
  useForm,
} from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import AccountSideMenu from './AccountSideMenu';
import { useUpdatePasswordMutation } from '../../services/user-account.service';
import { useHistory } from 'react-router-dom';
import AppTextInput from '../../components/AppTextInput/AppTextInput';

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

  const shape = {
    currentPassword: yup
      .string()
      .required('Veuillez renseigner votre mot de passe actuel.'),
    password: yup
      .string()
      .required('Veuillez renseigner votre nouveau mot de passe.'),
    passwordFormat: passwordFormatValidator,
    passwordConfirmation: passwordConfirmationValidator,
  };
  type FormShape = typeof shape;

  const form = useForm(
    yup.object().shape(shape),
    {
      currentPassword,
      password,
      passwordFormat: password,
      passwordConfirmation,
    },
    ['passwordFormat']
  );

  const submit = async () => {
    await form.validate(() => {
      updateUserPassword({ currentPassword, newPassword: password });
    });
  };

  return (
    <Container as="main" className="bg-100" fluid>
      <Container as="section">
        <Row alignItems="top" gutters spacing="mt-3w mb-0">
          <Col n="4">
            <AccountSideMenu />
          </Col>
          <Col n="8">
            <Card
              hasArrow={false}
              hasBorder={false}
              size="sm"
              className="fr-px-3w fr-py-2w"
            >
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
                    <AppTextInput<FormShape>
                      value={currentPassword}
                      type="password"
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      inputForm={form}
                      inputKey="currentPassword"
                      whenValid="Mot de passe renseigné."
                      label="Mot de passe actuel (obligatoire)"
                      required
                    />
                    <AppTextInput<FormShape>
                      value={password}
                      type="password"
                      textarea={false}
                      onChange={(e) => setPassword(e.target.value)}
                      inputForm={form}
                      inputKey="password"
                      label="Nouveau mot de passe (obligatoire)"
                      required
                    />
                    {form.messageList('passwordFormat')?.map((message, i) => (
                      <p className={`fr-${message.type}-text`} key={i}>
                        {message.text}
                      </p>
                    ))}
                    <AppTextInput<FormShape>
                      value={passwordConfirmation}
                      type="password"
                      className="fr-mt-3w"
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      inputForm={form}
                      inputKey="passwordConfirmation"
                      whenValid="Mots de passe identiques."
                      label="Confirmation du nouveau mot de passe (obligatoire)"
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
