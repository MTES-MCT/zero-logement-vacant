import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './resources.module.scss';
import MainContainer from '../../components/MainContainer/MainContainer';
import Tile from '@codegouvfr/react-dsfr/Tile';
import classNames from 'classnames';
import { Col, Container, Icon, Row, Text } from '../../components/_dsfr';
import Typography from '@mui/material/Typography';

interface Props {
  title: string;
  linkHref: string;
  linkHrefTarget?: string;
  children: string;
  icon: string;
  iconStyle?: string;
}

const ResourceTile = ({
  title,
  linkHref,
  linkHrefTarget = '_blank',
  children,
  icon,
  iconStyle
}: Props) => {
  return (
    <Tile
      desc={children}
      classes={{ root: 'fr-p-3w', body: styles.tileBody }}
      title={
        <>
          <div>
            <span className={classNames(iconStyle, 'card-title-icon')}>
              <Icon name={icon} iconPosition="center" size="xl" />
            </span>
          </div>
          {title}
        </>
      }
      linkProps={{
        to: linkHref,
        target: linkHrefTarget
      }}
    />
  );
};

const ResourcesView = () => {
  useDocumentTitle('Ressources');

  return (
    <MainContainer title="Ressources">
      <Container as="article" spacing="pb-4w px-0">
        <Row gutters>
          <Col n="6">
            <ResourceTile
              title="Documentation"
              linkHref="https://zlv.notion.site/Ressources-fe11627749a34b10820a6e663f607226"
              icon="fr-icon-folder-2-fill"
              iconStyle={styles.iconResource}
            >
              Découvrez une sélection de ressources autour de la lutte contre la vacance.
            </ResourceTile>
          </Col>
          <Col n="6">
            <ResourceTile
              title="Communauté"
              linkHref="https://zlv.notion.site/Communaut-e2af2cd2f7124d47b0d522f93c18e48f"
              icon="fr-icon-group-fill"
              iconStyle={styles.iconCommunity}
            >
              La plateforme d’échanges Rencontre des Territoires et les Clubs ZLV, c’est par ici !
            </ResourceTile>
          </Col>
          <Col n="6">
            <ResourceTile
              title="Besoin d'aide ?"
              linkHref="https://zerologementvacant.crisp.help/fr/"
              icon="fr-icon-question-mark"
              iconStyle={styles.iconHelp}
            >
              Une question sur ZLV ? La réponse est sûrement dans le centre d’aide.
            </ResourceTile>
          </Col>
          <Col n="6">
            <ResourceTile
              title="Prendre rendez-vous"
              linkHref="https://zlv.notion.site/Prendre-rendez-vous-31933eaa1e7d4c26b1c8be6811ab9893"
              icon="fr-icon-calendar-fill"
              iconStyle={styles.iconAgenda}
            >
              Besoin d’échanger avec nous ? Prenez rendez-vous en visio !
            </ResourceTile>
          </Col>
        </Row>
      </Container>
      <Container as="article" spacing="py-4w px-0">
        <Typography component="h2" variant="h5" mb={3}>
          Trois étapes clés pour prendre en main ZLV
        </Typography>
        <Row gutters>
          <Col n="4">
            <ResourceTile
              title="Ajouter un filtre géographique"
              linkHref="https://zlv.notion.site/Int-grer-un-p-rim-tre-5c7cf0d51f20448bb1316405adbb4a37"
              icon="fr-icon-road-map-fill"
            >
              Découvrez comment cibler les logements au sein d’un périmètre géographique.
            </ResourceTile>
          </Col>
          <Col n="4">
            <ResourceTile
              title="Rédiger un courrier"
              linkHref="https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5"
              icon="fr-icon-mail-fill"
            >
              Accédez à des conseils pour écrire vos courriers et à des modèles déjà rédigés.
            </ResourceTile>
          </Col>
          <Col n="4">
            <ResourceTile
              title="Comprendre les statuts de suivi"
              linkHref="/ressources/statuts"
              linkHrefTarget="_self"
              icon="fr-icon-git-merge-line"
            >
              Consultez l’ensemble des statuts que vous pouvez appliquer aux logements.
            </ResourceTile>
          </Col>
        </Row>
      </Container>
    </MainContainer>
  );
};

export default ResourcesView;
