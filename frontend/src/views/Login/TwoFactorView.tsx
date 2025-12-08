import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormProvider, useForm } from 'react-hook-form';
import { object, string, type InferType } from 'yup';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '~/hooks/useStore';
import { verifyTwoFactor } from '~/store/thunks/auth-thunks';
import Image from '~/components/Image/Image';
import securityIcon from '~/assets/images/building.svg';

const schema = object({
  code: string()
    .required('Veuillez renseigner le code de vérification.')
    .length(6, 'Le code doit contenir 6 chiffres')
    .matches(/^\d{6}$/, 'Le code doit contenir uniquement des chiffres')
});

type FormSchema = InferType<typeof schema>;

interface TwoFactorState {
  email: string;
  establishmentId?: string;
}

const TwoFactorView = () => {
  useDocumentTitle('Vérification en deux étapes');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAppSelector((state) => state.authentication);

  // Get email from location state (passed from LoginView)
  const state = location.state as TwoFactorState | undefined;
  const email = state?.email;
  const establishmentId = state?.establishmentId;

  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormSchema>({
    defaultValues: {
      code: ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  if (!email) {
    // If no email in state, redirect back to login
    navigate('/admin');
    return null;
  }

  function submit(data: FormSchema): void {
    setError(null);

    dispatch(
      verifyTwoFactor({
        email: email!,
        code: data.code,
        establishmentId
      })
    )
      .unwrap()
      .then(() => {
        navigate('/parc-de-logements');
      })
      .catch((error) => {
        console.error('2FA verification failed', error);
        setError(
          'Code de vérification invalide ou expiré. Veuillez vérifier votre email et réessayer.'
        );
      });
  }

  return (
    <Container maxWidth="xl" sx={{ py: '4rem' }}>
      <Grid container spacing={4}>
        <Grid size={6}>
          <Typography component="h1" variant="h2" sx={{ mb: '1.5rem' }}>
            Vérification en deux étapes
          </Typography>

          <Typography sx={{ mb: 3 }}>
            Saisissez le code de vérification à 6 chiffres envoyé à l’adresse mail <strong>{email}</strong>. Ce code est valable 5 minutes.
          </Typography>

          <Alert
            description="Après 3 tentatives infructueuses, votre compte sera verrouillé pendant 15 minutes."
            severity="warning"
            small
            className={fr.cx('fr-mb-3w')}
          />

          {error && (
            <div data-testid="alert-error" className="fr-my-2w">
              <Alert title="Erreur" description={error} severity="error" />
            </div>
          )}

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(submit)} id="2fa_form">
              <AppTextInputNext<FormSchema['code']>
                name="code"
                label="Code de vérification (6 chiffres)"
                nativeInputProps={{
                  type: 'text',
                  inputMode: 'numeric',
                  pattern: '[0-9]{6}',
                  maxLength: 6,
                  autoComplete: 'one-time-code',
                  placeholder: '000000',
                  autoFocus: true
                }}
              />

              <Box sx={{ mt: 2, mb: 3 }}>
                <Typography className="fr-hint-text">
                  Vous n&apos;avez pas reçu le code ?{' '}
                  <button
                    type="button"
                    className="fr-link fr-link--xs"
                    onClick={() => {
                      navigate('/admin', {
                        state: { email }
                      });
                    }}
                  >
                    Retour à la connexion
                  </button>
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  type="button"
                  priority="secondary"
                  onClick={() => navigate('/admin')}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={auth.verifyTwoFactor.isLoading}
                  iconId="fr-icon-lock-line"
                  iconPosition="left"
                >
                  {auth.verifyTwoFactor.isLoading ? 'Vérification...' : 'Vérifier'}
                </Button>
              </Stack>
            </form>
          </FormProvider>
        </Grid>

        <Grid size={{ xs: 0, md: 6 }}>
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ height: '100%' }}
          >
            <Stack alignItems="center" spacing={2}>
              <Image
                src={securityIcon}
                alt="Sécurité renforcée"
              />
              <Typography variant="h4" sx={{ color: fr.colors.decisions.text.label.blueFrance.default }}>
                Sécurité renforcée
              </Typography>
              <Typography variant="body1" sx={{ color: fr.colors.decisions.text.mention.grey.default, textAlign: 'center' }}>
                L&apos;authentification en deux étapes protège votre compte
                contre les accès non autorisés
              </Typography>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TwoFactorView;
