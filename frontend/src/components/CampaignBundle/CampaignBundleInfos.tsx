import React from 'react';
import { Text } from '../_dsfr/index';
import { CampaignBundle } from '../../models/Campaign';
import AppCard from '../_app/AppCard/AppCard';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import { dateShortFormat } from '../../utils/dateUtils';

interface Props {
  campaignBundle: CampaignBundle;
  isGrey?: boolean;
}

const CampaignBundleInfos = ({ campaignBundle, isGrey }: Props) => {
  const { bundle, mainCampaign } = useCampaignBundle(campaignBundle);

  return (
    <>
      {bundle && (
        <>
          <AppCard icon="fr-icon-home-4-fill" grey={isGrey}>
            <Text as="span">
              <b>{bundle.housingCount}</b>{' '}
              {bundle.housingCount <= 1 ? 'logement' : 'logements'}
            </Text>
          </AppCard>
          <AppCard icon="fr-icon-user-fill" grey={isGrey}>
            <Text as="span">
              <b>{bundle.ownerCount}</b>{' '}
              {bundle.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}
            </Text>
          </AppCard>
          {(bundle.campaignNumber ?? 0) > 0 && mainCampaign?.sendingDate && (
            <AppCard icon="fr-icon-send-plane-fill" grey={isGrey}>
              <Text as="span">
                envoyée le <b>{dateShortFormat(mainCampaign?.sendingDate!)}</b>
              </Text>
            </AppCard>
          )}
        </>
      )}
    </>
  );
};

export default CampaignBundleInfos;
