import React from 'react';

import { Col, Icon, Row, Text } from '../../components/_dsfr';
import { campaignStep, CampaignSteps } from '../../models/Campaign';
import CampaignInProgress from './CampaignInProgress';
import CampaignTitle from '../../components/Campaign/CampaignTitle';
import MainContainer from '../../components/MainContainer/MainContainer';
import AppLink from '../../components/_app/AppLink/AppLink';
import { useGetGroupQuery } from '../../services/group.service';
import { useCampaign } from '../../hooks/useCampaign';
import CampaignDraft from './CampaignDraft';
import { CampaignStatus } from '../../../../shared';
import NotFoundView from '../NotFoundView';
import CampaignCounts from '../../components/Campaign/CampaignCounts';

function CampaignView() {
  const { campaign, count, isLoadingCampaign } = useCampaign();
  const { data: group } = useGetGroupQuery(campaign?.groupId!, {
    skip: !campaign?.groupId,
  });

  if (isLoadingCampaign) {
    return <Loading />;
  }

  if (!campaign) {
    return <NotFoundView />;
  }

  const steps: Record<CampaignStatus, JSX.Element> = {
    draft: <CampaignDraft campaign={campaign} />,
    sending: <NotFoundView />,
    'in-progress': <CampaignInProgress />,
    archived: <NotFoundView />,
  };
  const CampaignComponent = steps[campaign.status] || <NotFoundView />;

  return (
    <MainContainer>
      {campaignStep(campaign) < CampaignSteps.InProgress && (
        <>
          <CampaignTitle campaign={campaign} className="fr-mb-2w" as="h2" />
          <CampaignCounts
            display="row"
            housing={count?.housing}
            owners={count?.owners}
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
