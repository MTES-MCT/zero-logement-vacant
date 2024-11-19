import { fr } from '@codegouvfr/react-dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import Image from '../../../components/Image/Image';
import image from '../../../assets/images/fifty-hours.svg';

function AccountAccessForbiddenView() {
  return (
    <Grid container>
      <Grid xs={7}>
        <Typography component="h1" variant="h6" sx={{ mb: fr.spacing('3v') }}>
          Votre adresse e-mail n’a pas été reconnue. Vous n’êtes pas autorisé à
          accéder à Zéro Logement Vacant.
        </Typography>
        <Typography sx={{ mb: fr.spacing('3v') }}>
          Seul les usagers autorisés à accéder aux données LOVAC peuvent créer
          un compte Zéro Logement Vacant. Vous trouverez quelques informations
          ci-dessous en fonction de votre situation.
        </Typography>

        <Accordion label="Votre structure n’est pas autorisée à accéder aux données LOVAC">
          <Typography variant="body2">
            Pour pouvoir accéder à Zéro Logement Vacant, vous devez effectuer
            une demande d‘accès aux données LOVAC via le&nbsp;
            <a
              className="fr-link--sm"
              href="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
            >
              portail Données Foncières du Cerema
            </a>
            . Pour cela, créez votre compte sur ce portail et effectuez une
            demande d‘accès au niveau 3 - LOVAC. Si votre accès a expiré,
            demandez à prolonger votre accès sur le portail.
          </Typography>
        </Accordion>

        <Accordion label="Votre structure est autorisée à accéder aux données LOVAC mais votre e-mail ne correspond pas à celui qui a été utilisé pour effectuer la demande">
          <Typography variant="body2">
            Dans ce cas, créez votre compte sur le&nbsp;
            <a
              className="fr-link--sm"
              href="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
            >
              portail Données Foncières du Cerema
            </a>
            &nbsp;et effectuez une demande de rattachement à votre structure.
            C‘est la personne gestionnaire de la structure qui pourra valider
            votre demande de rattachement via ce même portail.
          </Typography>
        </Accordion>

        <Accordion label="Une ou plusieurs personnes de votre structure ont déjà des accès à Zéro Logement Vacant mais votre e-mail n’a pas été rattaché">
          <Typography variant="body2">
            Vous devez impérativement avoir créé un compte sur le&nbsp;
            <a
              className="fr-link--sm"
              href="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
            >
              portail Données Foncières du Cerema
            </a>
            &nbsp;pour pouvoir créer un compte ZLV. Validez les Conditions
            Générales d‘Utilisation pour finaliser la création de votre compte
            utilisateur et obtenir l‘autorisation de créer votre compte ZLV.
          </Typography>
        </Accordion>

        <Button
          className={fr.cx('fr-mt-4w')}
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

export default AccountAccessForbiddenView;
