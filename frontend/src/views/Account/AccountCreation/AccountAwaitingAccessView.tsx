import { fr } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import Image from '../../../components/Image/Image';
import image from '../../../assets/images/fifty-hours.svg';

function AccountAwaitingAccessView() {
  return (
    <Grid container>
      <Grid xs={7}>
        <Typography component="h1" variant="h6" sx={{ mb: 2 }}>
          Votre demande d’accès aux données LOVAC n’a pas encore été validée
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Vous avez signé et transmis l’acte d’engagement permettant d’accéder
          aux données LOVAC via la plateforme Démarche Simplifiées.
        </Typography>
        <Typography sx={{ mb: 3 }}>
          Cependant, votre démarche n’a pas encore été validée. Nous reviendrons
          vers vous le plus rapidement possible pour finaliser la création de
          votre compte.
        </Typography>

        <Alert
          description="L’acte d’engagement n’est valable qu’un an à partir de la date de signature."
          severity="error"
          small
          className={fr.cx('fr-mb-4w')}
        />

        <Button
          iconId="fr-icon-arrow-left-line"
          linkProps={{ to: '/inscription/email' }}
          priority="tertiary"
        >
          Revenir à l’étape précédente
        </Button>
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
          alt="50 heures de travail de travail économisées en utilisant Zéro Logement Vacant"
          responsive="max-width"
          src={image}
        />
      </Grid>
    </Grid>
  );
}

export default AccountAwaitingAccessView;
