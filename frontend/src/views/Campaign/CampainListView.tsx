import React, { useEffect, useState } from 'react';
import { Alert, Col, Container, Row, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { deleteCampaign, listCampaigns } from '../../store/actions/campaignAction';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './campaign.module.scss';
import { Link } from 'react-router-dom';
import { Campaign, campaignNumberSort, campaignStep, CampaignSteps, returnRate } from '../../models/Campaign';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';


const CampaignsListView = () => {

    const dispatch = useDispatch();

    const { campaignList, loading } = useSelector((state: ApplicationState) => state.campaign);
    const [removingModalCampaign, setRemovingModalCampaign] = useState<Campaign | undefined>();

    useEffect(() => {
        dispatch(listCampaigns());
    }, [dispatch])

    const menuActions = (campaign: Campaign) => [
        { title: 'Supprimer la campagne', onClick: () => setRemovingModalCampaign(campaign)}
    ] as MenuAction[]

    return (
        <>
            <Container>
                <AppBreadcrumb />
                <Title as="h1" className="fr-mb-4w">Campagnes</Title>
                <Tabs>
                    <Tab label="Campagne(s) en cours">
                        {!loading && <>
                            {campaignList && !campaignList.length &&
                                <Text>Il n&acute;y a pas de campagne en cours.</Text>
                            }
                            {campaignList && campaignList.sort(campaignNumberSort).map(campaign =>
                                <div key={campaign.id} className={styles.campaignCard}>
                                    <Row alignItems="middle">
                                        <Col>
                                            <Title as="h2" look="h3">{campaign.name}</Title>
                                        </Col>
                                        <Col n="1">
                                            <AppActionsMenu actions={menuActions(campaign)}/>
                                        </Col>
                                        <Col n="1" spacing="ml-2w">
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
                                        <Col>
                                            {campaignStep(campaign) === CampaignSteps.OwnersValidation &&
                                            <Alert title="Liste des propriétaires à valider"
                                                   description="Avant d&apos;accéder au mode publipostage, vous devez vérifier et valider la liste de propriétaires sélectionnés."
                                                   type="error"/>
                                            }
                                            {campaignStep(campaign) === CampaignSteps.Export &&
                                            <Alert title="Export des adresses des propriétaires"
                                                   description="L’export du fichier de publipostage est disponible et est indispensable avant de passer au suivi. Vous pouvez toujours modifier la liste des propriétaires si vous le souhaitez."
                                                   type="error"/>
                                            }
                                        </Col>
                                    </Row>

                                </div>
                            )}
                        </>}
                    </Tab>
                    <Tab label="Campagnes passées">
                        <>
                             <Text>Il n&acute;y a pas de campagne passée.</Text>
                        </>
                    </Tab>
                </Tabs>
            </Container>
            {removingModalCampaign &&
                <ConfirmationModal
                    onSubmit={() => {
                        dispatch(deleteCampaign(removingModalCampaign.id))
                        setRemovingModalCampaign(undefined);
                    }}
                    onClose={() => setRemovingModalCampaign(undefined)}>
                    <Text size="md">
                        Êtes-vous sûr de vouloir supprimer cette campagne ?
                    </Text>
                    {(removingModalCampaign.campaignNumber < (campaignList ?? []).length) &&
                        <Alert description="Les campagnes suivantes seront renumérotées"
                               type="info"/>
                    }
                </ConfirmationModal>
            }
        </>
    );
};

export default CampaignsListView;
