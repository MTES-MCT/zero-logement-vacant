import React, { useRef } from 'react';
import {
  Callout,
  CalloutText,
  CalloutTitle,
  Col,
  Container,
  Link,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { useHistory } from 'react-router-dom';
import housingService from '../../services/housing.service';
import AppSearchBar, {
  SearchResult,
} from '../../components/AppSearchBar/AppSearchBar';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';

import styles from './dashboard-view.module.scss';
import classNames from 'classnames';
import { useCampaignBundleList } from '../../hooks/useCampaignBundleList';
import { CampaignNotSentSteps, CampaignSteps } from '../../models/Campaign';
import { pluralize } from '../../utils/stringUtils';
import InternalLink from '../../components/InternalLink/InternalLink';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const DashboardView = () => {
  useDocumentTitle('Accueil');
  const history = useHistory();
  const { trackEvent } = useMatomo();

  const { campaignBundlesCount } = useCampaignBundleList();
  const quickSearchAbortRef = useRef<() => void | null>();

  const quickSearch = (query: string) => {
    if (quickSearchAbortRef.current) {
      quickSearchAbortRef.current();
    }
    const quickSearchService = housingService.quickSearchService();
    quickSearchAbortRef.current = quickSearchService.abort;

    if (query.length) {
      trackEvent({
        category: TrackEventCategories.Dashboard,
        action: TrackEventActions.Dashboard.QuickSearch,
      });
      return quickSearchService
        .fetch(query)
        .then((_) =>
          _.entities.map(
            (housing) =>
              ({
                title: `${housing.rawAddress.join(' - ')} (${
                  housing.owner.fullName
                } - ${housing.owner.rawAddress.join(' - ')})`,
                redirectUrl: '/accueil/proprietaires/' + housing.owner.id,
              } as SearchResult)
          )
        )
        .catch((err) => console.log('error', err));
    } else {
      return Promise.resolve([]);
    }
  };

  const search = (query: string) => {
    history.push('/base-de-donnees?q=' + query);
  };

  const activeCampaignsCount = () =>
    campaignBundlesCount(CampaignNotSentSteps) +
    campaignBundlesCount([CampaignSteps.InProgress]);

  const CampaignCallout = ({ hasCampaign }: { hasCampaign: boolean }) => {
    return (
      <Callout hasInfoIcon={false}>
        <CalloutTitle as="h3" className="fr-h4 fr-mb-1w">
          {hasCampaign
            ? 'Vous souhaitez créer une nouvelle campagne ?'
            : 'Qu’est ce qu’une campagne ?'}
        </CalloutTitle>
        <CalloutText as="p">
          {!hasCampaign && (
            <div>
              On appelle "campagne" un envoi de courriers postaux auprès d’un
              public cible de propriétaires de logements vacants.
            </div>
          )}
          Pour lancer une campagne, il suffit : (1) de{' '}
          <strong>créer un échantillon </strong>
          de logements à mobiliser en filtrant la base de données, (2) d’
          <strong>exporter le fichier </strong>
          adapté à vos outils de publipostages, (3) de{' '}
          <strong>suivre ensuite les retours</strong> des propriétaires.
        </CalloutText>
        <InternalLink
          title="Accéder à la base de données"
          to="/base-de-donnees?campagne=true"
          className={classNames(
            { 'fr-btn--secondary': hasCampaign },
            'fr-btn--md',
            'fr-btn'
          )}
        >
          {hasCampaign
            ? 'Créer votre nouvelle campagne'
            : 'Créer votre première campagne'}
        </InternalLink>
      </Callout>
    );
  };

  return (
    <>
      <div className="bg-100 fr-pt-8w fr-pb-12w">
        <Container as="section">
          <Title as="h1">Bienvenue sur Zéro Logement Vacant</Title>
          <Text size="lead" spacing="pb-3w" className={styles.subtitle}>
            Zéro logement Vacant vous aide à mobiliser les propriétaires de
            logements vacants de longue
            <br /> durée de votre territoire et à suivre l’avancée de leur
            dossier jusqu’à la sortie de vacance.
          </Text>
          <AppSearchBar
            onSearch={search}
            onKeySearch={quickSearch}
            placeholder="Rechercher une adresse ou un propriétaire..."
            size="lg"
          />
          <InternalLink
            title="Accéder à la base de données"
            to="/base-de-donnees"
            display="flex"
            icon="ri-arrow-right-line"
            iconSize="1x"
            className="fr-link float-right fr-my-2w"
          >
            Accéder à la base de données
          </InternalLink>
        </Container>
      </div>
      <Container as="section" spacing="py-4w">
        {activeCampaignsCount() === 0 ? (
          <>
            <Title as="h2">Vous n’avez pas de campagne en cours.</Title>
            <CampaignCallout hasCampaign={false} />
          </>
        ) : (
          <Row gutters={true}>
            <Col>
              <Callout hasInfoIcon={false}>
                <CalloutTitle as="h3" className="fr-h4 fr-mb-1w">
                  Vous avez {activeCampaignsCount()} campagnes en cours.
                </CalloutTitle>
                <CalloutText as="div">
                  Depuis l’onglet “logements suivis”, gérez vos différentes
                  campagnes.
                  <ul>
                    <li>
                      {campaignBundlesCount(CampaignNotSentSteps)} 
                      {pluralize(campaignBundlesCount(CampaignNotSentSteps))(
                        'campagne'
                      )}
                       <b>en attente d'envoi</b>
                    </li>
                    <li>
                      {campaignBundlesCount([CampaignSteps.InProgress])} 
                      {pluralize(
                        campaignBundlesCount([CampaignSteps.InProgress])
                      )('campagne')}
                       <b>en suivi en cours</b>
                    </li>
                  </ul>
                  <Link
                    title="Voir mes campagnes en cours"
                    href="/base-de-donnees"
                    className="fr-btn--md fr-btn"
                  >
                    Voir mes campagnes en cours
                  </Link>
                </CalloutText>
              </Callout>
            </Col>
            <Col>
              <CampaignCallout hasCampaign={true} />
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
};

export default DashboardView;
