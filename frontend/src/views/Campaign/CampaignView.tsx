import React, { useEffect, useState } from 'react';
import { Alert, Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch } from 'react-redux';
import { campaignFullName, CampaignSteps, } from '../../models/Campaign';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { useParams } from 'react-router-dom';
import CampaignInProgress from './CampaignInProgress';
import CampaignToValidate from './CampaignToValidate';
import HousingFiltersBadges
    from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import {
    deleteCampaignBundle,
    getCampaignBundle
} from '../../store/actions/campaignAction';
import { useCampaignList } from '../../hooks/useCampaignList';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import ButtonLink from "../../components/ButtonLink/ButtonLink";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Help from "../../components/Help/Help";
import AppCard from "../../components/AppCard/AppCard";
import { useCampaignBundle } from "../../hooks/useCampaignBundle";
import {
    TrackEventActions,
    TrackEventCategories
} from "../../models/TrackEvent";
import { useMatomo } from "@datapunt/matomo-tracker-react";
import ConfirmationModal
    from "../../components/modals/ConfirmationModal/ConfirmationModal";


const CampaignView = () => {

    const dispatch = useDispatch();
    const campaignList = useCampaignList(true);
    const { campaignNumber, reminderNumber } = useParams<{campaignNumber: string, reminderNumber: string}>();
    const { trackEvent } = useMatomo()

    const { bundle, mainCampaign, step } = useCampaignBundle()

    const [searchQuery, setSearchQuery] = useState<string>();

    useEffect(() => {
        dispatch(getCampaignBundle({
            campaignNumber: campaignNumber ? Number(campaignNumber) : undefined,
            reminderNumber: reminderNumber ? Number(reminderNumber) : undefined
        }, searchQuery))
    }, [dispatch, campaignNumber, reminderNumber, searchQuery])

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

    function renameCampaign(): void {
        // TODO
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
                                    <Title as="h1" className="fr-mb-1w ds-fr--inline-block fr-mr-2w">
                                        {campaignFullName(bundle)}
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
                                    {(bundle.campaignNumber ?? 0) > 0 && bundle.createdAt &&
                                      <Text size="sm" className="subtitle">
                                          échantillon créé
                                          le <b>{format(bundle.createdAt, 'dd/MM/yy', {locale: fr})}</b>
                                      </Text>
                                    }
                                    {(bundle.campaignNumber ?? 0) === 0 &&
                                      <div className="fr-py-2w">
                                          <Help>
                                              Les logements hors campagne sont les logements qui sont <b>en cours de suivi mais qui ne sont pas compris dans une campagne.</b>
                                          </Help>
                                      </div>
                                    }
                                </Col>
                            </Row>
                            <Row spacing="my-2w">
                                <Col>
                                    <div>
                                        <AppCard icon="ri-home-fill">
                                            <Text as="span">
                                                <b>{bundle.housingCount}</b> {bundle.housingCount <= 1 ? 'logement' : 'logements'}
                                            </Text>
                                        </AppCard>
                                        <AppCard icon="ri-user-fill">
                                            <Text as="span">
                                                <b>{bundle.ownerCount}</b> {bundle.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}
                                            </Text>
                                        </AppCard>
                                        {mainCampaign?.sendingDate &&
                                          <AppCard icon="ri-send-plane-fill">
                                              <Text as="span">
                                                  envoyée
                                                  le <b>{format(mainCampaign?.sendingDate, 'dd/MM/yy', {locale: fr})}</b>
                                              </Text>
                                          </AppCard>
                                        }
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Text size="sm" className="fr-mb-1w">Filtres utilisés pour la création de l'échantillon :</Text>
                                    <HousingFiltersBadges filters={bundle.filters}/>
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
                        {(bundle.campaignNumber ?? 0) > 0 && step && step < CampaignSteps.InProgress ?
                            <CampaignToValidate campaignStep={step}/> :
                            <CampaignInProgress query={searchQuery}/>
                        }
                    </Container>
                </>
            }
        </>
    );
};

export default CampaignView;

