import React, { useEffect, useState } from 'react';
import { Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import {
    CampaignBundle,
    campaignPartialName,
    campaignStep,
    CampaignSteps,
    returnRate,
} from '../../models/Campaign';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useParams } from 'react-router-dom';
import CampaignInProgress from './CampaignInProgress';
import CampaignToValidate from './CampaignToValidate';
import HousingFiltersBadges
    from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { getCampaignBundle } from '../../store/actions/campaignAction';
import { useCampaignList } from '../../hooks/useCampaignList';
import styles from './campaign.module.scss';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import ButtonLink from "../../components/ButtonLink/ButtonLink";


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

    function removeCampaign(): void {
        // TODO
    }

    function renameCampaign(): void {
        // TODO
    }

    const campaignsOfBundle = (campaignBundle: CampaignBundle) => {
        return campaignList?.filter(_ => campaignBundle.campaignIds.indexOf(_.id) !== -1) ?? []
    }

    return (
        <>
            {campaignBundle &&
                <>
                    <div className="bg-100">
                        <Container spacing="py-4w" as="section">
                            <Row>
                                <Col>
                                    <AppBreadcrumb />
                                </Col>
                                <Col className="align-right">
                                    <ButtonLink
                                      className="fr-pt-3w"
                                      display="flex"
                                      icon="ri-delete-bin-line"
                                      iconPosition="left"
                                      iconSize="1x"
                                      onClick={removeCampaign}
                                    >
                                        Supprimer la campagne
                                    </ButtonLink>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Title as="h1" className="fr-mb-1w ds-fr--inline-block fr-mr-2w">
                                        {campaignPartialName(campaignBundle.campaignNumber, campaignBundle.reminderNumber)}
                                        <br />
                                        {campaignBundle.title}
                                    </Title>
                                    <ButtonLink
                                      display="flex"
                                      icon="ri-edit-2-fill"
                                      iconPosition="left"
                                      iconSize="1x"
                                      isSimple
                                      onClick={renameCampaign}
                                    >
                                        Renommer
                                    </ButtonLink>
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
                                    <Text>Filtres utilisés pour la création de l'échantillon :</Text>
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
                    <Container spacing="py-4w" as="section">
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

