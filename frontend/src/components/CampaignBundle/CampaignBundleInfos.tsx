import React from 'react';
import { Text } from '../_dsfr';
import { CampaignBundle } from '../../models/Campaign';
import CampaignInfoCard from './CampaignInfoCard';
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
          <CampaignInfoCard iconId="fr-icon-home-4-fill" grey={isGrey}>
            <Text as="span">
              <b>{bundle.housingCount}</b>{' '}
              {bundle.housingCount <= 1 ? 'logement' : 'logements'}
            </Text>
          </CampaignInfoCard>
          <CampaignInfoCard iconId="fr-icon-user-fill" grey={isGrey}>
            <Text as="span">
              <b>{bundle.ownerCount}</b>{' '}
              {bundle.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}
            </Text>
          </CampaignInfoCard>
          {(bundle.campaignNumber ?? 0) > 0 && mainCampaign?.sendingDate && (
            <CampaignInfoCard iconId="fr-icon-send-plane-fill" grey={isGrey}>
              <Text as="span">
                envoyée le <b>{dateShortFormat(mainCampaign?.sendingDate!)}</b>
              </Text>
            </CampaignInfoCard>
          )}
        </>
      )}
    </>
  );
};

export default CampaignBundleInfos;
