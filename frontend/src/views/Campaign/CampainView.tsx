import React, { useEffect, useState } from 'react';
import { Badge, Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import {
    CampaignBundle,
    campaignPartialName,
    campaignStep,
    CampaignSteps,
    getCampaignKindLabel,
    returnRate,
} from '../../models/Campaign';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useParams } from 'react-router-dom';
import CampaignInProgress from './CampainInProgress';
import CampaignToValidate from './CampainToValidate';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import { useCampaignList } from '../../hooks/useCampaignList';
import styles from './campaign.module.scss';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';


const CampaignView = () => {

    const dispatch = useDispatch();
    const campaignList = useCampaignList(true);
    const { campaignNumber, reminderNumber } = useParams<{campaignNumber: string, reminderNumber: string}>();

    const { campaignBundle } = useSelector((state: ApplicationState) => state.campaign);

    const [searchQuery, setSearchQuery] = useState<string>();

    useEffect(() => {
        dispatch(getCampaignBundle({
            campaignNumber: campaignNumber ? Number(campaignNumber) : undefined,
            reminderNumber: reminderNumber ? Number(reminderNumber) : undefined
        }, searchQuery))
    }, [dispatch, campaignNumber, reminderNumber, searchQuery])


    const campaignsOfBundle = (campaignBundle: CampaignBundle) => {
        return campaignList?.filter(_ => campaignBundle.campaignIds.indexOf(_.id) !== -1) ?? []
    }

    return (
        <>
            {campaignBundle &&
                <>
                    <div className="bg-100">
                        <Container className="bg-100">
                            <AppBreadcrumb />
                            <Badge small
                                   text={campaignBundle.campaignNumber ? `Campagne - ${getCampaignKindLabel(campaignBundle.kind)}` : 'Hors campagne'}
                                   className="fr-mb-1w"
                            />
                            <Row>
                                <Col>
                                    <Title as="h1" className="fr-mb-1w">
                                        {campaignPartialName(campaignBundle.startMonth, campaignBundle.campaignNumber, campaignBundle.reminderNumber, campaignBundle.kind)}
                                        <br />
                                        {campaignBundle.title}
                                    </Title>
                                </Col>
                                <Col n="4" spacing="mt-1w">
                                    <AppSearchBar onSearch={(input: string) => {setSearchQuery(input)}} />
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
                                    {campaignStep(campaignsOfBundle(campaignBundle)[0]) >= CampaignSteps.InProgress &&
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
                            {searchQuery &&
                                <Row className="fr-pb-2w">
                                    <Col>
                                        <FilterBadges options={[{value: searchQuery, label: searchQuery}]}
                                                      filters={[searchQuery]}
                                                      onChange={() => setSearchQuery('')}/>
                                    </Col>
                                </Row>
                            }
                        </Container>
                    </div>
                    <Container spacing="py-4w">
                        {(campaignBundle.campaignNumber ?? 0) > 0 && campaignStep(campaignsOfBundle(campaignBundle)[0]) < CampaignSteps.InProgress ?
                            <CampaignToValidate campaignStep={campaignStep(campaignsOfBundle(campaignBundle)[0])}/> :
                            <CampaignInProgress query={searchQuery}/>
                        }
                    </Container>
                </>
            }
        </>
    );
};

export default CampaignView;

