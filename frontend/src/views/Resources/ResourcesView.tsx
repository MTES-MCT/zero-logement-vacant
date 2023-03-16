import React from 'react';

import {
  Col,
  Container,
  Icon,
  Row,
  Tile,
  TileBody,
  Title,
} from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import classNames from 'classnames';
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

const ResourceTile = ({
  title,
  linkHref,
  linkHrefTarget = '_blank',
  children,
  icon,
  iconStyle,
}: Props) => {
  return (
    <Tile verticalMedium={true} className={styles.tile}>
      <span
        className={classNames(styles.tileIcon, iconStyle, 'card-title-icon')}
      >
        <Icon name={icon} iconPosition="center" size="xl" />
      </span>
      <TileBody
        title={title}
        linkHref={linkHref}
        linkTarget={linkHrefTarget}
        className={styles.tileBody}
      >
        {children}
      </TileBody>
    </Tile>
  );
};

const ResourcesView = () => {
  useDocumentTitle('Centre de ressources');

  return (
    <>
      <div className="bg-100">
        <Container as="section" spacing="py-4w">
          <AppBreadcrumb />
          <Row>
            <Col n="8">
              <Title as="h1">Centre de ressources</Title>
            </Col>
          </Row>
        </Container>
      </div>
      <Container as="section" spacing="py-4w">
        <Row gutters>
          <Col n="6">
            <ResourceTile
              title="Ressources"
              linkHref="https://zlv.notion.site/Ressources-fe11627749a34b10820a6e663f607226"
              icon="ri-folder-5-fill"
              iconStyle={styles.iconResource}
            >
              Zéro Logement Vacant vous propose une sélection de ressources pour
              comprendre les données LOVAC, connaître le profil des
              propriétaires et échanger avec eux, mais aussi s’informer sur les
              dispositifs d’aides ou encore proposer des missions de service
              civique.
            </ResourceTile>
          </Col>
          <Col n="6">
            <ResourceTile
              title="Communauté"
              linkHref="https://zlv.notion.site/Communaut-e2af2cd2f7124d47b0d522f93c18e48f"
              icon="ri-group-fill"
              iconStyle={styles.iconCommunity}
            >
              Utiliser Zéro Logement Vacant, c’est aussi faire partie d’une
              communauté de collectivités utilisatrices de la solution... Pour
              échanger sur la plateforme Rencontre des Territoires et participer
              aux points inter-collectivités, c’est par ici !
            </ResourceTile>
          </Col>
          <Col n="6">
            <ResourceTile
              title="Besoin d'aide ?"
              linkHref="https://zerologementvacant.crisp.help/fr/"
              icon="ri-question-mark"
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
              icon="ri-calendar-fill"
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
      <Container as="section" spacing="py-4w">
        <Title as="h2" look="h5">
          Trois étapes clés pour prendre en main ZLV
        </Title>
        <Row gutters>
          <Col n="4">
            <ResourceTile
              title="Déposer vos périmètres"
              linkHref="https://zlv.notion.site/Int-grer-un-p-rim-tre-5c7cf0d51f20448bb1316405adbb4a37"
              icon="ri-map-fill"
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
              icon="ri-mail-fill"
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
              title="Comprendre les statuts"
              linkHref="/ressources/statuts"
              linkHrefTarget="_self"
              icon="ri-node-tree"
            >
              Statut “Premier contact” ou “Suivi en cours” ? “Sortie de la
              vacance’ ou “Non-vacant” ? Il peut être compliqué de s’y retrouver
              dans les statuts des dossiers sur ZLV… Découvrez ici l’ensemble
              des statuts, sous-statuts et précisions que vous pouvez appliquer
              aux dossiers.
            </ResourceTile>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default ResourcesView;
