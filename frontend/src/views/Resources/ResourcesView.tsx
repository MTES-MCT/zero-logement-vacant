import Tile from '@codegouvfr/react-dsfr/Tile';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import classNames from 'classnames';

import { Icon } from '../../components/_dsfr';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './resources.module.scss';

interface Props {
  title: string;
  linkHref: string;
  linkHrefTarget?: string;
  children: string;
  icon: string;
  iconStyle?: string;
}

function ResourceTile({
  title,
  linkHref,
  linkHrefTarget = '_blank',
  children,
  icon,
  iconStyle
}: Props) {
  return (
    <Tile
      desc={children}
      classes={{ root: 'fr-p-3w', content: styles.tileBody }}
      title={
        <Stack component="section">
          <div>
            <span className={classNames(iconStyle, 'card-title-icon')}>
              <Icon name={icon} iconPosition="center" size="xl" />
            </span>
          </div>
          {title}
        </Stack>
      }
      linkProps={{
        to: linkHref,
        target: linkHrefTarget
      }}
    />
  );
}

function ResourcesView() {
  useDocumentTitle('Ressources');

  return (
    <Container component="main" maxWidth="xl" sx={{ py: '2rem' }}>
      <Typography component="h1" variant="h3" sx={{ mb: '1.5rem' }}>
        Ressources
      </Typography>
      <Grid container spacing="1.5rem">
        <Grid size={6}>
          <ResourceTile
            title="Documentation"
            linkHref="https://zerologementvacant.beta.gouv.fr/documentation/"
            icon="fr-icon-folder-2-fill"
            iconStyle={styles.iconResource}
          >
            Découvrez une sélection de ressources autour de la lutte contre la
            vacance.
          </ResourceTile>
        </Grid>

        <Grid size={6}>
          <ResourceTile
            title="Communauté"
            linkHref="https://zerologementvacant.beta.gouv.fr/communaut%C3%A9/"
            icon="fr-icon-group-fill"
            iconStyle={styles.iconCommunity}
          >
            La plateforme d’échanges Rencontre des Territoires et les Clubs ZLV,
            c’est par ici !
          </ResourceTile>
        </Grid>

        <Grid size={6}>
          <ResourceTile
            title="Besoin d'aide ?"
            linkHref="https://zerologementvacant.crisp.help/fr/"
            icon="fr-icon-question-mark"
            iconStyle={styles.iconHelp}
          >
            Une question sur ZLV ? La réponse est sûrement dans le centre
            d’aide.
          </ResourceTile>
        </Grid>

        <Grid size={6}>
          <ResourceTile
            title="Prendre rendez-vous"
            linkHref="https://zerologementvacant.beta.gouv.fr/prendre-rendez-vous/"
            icon="fr-icon-calendar-fill"
            iconStyle={styles.iconAgenda}
          >
            Besoin d’échanger avec nous ? Prenez rendez-vous en visio !
          </ResourceTile>
        </Grid>
      </Grid>
      <Typography component="h2" variant="h5" sx={{ mt: '4rem', mb: '1.5rem' }}>
        Trois étapes clés pour prendre en main ZLV
      </Typography>
      <Grid container spacing="1.5rem">
        <Grid component="article" size={4}>
          <ResourceTile
            title="Ajouter un filtre géographique"
            linkHref="https://zerologementvacant.crisp.help/fr/article/comment-ajouter-un-perimetre-geographique-9f0gk2/"
            icon="fr-icon-road-map-fill"
            iconStyle={styles.iconStep}
          >
            Découvrez comment cibler les logements au sein d’un périmètre
            géographique.
          </ResourceTile>
        </Grid>

        <Grid component="article" size={4}>
          <ResourceTile
            title="Rédiger un courrier"
            linkHref="https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5"
            icon="fr-icon-mail-fill"
            iconStyle={styles.iconStep}
          >
            Accédez à des conseils pour écrire vos courriers et à des modèles
            déjà rédigés.
          </ResourceTile>
        </Grid>

        <Grid component="article" size={4}>
          <ResourceTile
            title="Comprendre les statuts de suivi"
            linkHref="/ressources/statuts"
            linkHrefTarget="_self"
            icon="fr-icon-git-merge-line"
            iconStyle={styles.iconStep}
          >
            Consultez l’ensemble des statuts que vous pouvez appliquer aux
            logements.
          </ResourceTile>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ResourcesView;
