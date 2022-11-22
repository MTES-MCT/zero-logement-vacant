import React, { useEffect, useRef } from 'react';
import {
  Callout,
  CalloutText,
  CalloutTitle,
  Container,
  Link,
  Text,
  Title
} from '@dataesr/react-dsfr';
import { useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import housingService from '../../services/housing.service';
import AppSearchBar, {
    SearchResult
} from '../../components/AppSearchBar/AppSearchBar';
import { listCampaignBundles } from '../../store/actions/campaignAction';
import CampaignBundleList
    from '../../components/CampaignBundleList/CampaignBundleList';
import {
    TrackEventActions,
    TrackEventCategories
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';

import styles from './dashboard-view.module.scss'


const DashboardView = () => {

    const dispatch = useDispatch();
    const history = useHistory();
    const { trackEvent } = useMatomo();

    const { campaignBundleList } = useSelector((state: ApplicationState) => state.campaign);
    const quickSearchAbortRef = useRef<() => void | null>();

    useEffect(() => {
        dispatch(listCampaignBundles())
    }, [dispatch]);

    const quickSearch = (query: string) => {
        if (quickSearchAbortRef.current) {
            quickSearchAbortRef.current()
        }
        const quickSearchService = housingService.quickSearchService()
        quickSearchAbortRef.current = quickSearchService.abort;

        if (query.length) {
            trackEvent({
                category: TrackEventCategories.Dashboard,
                action: TrackEventActions.Dashboard.QuickSearch
            })
            return quickSearchService.fetch(query)
                .then(_ => _.entities.map(
                    housing => ({
                        title: `${housing.rawAddress.join(' - ')} (${housing.owner.fullName} - ${housing.owner.rawAddress.join(' - ')})`,
                        redirectUrl: '/accueil/proprietaires/' + housing.owner.id
                    } as SearchResult)
                ))
                .catch(err => console.log('error', err))
        } else {
            return Promise.resolve([])
        }
    }

    const search = (query: string) => {
        history.push('/base-de-donnees?q='+query);
    }

    const hasCampaign = (): boolean => !!campaignBundleList?.length

    function NoCampaign() {
        return (
          <>
              <Title as="h2">Vous n’avez pas de campagne en cours.</Title>
              <Callout hasInfoIcon={false}>
                <CalloutTitle as="h3" size="xxl">
                  Qu’est ce qu’une campagne ?
                </CalloutTitle>
                <CalloutText as="p">
                  On appelle "campagne" un envoi de courriers postaux auprès
                  d’un public cible de propriétaires de logements vacants.
                  Pour lancer une campagne, il suffit : (1) de <strong>créer un échantillon </strong>
                  de logements à mobiliser en filtrant la base de données, (2) d’<strong>exporter le fichier </strong>
                  adapté à vos outils de publipostages, (3) de <strong>suivre ensuite les retours</strong> des propriétaires.
                </CalloutText>
                <Link title="Accéder à la base de données" href="/base-de-donnees?campagne=true" className="fr-btn--md fr-btn">
                  Créer votre première campagne
                </Link>
              </Callout>
          </>
        )
    }
    
    return (
        <>
            <div className="bg-100 fr-pt-8w fr-pb-12w">
                <Container>
                    <Title as="h1">
                        Bienvenue sur Zéro Logement Vacant
                    </Title>
                    <Text size="lead" spacing="pb-3w" className={styles.subtitle}>
                      Zéro logement Vacant vous aide à mobiliser les
                      propriétaires de logements vacants de longue<br /> durée de
                      votre territoire et à suivre l’avancée de leur dossier
                      jusqu’à la sortie de vacance.
                    </Text>
                    <AppSearchBar onSearch={search}
                                  onKeySearch={quickSearch}
                                  placeholder="Rechercher une adresse ou un propriétaire..."
                                  size="lg"/>
                    <Link
                      title="Accéder à la base de données"
                      href="/base-de-donnees"
                      display="flex"
                      icon="ri-arrow-right-line"
                      iconSize="1x"
                      className="fr-link float-right fr-my-2w"
                    >
                        Accéder à la base de données
                    </Link>
                </Container>
            </div>
            <Container spacing="py-4w">
                {hasCampaign() && <NoCampaign />}
                {!hasCampaign() &&
                  <>
                      <Title as="h2">
                          Campagnes en cours
                      </Title>
                      <CampaignBundleList />
                      <div className="align-center fr-pt-4w">
                          <Link title="Accéder à la base de données" href="/base-de-donnees?campagne=true" className="fr-btn--md fr-btn">
                              Créer une campagne
                          </Link>
                      </div>
                  </>
                }
            </Container>
        </>
    );
};

export default DashboardView;

