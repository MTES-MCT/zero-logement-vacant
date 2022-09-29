import React, { useEffect, useRef } from 'react';
import { Container, Title } from '@dataesr/react-dsfr';
import { Link, useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import housingService from '../../services/housing.service';
import AppSearchBar, { SearchResult } from '../../components/AppSearchBar/AppSearchBar';
import { listCampaignBundles } from '../../store/actions/campaignAction';
import CampaignBundleList from '../../components/CampaignBundleList/CampaignBundleList';


const DashboardView = () => {

    const dispatch = useDispatch();
    const history = useHistory();

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

    return (
        <>
            <Container spacing="py-4w mb-4w">
                <Title as="h1" className="fr-py-3w">
                    Bienvenue sur Zéro Logement Vacant
                </Title>
                <AppSearchBar onSearch={search}
                              onKeySearch={quickSearch}
                              placeholder="Rechercher une adresse ou un propriétaire..."
                              size="lg"/>
                <Link title="Accéder à la base de données" to="/base-de-donnees" className="ds-fr--inline fr-link float-right fr-pr-0 fr-py-3w">
                    Accéder à la base de données<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                </Link>
            </Container>
            <div className="bg-100">
                <Container spacing="py-4w mb-4w">
                    <Title as="h2">
                        Campagnes en cours
                    </Title>
                    <CampaignBundleList campaignBundleList={campaignBundleList?.filter(_ => _.campaignNumber) ?? []} />
                    <div className="align-center fr-pt-4w">
                        <Link title="Accéder à la base de données" to="/base-de-donnees?campagne=true" className="fr-btn--md fr-btn">
                            Créer une campagne
                        </Link>
                    </div>
                </Container>
            </div>
        </>
    );
};

export default DashboardView;

