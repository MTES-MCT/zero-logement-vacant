import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { yupResolver } from '@hookform/resolvers/yup';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { object, type InferType } from 'yup';

import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import building from '~/assets/images/building.svg';
import AppLinkAsButton from '~/components/_app/AppLinkAsButton/AppLinkAsButton';
import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { emailValidator } from '~/hooks/useForm';
import { useHide } from '~/hooks/useHide';
import resetLinkService from '~/services/reset-link.service';


import styles from './forgotten-password-view.module.scss';

interface EmailSentProps {
  hidden?: boolean;
  submit?(): void;
}

function EmailSent(props: EmailSentProps) {
  const confirmationClasses = classNames('fr-valid-text', {
    [styles.hidden]: props.hidden
  });

  return (
    <>
      <Typography component="p" variant="body1">
        Un email vous a été envoyé avec les instructions à suivre.
      </Typography>
      <Typography component="p" variant="body1" className="subtitle">
        Vous ne trouvez pas le mail ? Vérifiez qu’il ne s’est pas glissé dans
        vos spams ou 
        <AppLinkAsButton
          isSimple
          onClick={() => {
            props.submit?.();
          }}
        >
          renvoyer le mail
        </AppLinkAsButton>
        .
      </Typography>
      <Typography component="p" variant="body2" className={confirmationClasses}>
        Email envoyé.
      </Typography>
    </>
  );
}

const schema = object({
  email: emailValidator
});

type FormValues = InferType<typeof schema>;

function ForgottenPasswordView() {
  useDocumentTitle('Mot de passe oublié');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const { hidden, setHidden } = useHide();

  const form = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: ''
    },
    mode: 'onBlur'
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await resetLinkService.sendResetEmail(data.email);
      setEmailSent(true);
      setHidden(false);
      form.reset(); // Reset form after successful submission
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Container component="main" maxWidth="xl" className="grow-container" sx={{ py: '2rem' }}>
      <Grid container spacing={2} alignItems="center">
        <Grid size="grow">
          {error && (
            <Alert
              title="Erreur"
              description="Impossible d'envoyer l'email."
              className="fr-my-3w"
              closable
              severity="error"
            />
          )}
          <Typography component="h1" variant="h4" mb={3}>
            Réinitialisation de votre mot de passe
          </Typography>
          {emailSent ? (
            <EmailSent hidden={hidden} submit={form.handleSubmit(onSubmit)} />
          ) : (
            <>
              <Typography component="p" variant="body1">
                Vous allez <b>recevoir un email</b> qui vous permettra de créer
                un nouveau mot de passe.
              </Typography>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <AppTextInputNext<FormValues>
                  name="email"
                  hintText="Entrez l'adresse mail utilisée pour créer votre compte ZLV"
                  control={form.control}
                  data-testid="email-input"
                  label="Adresse email (obligatoire)"
                  nativeInputProps={{
                    type: 'email',
                    placeholder: 'exemple@gmail.com',
                    autoComplete: 'email'
                  }}
                />
                <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                  <Button type="submit">
                    Envoyer un email de réinitialisation
                  </Button>
                </Stack>
              </form>
            </>
          )}
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

export default ForgottenPasswordView;
