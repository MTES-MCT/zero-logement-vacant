import React from 'react';
import { Text } from '../_dsfr';
import { CampaignBundle, returnRate } from '../../models/Campaign';
import AppCard from '../_app/AppCard/AppCard';
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
          <AppCard icon="fr-icon-feedback-fill" grey={isArchived}>
            <Text as="span">
              <b>{returnRate(bundle)}%</b> de retour
            </Text>
          </AppCard>
          <AppCard icon="fr-icon-hand-coin-fill" grey={isArchived}>
            <Text as="span">
              <b>{bundle.inProgressWithSupportCount}</b> en accompagnement
            </Text>
          </AppCard>
        </>
      )}
    </>
  );
};

export default CampaignBundleStats;
