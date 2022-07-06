import React from 'react';
import { Alert, Badge, Col, Row, Text, Title } from '@dataesr/react-dsfr';
import styles from '../../views/Campaign/campaign.module.scss';
import { Link } from 'react-router-dom';
import {
    CampaignBundle, CampaignBundleId,
    campaignBundleIdUrlFragment,
    campaignStep,
    CampaignSteps,
    getCampaignKindLabel,
    returnRate,
} from '../../models/Campaign';
import AppActionsMenu, { MenuAction } from '../../components/AppActionsMenu/AppActionsMenu';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { useCampaignList } from '../../hooks/useCampaignList';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';


const CampaignBundleList = (
    {
        campaignBundleList,
        menuActions
    }: {
        campaignBundleList: CampaignBundle[],
        menuActions?: (campaignBundleId: CampaignBundleId) => MenuAction[]
    }) => {

    const campaignList = useCampaignList(true);
    const { loading } = useSelector((state: ApplicationState) => state.campaign);

    const campaignsOfBundle = (campaignBundle: CampaignBundle) => {
        return campaignList?.filter(_ => campaignBundle.campaignIds.indexOf(_.id) !== -1) ?? []
    }

    if (loading) {
        return <></>
    }

    return (
        <>
            {campaignBundleList && !campaignBundleList.length &&
                <Text>Il n&acute;y a pas de campagne en cours.</Text>
            }
            {campaignBundleList && campaignBundleList.map(campaignBundle =>
                <div key={`CampaignBundle_${campaignBundle.campaignIds.join('-')}`} className={styles.campaignCard}>
                    <Badge small
                           text={campaignBundle.campaignNumber ? `Campagne - ${getCampaignKindLabel(campaignBundle.kind)}` : 'Hors campagne'}
                           className="fr-mb-1w"
                    />
                    <Row alignItems="middle">
                        <Col>
                            <Title as="h2" look="h3">{campaignBundle.name}</Title>
                        </Col>
                        <Col n="1">
                            {(campaignBundle.campaignNumber ?? 0) > 0 && menuActions?.length &&
                                <AppActionsMenu actions={menuActions(campaignBundle)}/>
                            }
                        </Col>
                        <Col n="1" spacing="ml-2w" className="align-right">
                            <Link title="Accéder à la campagne" to={'/campagnes/C' + campaignBundle.campaignNumber} className="fr-btn--md fr-btn">
                                Accéder
                            </Link>
                        </Col>
                    </Row>
                    <hr />
                    <Row>
                        <Col>
                            <HousingFiltersBadges filters={campaignBundle.filters}/>
                        </Col>
                    </Row>
                    <Row alignItems="middle">
                        <Col spacing="my-3w">
                            <div className={styles.campaignStat}>
                                <div className={styles.statTitle}>{campaignBundle.ownerCount}</div>
                                <span className={styles.statLabel}>{campaignBundle.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}</span>
                            </div>
                            <div className={styles.campaignStat}>
                                <div className={styles.statTitle}>{campaignBundle.housingCount}</div>
                                <span className={styles.statLabel}>{campaignBundle.housingCount <= 1 ? 'logement' : 'logements'}</span>
                            </div>
                            {(campaignBundle.campaignNumber ?? 0) > 0 && campaignStep(campaignsOfBundle(campaignBundle)[0]) >= CampaignSteps.InProgress &&
                                <div className={styles.campaignStat}>
                                    <div className={styles.statTitle}> {returnRate(campaignBundle)}%</div>
                                    <span className={styles.statLabel}>retours</span>
                                </div>
                            }
                        </Col>
                        <Col n="7">
                            {campaignsOfBundle(campaignBundle).length === 1 && campaignStep(campaignsOfBundle(campaignBundle)[0]) === CampaignSteps.Export &&
                                <Alert title="Export des adresses des propriétaires"
                                       description="L’export du fichier de publipostage est disponible et est indispensable avant de passer au suivi. Vous pouvez toujours modifier la liste des propriétaires si vous le souhaitez."
                                       type="error"/>
                            }
                        </Col>
                    </Row>
                    {campaignsOfBundle(campaignBundle).length > 1 && campaignsOfBundle(campaignBundle).map((campaign, campaignIndex) =>
                        <div key={`Campaign_${campaign.id}`}>
                            <hr className="fr-pb-1w fr-mt-1w"/>
                            <Row>
                                <Col n="3">
                                    {campaign.reminderNumber ? `Relance n°${campaign.reminderNumber}` : getCampaignKindLabel(campaign.kind)} ({format(campaign.createdAt, 'dd/MM/yy', { locale: fr })})
                                </Col>
                                <Col>
                                    {campaignStep(campaign) === CampaignSteps.OwnersValidation &&
                                        <Alert title="Liste des propriétaires à valider"
                                               description="Avant d&apos;accéder au mode publipostage, vous devez vérifier et valider la liste de propriétaires sélectionnés."
                                               type="error"/>
                                    }
                                    {campaignStep(campaign) === CampaignSteps.Export &&
                                        <Alert title="Export des adresses des propriétaires"
                                               description="L’export du fichier de publipostage est disponible et est indispensable avant de passer au suivi. Vous pouvez toujours modifier la liste des propriétaires si vous le souhaitez."
                                               type="error"/>
                                    }
                                </Col>
                                {campaignIndex === campaignsOfBundle(campaignBundle).length - 1 && menuActions?.length &&
                                    <div className="fr-pr-2w">
                                        <AppActionsMenu actions={menuActions(campaign as CampaignBundleId)}/>
                                    </div>
                                }
                                <Col n="1" className="align-right">
                                    <Link title="Accéder à la campagne" to={'/campagnes/' + campaignBundleIdUrlFragment({campaignNumber: campaign.campaignNumber, reminderNumber: campaign.reminderNumber})} className="ds-fr--inline fr-link">
                                        Accéder<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                                    </Link>
                                </Col>
                            </Row>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default CampaignBundleList;
