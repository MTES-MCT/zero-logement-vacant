import React from 'react';
import { Text } from '@dataesr/react-dsfr';
import { CampaignBundle, returnRate } from '../../models/Campaign';
import AppCard from '../AppCard/AppCard';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';

interface Props {
    campaignBundle: CampaignBundle,
    isArchived?: boolean
}

const CampaignBundleStats = ({ campaignBundle, isArchived }: Props) => {

    const { bundle } = useCampaignBundle(campaignBundle)

    return(
        <>
            {bundle && (bundle.campaignNumber ?? 0) > 0 &&
                <>
                    <AppCard icon="ri-feedback-fill" isGrey={isArchived}>
                        <Text as="span">
                            <b>{returnRate(bundle)}%</b> de retour
                        </Text>
                    </AppCard>
                    <AppCard icon="ri-phone-fill" isGrey={isArchived}>
                        <Text as="span">
                            <b>{bundle.neverContactedCount}</b> à recontacter
                        </Text>
                    </AppCard>
                    <AppCard icon="ri-hand-coin-fill" isGrey={isArchived}>
                        <Text as="span">
                            <b>{bundle.inProgressWithSupportCount}</b> en accompagnement
                        </Text>
                    </AppCard>
                </>
            }
        </>
    )
}

export default CampaignBundleStats;
