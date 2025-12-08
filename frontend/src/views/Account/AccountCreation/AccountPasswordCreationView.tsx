import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import { yupResolver } from '@hookform/resolvers/yup';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { FormProvider, useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { type InferType, object } from 'yup';

import {
  passwordConfirmationValidator,
  passwordFormatValidator
} from '../../../hooks/useForm';
import { Row, Text } from '../../../components/_dsfr';
import AppLink from '../../../components/_app/AppLink/AppLink';
import { useProspect } from '../../../hooks/useProspect';
import AppTextInputNext from '../../../components/_app/AppTextInput/AppTextInputNext';
import image from '../../../assets/images/thousand-structures.svg';
import Image from '../../../components/Image/Image';
import { useCreateUserMutation } from '../../../services/user.service';
import { useAppDispatch } from '../../../hooks/useStore';
import { logIn } from '../../../store/actions/authenticationAction';

const schema = object({
  password: passwordFormatValidator.optional().default(undefined),
  confirmation: passwordConfirmationValidator
}).required();

function AccountPasswordCreationView() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { linkExists, loading, prospect } = useProspect();

  const form = useForm<InferType<typeof schema>>({
    criteriaMode: 'all',
    defaultValues: {
      password: '',
      confirmation: ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const [createUser] = useCreateUserMutation();
  async function submit() {
    const password = form.getValues('password');
    if (prospect && prospect.establishment && password) {
      // Save user and remove prospect
      await createUser({
        email: prospect.email,
        password: password,
        establishmentId: prospect.establishment.id
      });
      await dispatch(
        logIn({
          email: prospect.email,
          password,
          establishmentId: prospect.establishment.id
        })
      );
      navigate('/parc-de-logements', {
        replace: true,
        state: {
          onboarding: true
        }
      });
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!linkExists) {
    return <LinkMissing />;
  }

  if (prospect) {
    if (prospect.hasAccount && !prospect.hasCommitment) {
      return <Navigate to="/inscription/en-attente" />;
    }
    if (
      !prospect.establishment ||
      (!prospect.hasAccount && !prospect.hasCommitment)
    ) {
      return <Navigate to="/inscription/impossible" />;
    }
  }

  return (
    <Grid container>
      <Grid size={7}>
        <Stepper
          stepCount={2}
          currentStep={2}
          title="Définissez votre mot de passe"
          nextTitle="Vos premiers pas accompagnés sur ZLV"
        />

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(submit)}>
            <Grid container>
              <Typography
                sx={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  lineHeight: '1.75rem',
                  marginBottom: '0.75rem'
                }}
              >
                Définissez un mot de passe pour vous connecter à Zéro Logement
                Vacant
              </Typography>

              <Grid sx={{ mb: 4 }} size={8}>
                <AppTextInputNext
                  hintText="Votre mot de passe doit contenir au moins 12 caractères, un chiffre, une majuscule et une minuscule."
                  label="Définissez votre mot de passe (obligatoire)"
                  name="password"
                  nativeInputProps={{
                    type: 'password'
                  }}
                />

                <AppTextInputNext
                  label="Confirmez votre mot de passe (obligatoire)"
                  name="confirmation"
                  nativeInputProps={{
                    type: 'password'
                  }}
                />
              </Grid>
              <Grid
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}
                size={12}
              >
                <Button type="submit">Confirmer et créer mon compte</Button>
              </Grid>
            </Grid>
          </form>
        </FormProvider>
      </Grid>
      <Grid
        sx={{
          display: 'flex',
          justifyContent: 'flex-end'
        }}
        size={4}
        offset={1}
      >
        <Image
          alt="Environ 1000 structures inscrites sur Zéro Logement Vacant sur tout le territoire national"
          responsive="max-width"
          src={image}
        />
      </Grid>
    </Grid>
  );
}

function Loading() {
  return null;
}

function LinkMissing() {
  return (
    <>
      <Typography component="h1" variant="h4" mb={3}>
        Ce lien n’existe pas ou est expiré !
      </Typography>
      <Text>Recommencez la procédure ou contactez le support.</Text>
      <Row>
        <AppLink
          iconId="fr-icon-home-4-fill"
          iconPosition="left"
          isSimple
          to="/"
        >
          Revenir à l’accueil
        </AppLink>
      </Row>
    </>
  );
}

export default AccountPasswordCreationView;
