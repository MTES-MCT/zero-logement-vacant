import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import Image from '../../../components/Image/Image';
import image from '../../../assets/images/fifty-hours.svg';
import AppLink from '../../../components/_app/AppLink/AppLink';

function AccountAwaitingAccessView() {
  return (
    <Grid container>
      <Grid size={7}>
        <Typography component="h1" variant="h6" sx={{ mb: 2 }}>
          Votre demande d’accès aux données LOVAC n’a pas encore été validée
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Vous avez effectué votre demande d’accès aux données LOVAC via&nbsp;
          <a href="https://datafoncier.cerema.fr/portail-des-donnees-foncieres">
            le portail données foncières du Cerema
          </a>
          &nbsp;mais votre demande n’a pas encore été validée.
        </Typography>
        <Typography sx={{ mb: 3 }}>
          Veuillez réessayer dès que vous aurez reçu le mail de validation de
          votre demande de la part du Cerema.
        </Typography>

        <AppLink
          isSimple
          rel="noreferrer"
          style={{ display: 'block' }}
          target="_blank"
          to="https://zerologementvacant.crisp.help/fr/article/comment-creer-mon-compte-zlv-1bcsydq/"
        >
          Besoin d’aide pour créer votre compte ?
        </AppLink>

        <Button
          className={fr.cx('fr-mt-4w')}
          iconId="fr-icon-arrow-go-back-line"
          linkProps={{
            href: 'https://zerologementvacant.beta.gouv.fr',
            target: '_self'
          }}
          priority="tertiary"
        >
          Retour à la page d’accueil
        </Button>
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
          alt="50 heures de travail de travail économisées en utilisant Zéro Logement Vacant"
          responsive="max-width"
          src={image}
        />
      </Grid>
    </Grid>
  );
}

export default AccountAwaitingAccessView;
