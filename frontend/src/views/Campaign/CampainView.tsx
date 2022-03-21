import React, { useEffect } from 'react';
import { Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { CampaignBundle, campaignName, campaignStep, CampaignSteps, returnRate } from '../../models/Campaign';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useParams } from 'react-router-dom';
import CampaignInProgress from './CampainInProgress';
import CampaignToValidate from './CampainToValidate';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import { useCampaignList } from '../../hooks/useCampaignList';
import styles from './campaign.module.scss';


const CampaignView = () => {

    const dispatch = useDispatch();
    const campaignList = useCampaignList(true);
    const { campaignNumber, reminderNumber } = useParams<{campaignNumber: string, reminderNumber: string}>();

    const { campaignBundle } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(getCampaignBundle({
            campaignNumber: Number(campaignNumber),
            reminderNumber: Number(reminderNumber)
        }))
    }, [dispatch])


    const campaignsOfBundle = (campaignBundle: CampaignBundle) => {
        return campaignList?.filter(_ => campaignBundle.campaignIds.indexOf(_.id) !== -1) ?? []
    }

    return (
        <>
            {campaignBundle &&
                <>
                    <div className="bg-100">
                        <Container className="bg-100">
                            <AppBreadcrumb additionalItems={[{ url: '', label: campaignName(campaignBundle.kind, campaignBundle.startMonth, campaignBundle.campaignNumber, campaignBundle.reminderNumber) }]}/>
                            <Row>
                                <Col>
                                    <Title as="h1">{campaignName(campaignBundle.kind, campaignBundle.startMonth, campaignBundle.campaignNumber, campaignBundle.reminderNumber)}</Title>
                                </Col>
                                <Col>
                                    {/*<AppSearchBar onSearch={(input: string) => {}} />*/}
                                </Col>
                            </Row>
                            <Row>
                                <Col spacing="my-3w">
                                    <div className={styles.campaignStat}>
                                        <div className={styles.statTitle}>{campaignBundle.ownerCount}</div>
                                        <span className={styles.statLabel}>{campaignBundle.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}</span>
                                    </div>
                                    <div className={styles.campaignStat}>
                                        <div className={styles.statTitle}>{campaignBundle.housingCount}</div>
                                        <span className={styles.statLabel}>{campaignBundle.housingCount <= 1 ? 'logement' : 'logements'}</span>
                                    </div>
                                    {campaignBundle.campaignNumber > 0 &&
                                        <div className={styles.campaignStat}>
                                            <div className={styles.statTitle}> {returnRate(campaignBundle)}%</div>
                                            <span className={styles.statLabel}>retours</span>
                                        </div>
                                    }
                                </Col>
                            </Row>
                            <Row className="fr-pb-2w">
                                <Col>
                                    <HousingFiltersBadges filters={campaignBundle.filters}/>
                                </Col>
                            </Row>
                        </Container>
                    </div>
                    <Container spacing="py-4w">
                        {campaignsOfBundle(campaignBundle).length === 1 && campaignStep(campaignsOfBundle(campaignBundle)[0]) < CampaignSteps.InProgess ?
                            <CampaignToValidate campaignStep={campaignStep(campaignsOfBundle(campaignBundle)[0])}/> :
                            <CampaignInProgress />
                        }
                    </Container>
                </>
            }
        </>
    );
};

export default CampaignView;

