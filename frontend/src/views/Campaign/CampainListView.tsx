import React, { useEffect } from 'react';
import { Alert, Col, Container, Row, Tab, Tabs, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { listCampaigns } from '../../store/actions/campaignAction';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './campaign.module.scss';
import { Link } from 'react-router-dom';
import { campaignNumberSort, campaignStep, CampaignSteps } from '../../models/Campaign';


const CampaignsListView = () => {

    const dispatch = useDispatch();

    const { campaignList } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(listCampaigns());
    }, [dispatch])

    return (
        <>
            <Container>
                <AppBreadcrumb />
                <Title as="h1" className="fr-mb-4w">Campagnes</Title>
                <Tabs>
                    <Tab label="Campagne(s) en cours">
                        {campaignList.sort(campaignNumberSort).map(campaign =>
                            <div key={campaign.id} className={styles.campaignCard}>
                                <Title as="h2" look="h3">{campaign.name}</Title>
                                <Row alignItems="middle">
                                    <Col spacing="my-3w">
                                        <div className={styles.campaignStat}>
                                            <div className={styles.statTitle}> - </div>
                                            <span className={styles.statLabel}>propriétaires</span>
                                        </div>
                                        <div className={styles.campaignStat}>
                                            <div className={styles.statTitle}>{campaign.housingCount}</div>
                                            <span className={styles.statLabel}>logement</span>
                                        </div>
                                        <div className={styles.campaignStat}>
                                            <div className={styles.statTitle}> - </div>
                                            <span className={styles.statLabel}>retours</span>
                                        </div>
                                    </Col>
                                    <Col spacing="pr-4w">
                                        {campaignStep(campaign) === CampaignSteps.OwnersValidation &&
                                        <Alert title="Liste des propriétaires à valider"
                                               description="Avant d&apos;accéder au mode publipostage, vous devez vérifier et valider la liste de propriétaires sélectionnés."
                                               type="error"/>
                                        }
                                    </Col>
                                    <Col n="1">
                                        <Link title="Accéder à la campagne" to={'/campagnes/' + campaign.id} className="fr-btn--md fr-btn">
                                            Accéder
                                        </Link>
                                    </Col>
                                </Row>

                            </div>
                        )}
                    </Tab>
                    <Tab label="Campagnes passées">
                        TODO
                    </Tab>
                </Tabs>
            </Container>
        </>
    );
};

export default CampaignsListView;

