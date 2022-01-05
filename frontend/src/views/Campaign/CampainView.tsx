import React, { useEffect } from 'react';
import { Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { getCampaign } from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { campaignStep, CampaignSteps } from '../../models/Campaign';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useParams } from 'react-router-dom';
import styles from './campaign.module.scss';
import CampaignInProgress from './CampainInProgress';
import CampaignToValidate from './CampainToValidate';


const CampaignView = () => {

    const dispatch = useDispatch();
    const { id } = useParams<{id: string}>();

    const { campaign } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(getCampaign(id))
    }, [id, dispatch])

    return (
        <>
            {campaign &&
                <>
                    <div className="bg-100">
                        <Container className="bg-100">
                            <AppBreadcrumb additionalItems={[{ url: '', label: campaign.name }]}/>
                            <Row>
                                <Col>
                                    <Title as="h1">{campaign.name}</Title>
                                </Col>
                                <Col>
                                    {/*<AppSearchBar onSearch={(input: string) => {}} />*/}
                                </Col>
                            </Row>
                            <Row>
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
                                        <div className={styles.statTitle}> {Math.round(100 - campaign.waitingCount / campaign.housingCount * 100)}%</div>
                                        <span className={styles.statLabel}>retours</span>
                                    </div>
                                </Col>
                            </Row>
                        </Container>
                    </div>
                    <Container spacing="py-4w">
                        {campaignStep(campaign) < CampaignSteps.InProgess ? <CampaignToValidate /> : <CampaignInProgress />}
                    </Container>
                </>
            }
        </>
    );
};

export default CampaignView;

