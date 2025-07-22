import { fr } from '@codegouvfr/react-dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';

import Image from '../../../components/Image/Image';
import image from '../../../assets/images/fifty-hours.svg';
import AppLink from '../../../components/_app/AppLink/AppLink';

function AccountAccessForbiddenView() {
  return (
    <Grid container>
      <Grid size={7}>
        <Typography component="h1" variant="h6" sx={{ mb: fr.spacing('3v') }}>
          Ce mail n’est pas autorisé à accéder à Zéro Logement Vacant.
        </Typography>
        <Typography sx={{ mb: fr.spacing('3v') }}>
          Seules les personnes membres des structures ayant droit d’accéder aux
          données LOVAC — les collectivités territoriales, les EPCI à fiscalité
          propre et les services de l’Etat, ainsi que leurs partenaires —
          peuvent créer un compte ZLV.
        </Typography>

        <Typography sx={{ mb: fr.spacing('3v') }}>
          Si vous êtes membre d‘une de ces structures mais que vous ne parvenez
          pas à créer votre compte, vous êtes donc sans doute dans l’un des cas
          suivants :
        </Typography>

        <Accordion
          label={
            <span className={fr.cx('fr-mr-2w')}>
              Votre structure n’est pas enregistrée comme bénéficiaire des
              données LOVAC sur le portail Données Foncières
            </span>
          }
        >
          <Typography variant="body2">
            Pour pouvoir accéder à Zéro Logement Vacant, vous devez effectuer
            une demande d‘accès aux données LOVAC via &nbsp;
            <a
              className="fr-link--sm"
              href="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
            >
              le portail Données Foncières du Cerema
            </a>
            . Pour cela, créez votre compte sur ce portail et effectuez une
            demande d‘accès au niveau 3 - LOVAC. Si votre accès a expiré,
            demandez à prolonger votre accès sur le portail.
          </Typography>
        </Accordion>

        <Accordion
          label={
            <span className={fr.cx('fr-mr-2w')}>
              Votre structure est enregistrée comme bénéficiaire des données
              LOVAC mais votre mail n’est pas rattaché à la structure sur le
              portail Données Foncières
            </span>
          }
        >
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

        <Accordion
          label={
            <span className={fr.cx('fr-mr-2w')}>
              Votre mail est rattaché à la structure mais vous n’avez pas créé
              votre propre compte utilisateur sur le portail Données Foncières
            </span>
          }
        >
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

        <AppLink
          className={fr.cx('fr-mt-3w')}
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

export default AccountAccessForbiddenView;
