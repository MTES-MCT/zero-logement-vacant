import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type FormEvent, useState } from 'react';
import { object } from 'yup';

import building from '../../assets/images/building.svg';
import AppTextInput from '../../components/_app/AppTextInput/AppTextInput';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useEmailLink } from '../../hooks/useEmailLink';
import {
  passwordConfirmationValidator,
  passwordFormatValidator,
  useForm
} from '../../hooks/useForm';
import resetLinkService from '../../services/reset-link.service';
import { clearPasswordResetToken } from '../../utils/password-reset-token';

const PASSWORD_REQUIRED_MESSAGE = 'Veuillez renseigner votre mot de passe.';

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
    password: passwordFormatValidator.required(PASSWORD_REQUIRED_MESSAGE),
    passwordConfirmation: passwordConfirmationValidator
  };
  type FormShape = typeof shape;

  const form = useForm(
    object().shape(shape) as any,
    {
      password,
      passwordConfirmation
    },
    ['password']
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      setError('');
      await form.validate(async () => {
        await resetLinkService.resetPassword(resetLink.hash, password);
        clearPasswordResetToken();
        setPasswordReset(true);
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!resetLink.exists) {
    return (
      <Container
        component="main"
        className="grow-container"
        maxWidth="xl"
        sx={{ py: '2rem' }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid size="grow">
            <Typography component="h1" variant="h4" mb={3}>
              Ce lien n’existe pas ou est expiré !
            </Typography>
            <Typography component="p" variant="body1">
              Recommencez la procédure ou contactez le support.
            </Typography>
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button linkProps={{ to: '/', replace: true }}>
                Revenir à l’accueil
              </Button>
            </Stack>
          </Grid>
          <Grid size={5} offset={1} className="align-right">
            <img
              src={building}
              style={{ width: '100%', height: '100%' }}
              alt=""
            />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (passwordReset) {
    return (
      <Container
        component="main"
        className="grow-container"
        maxWidth="xl"
        sx={{ py: '2rem' }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid size="grow">
            <div role="status">
              <Typography component="h1" variant="h4" mb={3}>
                Votre mot de passe a été réinitialisé !
              </Typography>
              <Typography component="p" variant="body1">
                Essayez de vous connecter en utilisant votre nouveau mot de
                passe.
              </Typography>
            </div>
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button linkProps={{ to: '/connexion' }}>Se connecter</Button>
            </Stack>
          </Grid>
          <Grid size={5} offset={1} className="align-right">
            <img
              src={building}
              style={{ width: '100%', height: '100%' }}
              alt=""
            />
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container
      component="main"
      className="grow-container"
      maxWidth="xl"
      sx={{ py: '2rem' }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid size="grow">
          {error && (
            <Alert
              title="Erreur"
              description={error}
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
            {form
              .messageList('password')
              .filter((message) => message.text !== PASSWORD_REQUIRED_MESSAGE)
              .map((message, i) => {
                const status = form.isTouched('password')
                  ? message.type
                  : 'default';
                return (
                  <p
                    className={
                      status === 'default' ? undefined : `fr-${status}-text`
                    }
                    key={i}
                  >
                    <span className="fr-sr-only">
                      {status === 'error'
                        ? 'Critère non respecté : '
                        : status === 'valid'
                          ? 'Critère respecté : '
                          : 'Critère à respecter : '}
                    </span>
                    {message.text}
                  </p>
                );
              })}
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
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button type="submit">Enregistrer le nouveau mot de passe</Button>
            </Stack>
          </form>
        </Grid>
        <Grid size={5} offset={1} className="align-right">
          <img
            src={building}
            style={{ width: '100%', height: '100%' }}
            alt=""
          />
        </Grid>
      </Grid>
    </Container>
  );
}

export default ResetPasswordView;
