import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import * as yup from 'yup';

import EstablishmentSearchableSelect from '~/components/establishment/EstablishmentSearchableSelect';
import Image from '~/components/Image/Image';
import { useAsyncSubmission } from '~/hooks/useAsyncSubmission';
import { useAuth } from '~/hooks/useAuth';

import building from '../../assets/images/building.svg';
import AppLink from '../../components/_app/AppLink/AppLink';
import AppTextInputNext from '../../components/_app/AppTextInput/AppTextInputNext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { type Establishment } from '../../models/Establishment';

const schema = yup
  .object({
    isAdmin: yup.boolean().required(),
    email: yup
      .string()
      .trim()
      .required('Veuillez renseigner votre adresse email.')
      .email(
        "L'adresse doit être un email valide. Exemple de format valide : exemple@gmail.com"
      ),
    password: yup
      .string()
      .trim()
      .required('Veuillez renseigner un mot de passe.'),
    establishmentId: yup
      .string()
      .required()
      .nullable()
      .default(undefined)
      .when('isAdmin', {
        is: true,
        then: (schema) =>
          schema.nonNullable('Veuillez sélectionner un établissement.')
      })
  })
  .required();

export type LoginSchema = yup.InferType<typeof schema>;

const LoginView = () => {
  useDocumentTitle('Connexion');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // AuthProvider is mounted at app boot: route login through Better Auth's
  // cookie session. Admin login uses a dedicated 2FA endpoint.
  const auth = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const { isSubmitting: isLoginPending, submit: submitLogin } =
    useAsyncSubmission();

  const [establishment, setEstablishment] = useState<Establishment | null>(
    null
  );

  const isAdminView = pathname === '/admin';
  const form = useForm<LoginSchema>({
    defaultValues: {
      isAdmin: isAdminView,
      email: '',
      password: '',
      establishmentId: null
    },
    resolver: yupResolver(schema)
  });

  async function submitLoginForm(data: LoginSchema): Promise<void> {
    if (isAdminView) {
      if (!data.establishmentId) {
        form.setError('establishmentId', {
          message: 'Veuillez sélectionner un établissement.'
        });
        return;
      }
      const establishmentId = data.establishmentId;
      await submitLogin(async () => {
        setAuthError(null);
        try {
          const challenge = await auth.signInAdmin(
            data.email,
            data.password,
            establishmentId
          );
          if (challenge.requiresTwoFactor) {
            navigate('/verification-2fa', {
              state: {
                email: challenge.email,
                establishmentId
              }
            });
          } else {
            navigate('/parc-de-logements');
          }
        } catch (error) {
          setAuthError(
            error instanceof Error
              ? error.message
              : 'Échec de l’authentification.'
          );
        }
      });
      return;
    }

    await submitLogin(async () => {
      setAuthError(null);
      try {
        await auth.signIn(data.email, data.password);
        navigate('/parc-de-logements');
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Échec de l’authentification.'
        );
      }
    });
  }

  return (
    <FormProvider {...form}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            {authError ? (
              <Box data-testid="alert-error" sx={{ my: 2 }}>
                <Alert
                  title="Erreur"
                  description={authError}
                  severity="error"
                />
              </Box>
            ) : null}
            <Typography component="h1" variant="h2" mb={3}>
              Connexion
            </Typography>
            <form
              onSubmit={form.handleSubmit(submitLoginForm)}
              id="login_form"
              noValidate
            >
              <AppTextInputNext
                name="email"
                label="Adresse e-mail (obligatoire)"
                hintText="Format attendu : prenom.nom@domaine.fr"
                nativeInputProps={{
                  type: 'email',
                  autoComplete: 'email',
                  'aria-required': 'true'
                }}
              />
              <AppTextInputNext
                name="password"
                label="Mot de passe (obligatoire)"
                className={isAdminView ? '' : 'fr-mb-1w'}
                nativeInputProps={{
                  type: 'password',
                  autoComplete: 'current-password',
                  'aria-required': 'true'
                }}
              />
              {isAdminView && (
                <EstablishmentSearchableSelect
                  className={fr.cx('fr-mb-2w')}
                  label="Collectivité (obligatoire)"
                  value={establishment}
                  error={form.formState.errors.establishmentId?.message}
                  onChange={(establishment) => {
                    if (establishment) {
                      setEstablishment(establishment);
                      form.setValue('establishmentId', establishment.id, {
                        shouldValidate: true
                      });
                    }
                  }}
                />
              )}
              <Box sx={{ mb: 4 }}>
                <AppLink to="/mot-de-passe/oublie" isSimple>
                  Mot de passe perdu ?
                </AppLink>
              </Box>
              {isLoginPending ? (
                <Stack
                  direction="row"
                  alignItems="center"
                  gap="1rem"
                  sx={{ mt: '0.5rem' }}
                >
                  <CircularProgress
                    size="1.5rem"
                    sx={{
                      color:
                        fr.colors.decisions.text.actionHigh.blueFrance.default,
                      flexShrink: 0
                    }}
                  />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Connexion en cours, veuillez patienter quelques instants…
                  </Typography>
                </Stack>
              ) : (
                <Grid container alignItems="center" spacing={2}>
                  <Grid size={{ xs: 12, md: 9 }}>
                    <Typography component="p" variant="body1">
                      Première visite ?&nbsp;
                      <AppLink
                        to="/inscription"
                        isSimple
                        iconId="fr-icon-arrow-right-line"
                        iconPosition="right"
                      >
                        Créer votre compte
                      </AppLink>
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }} sx={{ textAlign: 'right' }}>
                    <Button type="submit">Se connecter</Button>
                  </Grid>
                </Grid>
              )}
            </form>
          </Grid>
          <Grid
            size={{ xs: 0, md: 5 }}
            offset={{ md: 1 }}
            sx={{ textAlign: 'end' }}
          >
            <Image src={building} responsive="max-width" alt="" />
          </Grid>
        </Grid>
      </Container>
    </FormProvider>
  );
};

export default LoginView;
