import React from 'react';
import { Col, Container, Icon, Row, Text } from '../../components/_dsfr';
import { campaignStep, CampaignSteps, isCampaignDeletable } from '../../models/Campaign';
import CampaignInProgress from './CampaignInProgress';
import CampaignToValidate from './CampaignToValidate';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { TrackEventActions, TrackEventCategories } from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import CampaignTitle from '../../components/Campaign/CampaignTitle';
import { hasFilters } from '../../models/HousingFilters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { useRemoveCampaignMutation } from '../../services/campaign.service';
import { useHistory } from 'react-router-dom';
import AppLink from '../../components/_app/AppLink/AppLink';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import { useGetGroupQuery } from '../../services/group.service';
import { useCampaign } from '../../hooks/useCampaign';

const CampaignView = () => {
  useDocumentTitle('Campagne');
  const router = useHistory();

  const { trackEvent } = useMatomo();

  const [removeCampaign] = useRemoveCampaignMutation();

  const { campaign } = useCampaign();
  const { data: group } = useGetGroupQuery(campaign?.groupId!, {
    skip: !campaign?.groupId,
  });

  if (!campaign) {
    return <></>;
  }

  const remove = async () => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.Delete,
    });
    await removeCampaign(campaign.id);

    router.push('/campagnes');
  };

  return (
    <MainContainer>
      {campaignStep(campaign) < CampaignSteps.InProgress && (
        <>
          <Row>
            <Col>
              <CampaignTitle campaign={campaign} look="h3" />
            </Col>
            {isCampaignDeletable(campaign) && (
              <Col className="align-right">
                <ConfirmationModal
                  modalId={`delete-${campaign.id}`}
                  onSubmit={remove}
                  openingButtonProps={{
                    iconId: 'fr-icon-delete-bin-fill',
                    priority: 'tertiary no outline',
                    children: 'Supprimer la campagne',
                    size: 'small',
                  }}
                >
                  <Text>
                    Êtes-vous sûr de vouloir supprimer cette campagne ?
                  </Text>
                  <Alert
                    description='Les statuts des logements "En attente de retour" repasseront en "Non suivi". Les autres statuts mis à jour ne seront pas modifiés.'
                    severity="info"
                    small
                  />
                </ConfirmationModal>
              </Col>
            )}
          </Row>
          <div className="fr-mb-2w">
            <CampaignCounts campaignId={campaign.id} />
          </div>
          {group && (
            <Row spacing="my-2w">
              <Col className="d-flex">
                <Text
                  as="span"
                  className="weight-500"
                  size="sm"
                  spacing="mb-0 mr-2w"
                >
                  Créée à partir du groupe
                </Text>
                {!!group.archivedAt ? (
                  <>
                    <Icon name="ri-hotel-fill" iconPosition="left" size="1x" />
                    <Text as="span" spacing="mb-0">
                      {group.title}
                    </Text>
                  </>
                ) : (
                  <AppLink
                    to={`/groupes/${group.id}`}
                    iconId="ri-hotel-fill"
                    iconPosition="left"
                    isSimple
                  >
                    {group.title}
                  </AppLink>
                )}
              </Col>
            </Row>
          )}
          {campaign.filters &&
            hasFilters(campaign.filters) &&
            !campaign.filters.groupIds?.length && (
              <Row spacing="mb-3w">
                <Col>
                  <Text size="sm" className="fr-mb-1w">
                    Filtres utilisés pour la création de l'échantillon :
                  </Text>
                  <HousingFiltersBadges filters={campaign.filters} />
                </Col>
              </Row>
            )}
        </>
      )}
      <Container spacing="pb-4w px-0" as="article">
        {campaignStep(campaign) < CampaignSteps.InProgress ? (
          <CampaignToValidate campaignStep={campaignStep(campaign)} />
        ) : (
          <CampaignInProgress />
        )}
      </Container>
    </MainContainer>
  );
};

export default CampaignView;
