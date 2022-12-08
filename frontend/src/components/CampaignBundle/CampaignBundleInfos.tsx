import React from 'react';
import { Text } from '@dataesr/react-dsfr';
import { CampaignBundle } from '../../models/Campaign';
import AppCard from '../AppCard/AppCard';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import { dateShortFormat } from '../../utils/dateUtils';

interface Props {
    campaignBundle: CampaignBundle,
    isGrey?: boolean
}

const CampaignBundleInfos = ({ campaignBundle, isGrey }: Props) => {

    const { bundle, mainCampaign } = useCampaignBundle(campaignBundle)

    return(
        <>
            {bundle &&
                <>
                    <AppCard icon="ri-home-fill" isGrey={isGrey}>
                        <Text as="span">
                            <b>{bundle.housingCount}</b> {bundle.housingCount <= 1 ? 'logement' : 'logements'}
                        </Text>
                    </AppCard>
                    <AppCard icon="ri-user-fill" isGrey={isGrey}>
                        <Text as="span">
                            <b>{bundle.ownerCount}</b> {bundle.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}
                        </Text>
                    </AppCard>
                    {(bundle.campaignNumber ?? 0) > 0 && mainCampaign?.sendingDate &&
                        <AppCard icon="ri-send-plane-fill" isGrey={isGrey}>
                            <Text as="span">
                                envoyée
                                le <b>{dateShortFormat(mainCampaign?.sendingDate!)}</b>
                            </Text>
                        </AppCard>
                    }
                </>
            }
        </>
    )
}

export default CampaignBundleInfos;
