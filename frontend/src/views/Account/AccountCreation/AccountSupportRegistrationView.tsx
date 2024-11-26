import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { Redirect, useHistory } from 'react-router-dom';
import { login } from '../../../store/actions/authenticationAction';
import { Prospect } from '../../../models/Prospect';
import { useAppDispatch } from '../../../hooks/useStore';
import { useCreateUserMutation } from '../../../services/user.service';
import Image from '../../../components/Image/Image';
import image from '../../../assets/images/one-hour.svg';
import { toast } from 'react-toastify';

interface State {
  prospect: Prospect;
  password: string;
}

function AccountSupportRegistrationView() {
  const dispatch = useAppDispatch();
  const router = useHistory<State | undefined>();
  const { location } = router;
  const prospect = location.state?.prospect;
  const password = location.state?.password;

  const [createUser] = useCreateUserMutation();
  async function createAccount() {
    if (prospect && password && prospect.establishment) {
      try {
        // Save user and remove prospect
        await createUser({
          email: prospect.email,
          password,
          establishmentId: prospect.establishment.id
        }).unwrap();
        await dispatch(
          login(prospect.email, password, prospect.establishment.id)
        );
        router.push('/parc-de-logements');
      } catch (error) {
        console.error(error);
        toast.error(
          'Une erreur est survenue lors de la création de votre compte'
        );
      }
    }
  }

  if (!location.state || !prospect || !password) {
    return <Redirect to="/inscription/email" />;
  }

  return (
    <Grid container>
      <Grid container xs={7}>
        <Grid xs={12}>
          <Stepper
            stepCount={3}
            currentStep={3}
            title="Vos premiers pas accompagnés sur ZLV"
          />
          <Typography
            component="h1"
            variant="body1"
            sx={{
              fontSize: '1.125rem',
              fontWeight: 700,
              mb: 3,
              lineHeight: fr.spacing('7v')
            }}
          >
            Pour prendre en main rapidement ZLV, inscrivez-vous à une session de
            prise en main (1h) afin de découvrir les principales fonctionnalités
            de la plateforme. Cette inscription est optionnelle, mais
            recommandée.
          </Typography>

          <iframe
            width="100%"
            height="480"
            src="https://app.livestorm.co/p/1b26afab-3332-4b6d-a9e4-3f38b4cc6c43/form"
          />
        </Grid>

        <Grid
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginTop: 4
          }}
          xs={12}
        >
          <Button
            iconId="fr-icon-arrow-left-line"
            onClick={() => router.goBack()}
            priority="tertiary"
          >
            Revenir à l’étape précédente
          </Button>

          <Button onClick={createAccount}>Créer mon compte</Button>
        </Grid>
      </Grid>

      <Grid
        sx={{
          display: 'flex',
          justifyContent: 'flex-end'
        }}
        xs={3}
        xsOffset={2}
      >
        <Image
          alt="Une heure, temps nécessaire pour prendre en main l’outil Zéro Logement Vacant dans le cadre d’une session de prise en main"
          responsive="max-width"
          src={image}
        />
      </Grid>
    </Grid>
  );
}

export default AccountSupportRegistrationView;
