import { useState } from 'react';
import { Col, Container, Row } from '../../components/_dsfr';

import * as yup from 'yup';
import {
  passwordConfirmationValidator,
  passwordFormatValidator,
  useForm
} from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import AccountSideMenu from './AccountSideMenu';
import { useUpdatePasswordMutation } from '../../services/user-account.service';
import AppTextInput from '../../components/_app/AppTextInput/AppTextInput';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Card from '@codegouvfr/react-dsfr/Card';
import Typography from '@mui/material/Typography';

const AccountPasswordView = () => {
  useDocumentTitle('Votre mot de passe');

  const [
    updateUserPassword,
    { isSuccess: isUpdateSuccess, error: updateError }
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
    passwordConfirmation: passwordConfirmationValidator
  };
  type FormShape = typeof shape;

  const form = useForm(
    yup.object().shape(shape),
    {
      currentPassword,
      password,
      passwordFormat: password,
      passwordConfirmation
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
              border={false}
              size="small"
              className="fr-px-3w fr-py-2w"
              title={
                <Typography component="h1" variant="h4" mb={0}>
                  Réinitialisation de votre mot de passe
                </Typography>
              }
              desc={
                <>
                  {isUpdateSuccess ? (
                    <Alert
                      severity="success"
                      description="La modification du mot de passe a bien été effectuée"
                      closable
                      small
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
                        onChange={(e) =>
                          setPasswordConfirmation(e.target.value)
                        }
                        inputForm={form}
                        inputKey="passwordConfirmation"
                        whenValid="Mots de passe identiques."
                        label="Confirmation du nouveau mot de passe (obligatoire)"
                        required
                      />
                      {updateError && (
                        <Alert
                          severity="error"
                          description={
                            (updateError as any).status === 403
                              ? "Votre mot de passe actuel n'est pas valide"
                              : "Une erreur s'est produite, veuillez réessayer."
                          }
                          closable
                          small
                          className="fr-mb-2w"
                        />
                      )}
                      <Button
                        priority="secondary"
                        className="fr-mr-2w"
                        linkProps={{ to: '/compte' }}
                      >
                        Annuler
                      </Button>
                      <Button title="Valider" onClick={submit}>
                        Réinitialiser votre mot de passe
                      </Button>
                    </form>
                  )}
                </>
              }
            ></Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default AccountPasswordView;
