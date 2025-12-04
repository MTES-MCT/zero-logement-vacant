import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import type { EstablishmentDTO } from '@zerologementvacant/models';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';

import EstablishmentSearchableSelect from '~/components/establishment/EstablishmentSearchableSelect';
import building from '../../assets/images/building.svg';
import AppLink from '../../components/_app/AppLink/AppLink';
import AppTextInputNext from '../../components/_app/AppTextInput/AppTextInputNext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { logIn } from '../../store/thunks/auth-thunks';
import Image from '~/components/Image/Image';

const schema = yup.object({
  isAdmin: yup.boolean().required(),
  email: yup.string()
    .trim()
    .required('Veuillez renseigner votre adresse email.')
    .email(
      'L\'adresse doit être un email valide. Exemple de format valide : exemple@gmail.com'
    ),
  password: yup.string().trim().required('Veuillez renseigner un mot de passe.'),
  establishmentId: yup.string()
    .optional()
    .nullable()
    .default(undefined)
    .when('isAdmin', ([isAdmin], schema) =>
      isAdmin === true
        ? schema.required('Veuillez sélectionner un établissement.')
        : schema
    )
}).required();

export type LoginSchema = yup.InferType<typeof schema>;

const LoginView = () => {
  useDocumentTitle('Connexion');
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.authentication);

  const [establishment, setEstablishment] = useState<EstablishmentDTO | null>(
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
    resolver: yupResolver(schema) as any
  });

  function submitLoginForm(data: LoginSchema): void {
    dispatch(
      logIn({
        email: data.email,
        password: data.password,
        establishmentId: data.establishmentId || undefined
      })
    )
      .unwrap()
      .then((response) => {
        // Check if 2FA is required
        if ('requiresTwoFactor' in response && response.requiresTwoFactor) {
          // Redirect to 2FA verification page
          navigate('/verification-2fa', {
            state: {
              email: response.email,
              establishmentId: data.establishmentId || undefined
            }
          });
        } else {
          // Normal login, redirect to dashboard
          navigate('/parc-de-logements');
        }
      })
      .catch((error) => {
        console.error('Authentication failed', error);
      });
  }

  return (
    <FormProvider {...form}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            {auth.logIn.isError ? (
              <Box data-testid="alert-error" sx={{ my: 2 }}>
                <Alert
                  title="Erreur"
                  description="Échec de l’authentification"
                  severity="error"
                />
              </Box>
            ) : null}
            <Typography component="h1" variant="h2" mb={3}>
              Connexion
            </Typography>
            <form onSubmit={form.handleSubmit(submitLoginForm)} id="login_form">
              <AppTextInputNext
                name="email"
                label="Adresse e-mail (obligatoire)"
                nativeInputProps={{
                  type: 'email',
                  autoComplete: 'email',
                }}
              />
              <AppTextInputNext
                name="password"
                label="Mot de passe (obligatoire)"
                className={isAdminView ? '' : 'fr-mb-1w'}
                nativeInputProps={{
                  type: 'password',
                  autoComplete: 'current-password'
                }}
              />
              {isAdminView && (
                <EstablishmentSearchableSelect
                  className={fr.cx('fr-mb-2w')}
                  label="Collectivité"
                  value={establishment}
                  onChange={(establishment) => {
                    if (establishment) {
                      setEstablishment(establishment);
                      form.setValue('establishmentId', establishment.id);
                    }
                  }}
                />
              )}
              <Box sx={{ mb: 4 }}>
                <AppLink to="/mot-de-passe/oublie" isSimple>
                  Mot de passe perdu ?
                </AppLink>
              </Box>
              <Grid container alignItems="center" spacing={2}>
                <Grid size={{ xs: 12, md: 9 }}>
                  <Typography component="span" variant="body1">
                    Première visite ?&nbsp;
                  </Typography>
                  <AppLink
                    to="/inscription"
                    isSimple
                    iconId="fr-icon-arrow-right-line"
                    iconPosition="right"
                  >
                    Créer votre compte
                  </AppLink>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }} sx={{ textAlign: 'right' }}>
                  <Button type="submit">
                    Se connecter
                  </Button>
                </Grid>
              </Grid>
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
