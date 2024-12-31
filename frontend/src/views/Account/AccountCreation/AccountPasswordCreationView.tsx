import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import { yupResolver } from '@hookform/resolvers/yup';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { FormProvider, useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';

import {
  passwordConfirmationValidator,
  passwordFormatValidator
} from '../../../hooks/useForm';
import { Row, Text } from '../../../components/_dsfr';
import AppLink from '../../../components/_app/AppLink/AppLink';
import AppTextInputNext from '../../../components/_app/AppTextInput/AppTextInputNext';
import image from '../../../assets/images/thousand-structures.svg';
import Image from '../../../components/Image/Image';
import { useCreateUserMutation } from '../../../services/user.service';
import { useAppDispatch } from '../../../hooks/useStore';
import { logIn } from '../../../store/actions/authenticationAction';
import { useActivationEmailLink } from '../../../hooks/useActivationEmailLink';
import { useUserAccess } from '../../../hooks/usePortailDFAccess';
import { toast } from 'react-toastify';

const schema = yup
  .object({
    password: passwordFormatValidator,
    confirmation: passwordConfirmationValidator
  })
  .required();

const AccountPasswordCreationView = () => {

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [createUser] = useCreateUserMutation();

  const location = useLocation();
  const link = location.hash.slice(1);
  const { isLoading, activationEmailLink } = useActivationEmailLink(link);

  const form = useForm<yup.InferType<typeof schema>>({
    criteriaMode: 'all',
    defaultValues: {
      password: '',
      confirmation: ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  const { access } = useUserAccess(activationEmailLink);

  if (isLoading) {
    return null;
  }

  if (!activationEmailLink) {
    return <LinkMissing />;
  }

  if (access) {
    if (access.hasAccount && !access.hasCommitment) {
      return <Navigate to="/inscription/en-attente" />;
    }
    if (
      !access.establishmentId ||
      (!access.hasAccount && !access.hasCommitment)
    ) {
      return <Navigate to="/inscription/impossible" />;
    }
  }

  async function submit() {
    const password = form.getValues('password');
    if (password && activationEmailLink && activationEmailLink.prospectEmail) {
      await createUser({
        email: activationEmailLink.prospectEmail,
        password: password,
        establishmentId: access?.establishmentId ?? ''
      });
      await dispatch(
        logIn({
          email: activationEmailLink.prospectEmail,
          password: password,
          establishmentId: access?.establishmentId ?? ''
        })
      );

      toast.success('Compte créé avec succès');

      // hack to wait DSFR to be ready otherwise window.dsfr(...) is null
      await new Promise(resolve => setTimeout(resolve, 2000));

      navigate('/parc-de-logements', {
        replace: true,
        state: {
          onboarding: true
        }
      });
    }
  }

  return (
    <Grid container>
      <Grid xs={7}>
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

              <Grid sx={{ mb: 4 }} xs={8}>
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
                xs={12}
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
        xs={4}
        xsOffset={1}
      >
        <Image
          alt="Environ 1000 structures inscrites sur Zéro Logement Vacant sur tout le territoire national"
          responsive="max-width"
          src={image}
        />
      </Grid>
    </Grid>
  );
};

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
