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
        <Text size="lg">
          Parcourez les différentes rubriques pour trouver les informations et
          documents utiles dans votre stratégie de lutte contre la vacance.
          Retrouvez également en bas de cette page les trois étapes clés pour
          prendre en main ZLV !
        </Text>
        <Row gutters>
          <Col n="6">
            <ResourceTile
              title="Documentation"
              linkHref="https://zlv.notion.site/Ressources-fe11627749a34b10820a6e663f607226"
              icon="fr-icon-folder-2-fill"
              iconStyle={styles.iconResource}
            >
              Zéro Logement Vacant vous propose une sélection de ressources pour
              comprendre les données LOVAC, connaître le profil des
              propriétaires et échanger avec eux, mais aussi s’informer sur les
              dispositifs d’aides ou proposer des missions de service civique.
            </ResourceTile>
          </Col>
          <Col n="6">
            <ResourceTile
              title="Communauté"
              linkHref="https://zlv.notion.site/Communaut-e2af2cd2f7124d47b0d522f93c18e48f"
              icon="fr-icon-group-fill"
              iconStyle={styles.iconCommunity}
            >
              Utiliser Zéro Logement Vacant, c’est aussi faire partie d’une
              communauté de collectivités utilisatrices de la solution... Pour
              échanger sur la plateforme Rencontre des Territoires et participer
              au club des collectivités utilisatrices de ZLV, c’est par ici !
            </ResourceTile>
          </Col>
          <Col n="6">
            <ResourceTile
              title="Besoin d'aide ?"
              linkHref="https://zerologementvacant.crisp.help/fr/"
              icon="fr-icon-question-mark"
              iconStyle={styles.iconHelp}
            >
              Vous avez une question sur la solution ZLV ou sur les données
              utilisées ? Vous ne savez pas comment créer une campagne ou mettre
              à jour des dossiers ? Vous trouverez dans ce centre d’aide toutes
              les réponses à vos questions les plus fréquentes !
            </ResourceTile>
          </Col>
          <Col n="6">
            <ResourceTile
              title="Prendre rendez-vous"
              linkHref="https://zlv.notion.site/Prendre-rendez-vous-31933eaa1e7d4c26b1c8be6811ab9893"
              icon="fr-icon-calendar-fill"
              iconStyle={styles.iconAgenda}
            >
              Vous souhaitez être accompagné dans la création d’une campagne ou
              la mise à jour des dossiers ? Vous souhaitez échanger avec nous
              autour de votre stratégie de lutte contre la vacance ou nous faire
              un retour d’expérience ? Prenez rendez-vous avec nous !
            </ResourceTile>
          </Col>
        </Row>
      </Container>
      <Container as="article" spacing="py-4w px-0">
        <Typography component="h2" variant="h5">
          Trois étapes clés pour prendre en main ZLV
        </Typography>
        <Row gutters>
          <Col n="4">
            <ResourceTile
              title="Ajouter un filtre géographique"
              linkHref="https://zlv.notion.site/Int-grer-un-p-rim-tre-5c7cf0d51f20448bb1316405adbb4a37"
              icon="fr-icon-road-map-fill"
            >
              Vous souhaitez cibler les logements sur un périmètre en
              particulier, comme un dispositif opérationnel ou un quartier ?
              Nous vous expliquons ici comment intégrer vos périmètres dans la
              solution !
            </ResourceTile>
          </Col>
          <Col n="4">
            <ResourceTile
              title="Rédiger un courrier"
              linkHref="https://zlv.notion.site/R-diger-un-courrier-15e88e19d2bc404eaf371ddcb4ca42c5"
              icon="fr-icon-mail-fill"
            >
              Vous voulez rédiger un courrier mais ne savez pas par où commencer
              ? Vous souhaitez mobiliser les propriétaires et cherchez les
              arguments à mettre en avant dans le courrier ? Vous avez besoin
              d’un modèle adapté à un contexte particulier ? Laissez-vous guider
              !
            </ResourceTile>
          </Col>
          <Col n="4">
            <ResourceTile
              title="Comprendre les statuts de suivi"
              linkHref="/ressources/statuts"
              linkHrefTarget="_self"
              icon="fr-icon-git-merge-line"
            >
              Statut “Premier contact” ou “Suivi en cours” ? Il peut être
              compliqué de s’y retrouver dans les statuts des dossiers sur ZLV…
              Découvrez ici l’ensemble des statuts et sous-statuts que vous
              pouvez appliquer aux dossiers.
            </ResourceTile>
          </Col>
        </Row>
      </Container>
    </MainContainer>
  );
};

export default ResourcesView;
