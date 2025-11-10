import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { yupResolver } from '@hookform/resolvers-next/yup';
import { FormProvider, useForm } from 'react-hook-form';
import { object, string, type InferType } from 'yup-next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import { Col, Row, Text } from '../../components/_dsfr';
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
    // @ts-expect-error: typescript resolves types from yup (v0) instead of yup-next (v1)
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
        email,
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

          <Text as="p" size="lg" className={fr.cx('fr-mb-3w')}>
            Un code de vérification à 6 chiffres a été envoyé à l'adresse{' '}
            <strong>{email}</strong>
          </Text>

          <Text as="p" size="md" className={fr.cx('fr-mb-3w')}>
            Ce code est valable pendant 10 minutes. Veuillez le saisir ci-dessous pour
            accéder à votre compte administrateur.
          </Text>

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

              <Row spacing="mb-3w" className={fr.cx('fr-mt-2w')}>
                <Text as="p" size="sm" className="fr-hint-text">
                  Vous n'avez pas reçu le code ?{' '}
                  <button
                    type="button"
                    className="fr-link"
                    onClick={() => {
                      navigate('/admin', {
                        state: { email }
                      });
                    }}
                  >
                    Retour à la connexion
                  </button>
                </Text>
              </Row>

              <Row alignItems="middle" justifyContent="space-between">
                <Col>
                  <Button
                    type="button"
                    priority="secondary"
                    onClick={() => navigate('/admin')}
                  >
                    Annuler
                  </Button>
                </Col>
                <Col>
                  <Button
                    type="submit"
                    disabled={auth.logIn.isLoading}
                    iconId="fr-icon-lock-line"
                    iconPosition="left"
                  >
                    {auth.logIn.isLoading ? 'Vérification...' : 'Vérifier'}
                  </Button>
                </Col>
              </Row>
            </form>
          </FormProvider>
        </Grid>

        <Grid size={6} sx={{ display: { xs: 'none', md: 'block' } }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Image
                src={securityIcon}
                alt="Sécurité renforcée"
                style={{ maxWidth: '300px', marginBottom: '2rem' }}
              />
              <Typography variant="h4" sx={{ color: fr.colors.decisions.text.label.blueFrance.default, mb: 2 }}>
                Sécurité renforcée
              </Typography>
              <Typography variant="body1" sx={{ color: fr.colors.decisions.text.mention.grey.default }}>
                L'authentification en deux étapes protège votre compte
                contre les accès non autorisés
              </Typography>
            </div>
          </div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TwoFactorView;
