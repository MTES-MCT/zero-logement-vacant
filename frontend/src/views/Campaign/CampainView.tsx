import React, { useEffect, useState } from 'react';
import { Button, Col, Container, Row, Tab, Tabs, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import {
    changeCampaignHousingPagination,
    listCampaignHousing,
    validCampaignStep,
} from '../../store/actions/campaignAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { Campaign, campaignStep, CampaignSteps } from '../../models/Campaign';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useParams } from 'react-router-dom';
import styles from './campaign.module.scss';
import classNames from 'classnames';
import HousingList, { HousingDisplayKey } from '../../components/HousingList/HousingList';


const CampaignView = () => {

    const dispatch = useDispatch();
    const { id } = useParams<{id: string}>();

    const [campaign, setCampaign] = useState<Campaign>();

    const { campaignList, paginatedHousing, exportURL } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(listCampaignHousing(id))
    }, [id, dispatch])

    useEffect(() => {
        setCampaign(campaignList.find(c => c.id === id))
    }, [campaignList])

    const validStep = (step: CampaignSteps) => {
        if (campaign) {
            dispatch(validCampaignStep(campaign.id, step))
        }
    }

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
                                    <span className={styles.statLabel}>propriétaires</span>
                                </div>
                                <div className={styles.campaignStat}>
                                    <div className={styles.statTitle}>{campaign.housingCount}</div>
                                    <span className={styles.statLabel}>logement</span>
                                </div>
                                <div className={styles.campaignStat}>
                                    <div className={styles.statTitle}> -</div>
                                    <span className={styles.statLabel}>retours</span>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </div>


                    {paginatedHousing.entities.length &&
                    <Container spacing="py-4w">

                        {campaignStep(campaign) < CampaignSteps.InProgess &&
                        <>
                            <div className={classNames(styles.campaignStep,
                                campaignStep(campaign) === CampaignSteps.OwnersValidation ? styles.currentStep :
                                    campaignStep(campaign) > CampaignSteps.OwnersValidation ? styles.oldStep : '')}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>1</div>
                                    </div>
                                    <div>
                                        <h2>Validation de la liste des propriétaires</h2>
                                        <span className={styles.currentOnly}>Validez la liste des propriétaires et logements à inclure dans votre campagne</span>
                                    </div>
                                    <Button
                                        onClick={() => validStep(CampaignSteps.OwnersValidation)}
                                        title="Valider"
                                        className={styles.currentOnly}>
                                        Valider
                                    </Button>
                                </div>
                                <div className={classNames('fr-pt-4w', styles.currentOnly)}>
                                    <HousingList paginatedHousing={paginatedHousing}
                                                 onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage))}
                                                 displayKind={HousingDisplayKey.Owner}/>
                                </div>
                            </div>

                            <div className={classNames(styles.campaignStep,
                                campaignStep(campaign) === CampaignSteps.Export ? styles.currentStep :
                                    campaignStep(campaign) > CampaignSteps.Export ? styles.oldStep : '')}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>2</div>
                                    </div>
                                    <div>
                                        <h2>Export des données propriétaires</h2>
                                        <span>Ajustez les variables et exportez vos données pour créer votre fichier de publipostage, envoi par email ou rencontre.</span>
                                    </div>
                                    {campaignStep(campaign) !== CampaignSteps.Export &&
                                    <Button
                                        disabled
                                        title="En attente">
                                        En attente
                                    </Button>
                                    }
                                    {campaignStep(campaign) === CampaignSteps.Export &&
                                    <a href={exportURL}
                                       onClick={() => validStep(CampaignSteps.Export)}
                                       className="fr-btn--md fr-btn"
                                       download>
                                        Exporter
                                    </a>
                                    }
                                </div>
                            </div>

                            <div className={classNames(styles.campaignStep,
                                campaignStep(campaign) === CampaignSteps.Sending ? styles.currentStep :
                                    campaignStep(campaign) > CampaignSteps.Sending ? styles.oldStep : '')}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>3</div>
                                    </div>
                                    <div>
                                        <h2>Envoi de la campagne</h2>
                                        <span>Datez l’envoi qui marque le début de votre campagne.</span>
                                    </div>
                                    {campaignStep(campaign) !== CampaignSteps.Sending &&
                                    <Button
                                        disabled
                                        title="En attente">
                                        En attente
                                    </Button>
                                    }
                                    {campaignStep(campaign) === CampaignSteps.Sending &&
                                    <Button
                                    onClick={() => validStep(CampaignSteps.Sending)}
                                    title="Valider">
                                    Confirmer
                                    </Button>
                                    }
                                </div>
                            </div>

                            <div className={styles.campaignStep}>
                                <div className={styles.stepLabel}>
                                    <div>
                                        <div className={styles.stepNumber}>4</div>
                                    </div>
                                    <div>
                                        <h2>Suivi de la campagne</h2>
                                        <span>Complétez et suivez toutes les interactions avec les propriétaires.</span>
                                    </div>
                                    <Button
                                        disabled
                                        title="En attente">
                                        En attente
                                    </Button>
                                </div>
                            </div>
                        </>
                        }

                        {campaignStep(campaign) === CampaignSteps.InProgess &&
                        <Tabs>
                            <Tab label={`En attente de retour (${paginatedHousing.entities.length})`}>
                                <div className="fr-pt-4w">
                                    <HousingList paginatedHousing={paginatedHousing}
                                                 onChangePagination={(page, perPage) => dispatch(changeCampaignHousingPagination(page, perPage))}
                                                 displayKind={HousingDisplayKey.Owner}/>
                                </div>
                            </Tab>
                            <Tab label="Suivi en cours (0)">
                                TODO
                            </Tab>
                            <Tab label="Sans suite (0)">
                                TODO
                            </Tab>
                            <Tab label="Non vacant (0)">
                                TODO
                            </Tab>
                            <Tab label="Sortie de procédure (0)">
                                TODO
                            </Tab>
                        </Tabs>
                        }
                    </Container>
                    }
                </>
            }
        </>
    );
};

export default CampaignView;

