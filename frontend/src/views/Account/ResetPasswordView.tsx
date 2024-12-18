import { Col, Container, Row, Text } from '../../components/_dsfr';
import { FormEvent, useState } from 'react';
import building from '../../assets/images/building.svg';
import * as yup from 'yup';
import {
  passwordConfirmationValidator,
  passwordFormatValidator,
  useForm
} from '../../hooks/useForm';
import authService from '../../services/auth.service';
import { useEmailLink } from '../../hooks/useEmailLink';
import resetLinkService from '../../services/reset-link.service';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import AppTextInput from '../../components/_app/AppTextInput/AppTextInput';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';

function ResetPasswordView() {
  useDocumentTitle('Nouveau mot de passe');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordReset, setPasswordReset] = useState(false);
  const [error, setError] = useState('');
  const resetLink = useEmailLink({
    service: resetLinkService
  });

  const shape = {
    password: yup.string().required('Veuillez renseigner votre mot de passe.'),
    passwordFormat: passwordFormatValidator,
    passwordConfirmation: passwordConfirmationValidator
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    password,
    passwordFormat: password,
    passwordConfirmation
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      await form.validate(async () => {
        await authService.resetPassword(resetLink.hash, password);
        setPasswordReset(true);
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!resetLink.exists) {
    return (
      <Container as="main" className="grow-container" spacing="py-4w">
        <Row gutters alignItems="middle">
          <Col>
            <Typography component="h1" variant="h4" mb={3}>
              Ce lien n’existe pas ou est expiré !
            </Typography>
            <Text>Recommencez la procédure ou contactez le support.</Text>
            <Row justifyContent="right">
              <Button linkProps={{ to: '/', replace: true }}>
                Revenir à l’accueil
              </Button>
            </Row>
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
  }

  if (passwordReset) {
    return (
      <Container as="main" className="grow-container" spacing="py-4w">
        <Row gutters alignItems="middle">
          <Col>
            <Typography component="h1" variant="h4" mb={3}>
              Votre mot de passe a été réinitialisé !
            </Typography>
            <Text>
              Essayez de vous connecter en utilisant votre nouveau mot de passe.
            </Text>
            <Row justifyContent="right">
              <Button linkProps={{ to: '/connexion' }}>Se connecter</Button>
            </Row>
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
  }

  return (
    <Container as="main" className="grow-container" spacing="py-4w">
      <Row gutters alignItems="middle">
        <Col>
          {error && (
            <Alert
              title="Erreur"
              description="Erreur lors de la mise à jour du mot de passe."
              className="fr-my-3w"
              closable
              severity="error"
            />
          )}
          <Typography component="h1" variant="h2" mb={3}>
            Réinitialisation de votre mot de passe
          </Typography>
          <form onSubmit={submit}>
            <AppTextInput<FormShape>
              value={password}
              type="password"
              hintText="Votre mot de passe doit contenir au moins 12 caractères, un chiffre, une majuscule et une minuscule."
              onChange={(e) => setPassword(e.target.value)}
              inputForm={form}
              inputKey="password"
              label="Créer votre mot de passe (obligatoire)"
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
              label="Confirmer votre mot de passe (obligatoire)"
              required
            />
            <Row justifyContent="right">
              <Button type="submit">Enregistrer le nouveau mot de passe</Button>
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
}

export default ResetPasswordView;
