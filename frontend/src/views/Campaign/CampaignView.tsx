import React, { useEffect, useState } from 'react';
import { Alert, Col, Container, Row, Text } from '@dataesr/react-dsfr';
import { useDispatch } from 'react-redux';
import { CampaignSteps } from '../../models/Campaign';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useParams } from 'react-router-dom';
import CampaignInProgress from './CampaignInProgress';
import CampaignToValidate from './CampaignToValidate';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { deleteCampaignBundle, getCampaignBundle } from '../../store/actions/campaignAction';
import { useCampaignList } from '../../hooks/useCampaignList';
import ButtonLink from '../../components/ButtonLink/ButtonLink';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import { TrackEventActions, TrackEventCategories } from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import CampaignBundleStats from '../../components/CampaignBundle/CampaignBundleStats';
import CampaignBundleInfos from '../../components/CampaignBundle/CampaignBundleInfos';
import CampaignBundleTitle from '../../components/CampaignBundleTitle/CampaignBundleTitle';
import { hasFilters } from '../../models/HousingFilters';


const CampaignView = () => {

    const dispatch = useDispatch();
    const campaignList = useCampaignList(true);
    const { campaignNumber, reminderNumber } = useParams<{campaignNumber: string, reminderNumber: string}>();
    const { trackEvent } = useMatomo()

    const { bundle, step } = useCampaignBundle()

    useEffect(() => {
        dispatch(getCampaignBundle({
            campaignNumber: campaignNumber ? Number(campaignNumber) : undefined,
            reminderNumber: reminderNumber ? Number(reminderNumber) : undefined
        }))
    }, [dispatch, campaignNumber, reminderNumber])

    const [campaignRemovalModalOpen, setCampaignRemovalModalOpen] = useState(false)
    function removeCampaign(): void {
        if (bundle) {
            trackEvent({
                category: TrackEventCategories.Campaigns,
                action: TrackEventActions.Campaigns.Delete
            })
            dispatch(deleteCampaignBundle(bundle))
        }
        setCampaignRemovalModalOpen(false)
    }

    return (
        <>
            {bundle &&
                <>
                    {campaignRemovalModalOpen &&
                      <ConfirmationModal
                        onSubmit={removeCampaign}
                        onClose={() => setCampaignRemovalModalOpen(false)}
                      >
                          <Text>
                              Êtes-vous sûr de vouloir supprimer
                              cette {bundle.reminderNumber ? 'relance' : 'campagne'} ?
                          </Text>
                          {(!bundle.reminderNumber && bundle.campaignNumber! < (campaignList ?? []).length) &&
                            <Alert
                              description="Les campagnes suivantes seront renumérotées."
                              type="info"
                            />
                          }
                          <Alert
                            description='Les statuts des logements "En attente de retour" repasseront en "Jamais contacté". Les autres statuts mis à jour ne seront pas modifiés.'
                            type="info"
                          />
                      </ConfirmationModal>
                    }
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
                                      onClick={() => setCampaignRemovalModalOpen(true)}
                                    >
                                        Supprimer la campagne
                                    </ButtonLink>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <CampaignBundleTitle campaignBundle={bundle} />
                                </Col>
                            </Row>
                            <Row spacing="my-2w">
                                <Col>
                                    <div>
                                        <CampaignBundleInfos campaignBundle={bundle}/>
                                        {step && step >= CampaignSteps.InProgress &&
                                            <CampaignBundleStats campaignBundle={bundle}/>
                                        }
                                    </div>
                                </Col>
                            </Row>
                            {bundle.filters && hasFilters(bundle.filters) &&
                                <Row>
                                    <Col>
                                        <Text size="sm" className="fr-mb-1w">Filtres utilisés pour la création de
                                            l'échantillon :</Text>
                                        <HousingFiltersBadges filters={bundle.filters}/>
                                    </Col>
                                </Row>
                            }
                            {(bundle.campaignNumber ?? 0) > 0 && step && step >= CampaignSteps.InProgress &&
                                < Alert title="Bienvenue dans l’espace suivi de votre campagne."
                                description="Vous retrouverez ici tous les logements ciblés par cette campagne. Mettez-les à jour logement par logement ou par groupe de logements."
                                className="fr-my-3w"
                                closable/>
                            }
                        </Container>
                    </div>
                    <Container spacing="py-4w" as="section">
                        {(bundle.campaignNumber ?? 0) > 0 && step && step < CampaignSteps.InProgress ?
                            <CampaignToValidate campaignStep={step}/> :
                            <CampaignInProgress />
                        }
                    </Container>
                </>
            }
        </>
    );
};

export default CampaignView;

