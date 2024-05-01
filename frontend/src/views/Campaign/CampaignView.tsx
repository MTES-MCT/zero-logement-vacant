import React from 'react';

import { Col, Icon, Row, Text } from '../../components/_dsfr';
import { isBuilding } from '../../models/Campaign';
import CampaignInProgress from './CampaignInProgress';
import MainContainer from '../../components/MainContainer/MainContainer';
import AppLink from '../../components/_app/AppLink/AppLink';
import { useGetGroupQuery } from '../../services/group.service';
import { useCampaign } from '../../hooks/useCampaign';
import CampaignDraft from './CampaignDraft';
import CampaignSending from './CampaignSending';
import { CampaignStatus } from '../../../../shared';
import NotFoundView from '../NotFoundView';

function CampaignView() {
  const { campaign, isLoadingCampaign } = useCampaign();
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
    sending: <CampaignSending campaign={campaign} />,
    'in-progress': <CampaignInProgress campaign={campaign} />,
    archived: <CampaignInProgress campaign={campaign} />,
  };
  const CampaignComponent = steps[campaign.status] || <NotFoundView />;

  return (
    <MainContainer>
      {isBuilding(campaign) && (
        <>
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
