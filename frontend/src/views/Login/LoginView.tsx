import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { yupResolver } from '@hookform/resolvers-next/yup';
import { FormProvider, useForm } from 'react-hook-form';
import { object, string, type InferType } from 'yup-next';

import type { EstablishmentDTO } from '@zerologementvacant/models';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import building from '~/assets/images/building.svg';
import AppLink from '~/components/_app/AppLink/AppLink';
import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import { Col, Row, Text } from '../../components/_dsfr';
import EstablishmentSearchableSelect from '~/components/establishment/EstablishmentSearchableSelect';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '~/hooks/useStore';
import { logIn } from '~/store/thunks/auth-thunks';
import Image from '~/components/Image/Image';

const emailValidator = string()
  .required('Veuillez renseigner votre adresse email.')
  .email('L’adresse doit être un email valide');

const schema = object({
  email: emailValidator,
  password: string().required('Veuillez renseigner un mot de passe.'),
  establishmentId: string().nullable().default(null)
});

type FormSchema = InferType<typeof schema>;

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

  const form = useForm<FormSchema>({
    defaultValues: {
      email: '',
      password: '',
      establishmentId: null
    },
    mode: 'onSubmit',
    // @ts-expect-error: typescript resolves types from yup (v0) instead of yup-next (v1)
    resolver: yupResolver(schema)
  });

  function submit(data: FormSchema): void {
    dispatch(
      logIn({
        email: data.email,
        password: data.password,
        establishmentId: data.establishmentId || undefined
      })
    )
      .unwrap()
      .then(() => {
        navigate('/parc-de-logements');
      })
      .catch((error) => {
        console.error('Authentication failed', error);
      });
  }

  return (
    <Container maxWidth="xl" sx={{ py: '4rem' }}>
      <Grid container>
        <Grid size="grow">
          <Typography component="h1" variant="h2" sx={{ mb: '1.5rem' }}>
            Connexion
          </Typography>

          {auth.logIn.isError && (
            <div data-testid="alert-error" className="fr-my-2w">
              <Alert
                title="Erreur"
                description="Échec de l’authentification"
                severity="error"
              />
            </div>
          )}

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(submit)} id="login_form">
              <AppTextInputNext<FormSchema['email']>
                name="email"
                label="Adresse email (obligatoire)"
                nativeInputProps={{
                  type: 'email',
                  autoComplete: 'email'
                }}
              />
              <AppTextInputNext<FormSchema['password']>
                name="password"
                label="Mot de passe (obligatoire)"
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
              <Row spacing="mb-4w">
                <AppLink to="/mot-de-passe/oublie" isSimple>
                  Mot de passe perdu ?
                </AppLink>
              </Row>
              <Row alignItems="middle">
                <Col n="9">
                  <Text as="span" size="lg">
                    Première visite ?&nbsp;
                  </Text>
                  <AppLink
                    to="/inscription"
                    isSimple
                    iconId="fr-icon-arrow-right-line"
                    iconPosition="right"
                  >
                    Créer votre compte
                  </AppLink>
                </Col>
                <Col>
                  <Row justifyContent="right">
                    <Button type="submit">Se connecter</Button>
                  </Row>
                </Col>
              </Row>
            </form>
          </FormProvider>
        </Grid>

        <Grid size={5} offset={1} sx={{ textAlign: 'end' }}>
          <Image src={building} responsive="max-width" alt="" />
        </Grid>
      </Grid>
    </Container>
  );
};

export default LoginView;
