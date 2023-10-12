import React from 'react';
import { Text } from '../_dsfr';
import { CampaignBundle, returnRate } from '../../models/Campaign';
import CampaignInfoCard from './CampaignInfoCard';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';

interface Props {
  campaignBundle: CampaignBundle;
  isArchived?: boolean;
}

const CampaignBundleStats = ({ campaignBundle, isArchived }: Props) => {
  const { bundle } = useCampaignBundle(campaignBundle);

  return (
    <>
      {bundle && (bundle.campaignNumber ?? 0) > 0 && (
        <>
          <CampaignInfoCard iconId="fr-icon-feedback-fill" grey={isArchived}>
            <Text as="span">
              <b>{returnRate(bundle)}%</b> de retour
            </Text>
          </CampaignInfoCard>
          <CampaignInfoCard iconId="fr-icon-team-fill" grey={isArchived}>
            <Text as="span">
              <b>{bundle.inProgressWithSupportCount}</b> en accompagnement
            </Text>
          </CampaignInfoCard>
        </>
      )}
    </>
  );
};

export default CampaignBundleStats;
