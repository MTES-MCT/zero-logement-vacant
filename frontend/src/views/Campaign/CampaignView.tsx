import React from 'react';
import { Col, Container, Icon, Row, Text } from '../../components/_dsfr';
import { campaignStep, CampaignSteps } from '../../models/Campaign';
import CampaignInProgress from './CampaignInProgress';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { hasFilters } from '../../models/HousingFilters';
import MainContainer from '../../components/MainContainer/MainContainer';
import { Redirect, useHistory } from 'react-router-dom';
import AppLink from '../../components/_app/AppLink/AppLink';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import { useGetGroupQuery } from '../../services/group.service';
import { useCampaign } from '../../hooks/useCampaign';
import CampaignDraftView from './CampaignDraftView';
import { CampaignStatus } from '../../../../shared';
import CampaignTitle from '../../components/Campaign/CampaignTitle';

function CampaignView() {
  const router = useHistory();

  const { trackEvent } = useMatomo();

  const { campaign } = useCampaign();
  const { data: group } = useGetGroupQuery(campaign?.groupId!, {
    skip: !campaign?.groupId,
  });

  if (!campaign) {
    return <Loading />;
  }

  const steps: Record<CampaignStatus, JSX.Element> = {
    draft: <CampaignDraftView />,
    validating: <CampaignDraftView />,
    sending: <CampaignDraftView />,
    'in-progress': <CampaignInProgress />,
    archived: <Redirect to="/404" />,
  };
  const CampaignComponent = steps[campaign.status] || <CampaignInProgress />;

  return (
    <MainContainer>
      {campaignStep(campaign) < CampaignSteps.InProgress && (
        <>
          <CampaignTitle campaign={campaign} className="fr-mb-2w" />
          <CampaignCounts
            campaignId={campaign.id}
            className="fr-mb-2w"
            display="row"
          />
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
        </>
      )}
      {CampaignComponent}
    </MainContainer>
  );
}

function Loading() {
  return <></>;
}

export default CampaignView;
