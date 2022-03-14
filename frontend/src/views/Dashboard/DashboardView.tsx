import React, { useRef } from 'react';
import { Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import { Link, useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from '../Campaign/campaign.module.scss';
import housingService from '../../services/housing.service';
import AppSearchBar, { SearchResult } from '../../components/AppSearchBar/AppSearchBar';
import { returnRate } from '../../models/Campaign';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { useCampaignList } from '../../hooks/useCampaignList';


const DashboardView = () => {

    const history = useHistory();
    const campaignList = useCampaignList(true);

    const { loading } = useSelector((state: ApplicationState) => state.campaign);
    const quickSearchAbortRef = useRef<() => void | null>();

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
        history.push('/logements?q='+query);
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
                <Link title="Accéder à la base de données" to="/logements" className="ds-fr--inline fr-link float-right fr-pr-0 fr-py-3w">
                    Accéder à la base de données<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                </Link>
            </Container>
            <div className="bg-100">
                <Container spacing="py-4w mb-4w">
                    <Title as="h2">
                        Campagnes en cours
                    </Title>
                    {!loading && <>
                        {campaignList && !campaignList.length &&
                            <Text>Il n&acute;y a pas de campagne en cours.</Text>
                        }
                        {campaignList?.filter(_ => _.campaignNumber).map(campaign =>
                            <div key={campaign.id} className={styles.campaignCard}>
                                <Row>
                                    <Col>
                                        <Title as="h2" look="h3">{campaign.name}</Title>
                                    </Col>
                                    <Col n="2">
                                        <Link title="Accéder à la campagne" to={'/campagnes/' + campaign.id} className="fr-btn--md fr-btn float-right">
                                            Accéder
                                        </Link>
                                    </Col>
                                </Row>
                                <hr />
                                <Row alignItems="middle">
                                    <Col spacing="my-3w">
                                        <div className={styles.campaignStat}>
                                            <div className={styles.statTitle}>{campaign.ownerCount}</div>
                                            <span className={styles.statLabel}>{campaign.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}</span>
                                        </div>
                                        <div className={styles.campaignStat}>
                                            <div className={styles.statTitle}>{campaign.housingCount}</div>
                                            <span className={styles.statLabel}>{campaign.housingCount <= 1 ? 'logement' : 'logements'}</span>
                                        </div>
                                        <div className={styles.campaignStat}>
                                            <div className={styles.statTitle}> {returnRate(campaign)}%</div>
                                            <span className={styles.statLabel}>retours</span>
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <HousingFiltersBadges filters={campaign.filters}/>
                                    </Col>
                                </Row>
                            </div>
                        )}
                    </>}
                    <div className="align-center fr-pt-4w">
                        <Link title="Accéder à la base de données" to="/logements?campagne=true" className="fr-btn--md fr-btn">
                            Créer une campagne
                        </Link>
                    </div>
                </Container>
            </div>
        </>
    );
};

export default DashboardView;

